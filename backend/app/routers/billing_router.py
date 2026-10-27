"""Router REST para Monetización, Planes SaaS y Suscripciones (Stripe & Modo Dev)."""

from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models import Subscription, User
from app.schemas import (
    OFFICIAL_PRICING_PLANS,
    CheckoutSessionCreate,
    CheckoutSessionResponse,
    PricingPlanRead,
    SubscriptionRead,
)

router = APIRouter(prefix="/api/billing", tags=["Billing & Subscriptions"])


def _calculate_trial_metrics(sub: Subscription) -> tuple[int, bool]:
    """Calcula los días restantes del trial y si el período de prueba continúa activo."""
    now = datetime.now(timezone.utc)
    days_left = 0
    is_trial_active = False

    if sub.trial_ends_at:
        trial_end = (
            sub.trial_ends_at
            if sub.trial_ends_at.tzinfo
            else sub.trial_ends_at.replace(tzinfo=timezone.utc)
        )
        delta = trial_end - now
        total_seconds = delta.total_seconds()
        if total_seconds > 0:
            days_left = max(0, math.ceil(total_seconds / 86400))
            if sub.status == "trialing":
                is_trial_active = True

    return days_left, is_trial_active


def _to_subscription_read(sub: Subscription) -> SubscriptionRead:
    """Convierte el modelo Subscription en el esquema SubscriptionRead con métricas calculadas."""
    days_left, is_trial_active = _calculate_trial_metrics(sub)
    return SubscriptionRead(
        id=sub.id,
        user_id=sub.user_id,
        plan_tier=sub.plan_tier,
        status=sub.status,
        stripe_customer_id=sub.stripe_customer_id,
        stripe_subscription_id=sub.stripe_subscription_id,
        billing_cycle=sub.billing_cycle,
        seats=sub.seats,
        trial_ends_at=sub.trial_ends_at,
        current_period_end=sub.current_period_end,
        days_left_in_trial=days_left,
        is_trial_active=is_trial_active,
        created_at=sub.created_at,
        updated_at=sub.updated_at,
    )


@router.get("/plans", response_model=list[PricingPlanRead])
def get_pricing_plans() -> list[PricingPlanRead]:
    """Devuelve la lista oficial de planes comerciales y beneficios a mitad de precio de Monday."""
    return [PricingPlanRead(**plan) for plan in OFFICIAL_PRICING_PLANS]


@router.get("/subscription", response_model=SubscriptionRead)
def get_user_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SubscriptionRead:
    """Devuelve la suscripción del usuario autenticado; si no existe, provisiona el Free Trial de 14 días."""
    sub = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
    if not sub:
        now = datetime.now(timezone.utc)
        sub = Subscription(
            user_id=current_user.id,
            plan_tier="free_trial",
            status="trialing",
            billing_cycle="monthly",
            seats=1,
            trial_ends_at=now + timedelta(days=14),
        )
        db.add(sub)
        db.commit()
        db.refresh(sub)

    return _to_subscription_read(sub)


@router.post("/checkout", response_model=CheckoutSessionResponse)
def create_checkout_session(
    payload: CheckoutSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CheckoutSessionResponse:
    """Inicia el proceso de checkout; en modo dev o sin Stripe activa la suscripción inmediatamente."""
    sub = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
    now = datetime.now(timezone.utc)
    if not sub:
        sub = Subscription(
            user_id=current_user.id,
            plan_tier="free_trial",
            status="trialing",
            billing_cycle="monthly",
            seats=1,
            trial_ends_at=now + timedelta(days=14),
        )
        db.add(sub)
        db.flush()

    # Modo Desarrollo / Simulación local
    if settings.BILLING_DEV_MODE or not settings.STRIPE_SECRET_KEY:
        sub.plan_tier = payload.plan_tier
        sub.billing_cycle = payload.billing_cycle
        sub.status = "active"
        sub.current_period_end = now + (
            timedelta(days=365) if payload.billing_cycle == "yearly" else timedelta(days=30)
        )
        sub.updated_at = now
        db.commit()
        return CheckoutSessionResponse(
            checkout_url=None,
            mode="simulated",
            success=True,
        )

    # Modo Producción con Stripe Checkout
    stripe_key = settings.STRIPE_SECRET_KEY.strip()
    success_url = f"{settings.FRONTEND_REDIRECT_URI.replace('/auth/callback', '')}/settings/billing?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{settings.FRONTEND_REDIRECT_URI.replace('/auth/callback', '')}/settings/billing?canceled=true"

    try:
        with httpx.Client(timeout=15.0) as client:
            form_data: dict[str, Any] = {
                "mode": "subscription",
                "success_url": success_url,
                "cancel_url": cancel_url,
                "client_reference_id": str(current_user.id),
                "customer_email": current_user.email,
                "metadata[plan_tier]": payload.plan_tier,
                "metadata[billing_cycle]": payload.billing_cycle,
                "metadata[user_id]": str(current_user.id),
            }
            res = client.post(
                "https://api.stripe.com/v1/checkout/sessions",
                headers={"Authorization": f"Bearer {stripe_key}"},
                data=form_data,
            )
            if res.status_code not in (200, 201):
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Error en Stripe Checkout: {res.text}",
                )
            session_data = res.json()
            checkout_url = session_data.get("url")
            return CheckoutSessionResponse(
                checkout_url=checkout_url,
                mode="stripe",
                success=True,
            )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error de conexión con Stripe: {exc}",
        ) from exc


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Recibe webhooks de Stripe para sincronizar eventos de suscripción."""
    try:
        event = await request.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payload JSON inválido.",
        )

    event_type = event.get("type", "")
    data_obj = event.get("data", {}).get("object", {})

    if event_type == "checkout.session.completed":
        client_ref = data_obj.get("client_reference_id")
        customer_email = data_obj.get("customer_email")
        customer_id = data_obj.get("customer")
        subscription_id = data_obj.get("subscription")
        metadata = data_obj.get("metadata", {})
        plan_tier = metadata.get("plan_tier", "pro")
        billing_cycle = metadata.get("billing_cycle", "monthly")

        user: Optional[User] = None
        if client_ref:
            try:
                user = db.query(User).filter(User.id == int(client_ref)).first()
            except (ValueError, TypeError):
                user = None
        if not user and customer_email:
            user = db.query(User).filter(User.email == customer_email.strip().lower()).first()

        if user:
            sub = db.query(Subscription).filter(Subscription.user_id == user.id).first()
            now = datetime.now(timezone.utc)
            if not sub:
                sub = Subscription(
                    user_id=user.id,
                    plan_tier=plan_tier,
                    status="active",
                    billing_cycle=billing_cycle,
                    stripe_customer_id=customer_id,
                    stripe_subscription_id=subscription_id,
                    seats=1,
                    current_period_end=now + (
                        timedelta(days=365) if billing_cycle == "yearly" else timedelta(days=30)
                    ),
                )
                db.add(sub)
            else:
                sub.plan_tier = plan_tier
                sub.billing_cycle = billing_cycle
                sub.status = "active"
                if customer_id:
                    sub.stripe_customer_id = customer_id
                if subscription_id:
                    sub.stripe_subscription_id = subscription_id
                sub.current_period_end = now + (
                    timedelta(days=365) if billing_cycle == "yearly" else timedelta(days=30)
                )
                sub.updated_at = now
            db.commit()

    elif event_type in ("customer.subscription.updated", "customer.subscription.deleted"):
        subscription_id = data_obj.get("id")
        stripe_status = data_obj.get("status")
        current_period_end_ts = data_obj.get("current_period_end")

        if subscription_id:
            sub = (
                db.query(Subscription)
                .filter(Subscription.stripe_subscription_id == subscription_id)
                .first()
            )
            if sub:
                if event_type == "customer.subscription.deleted" or stripe_status == "canceled":
                    sub.status = "canceled"
                elif stripe_status in ("active", "past_due", "trialing"):
                    sub.status = stripe_status

                if current_period_end_ts:
                    sub.current_period_end = datetime.fromtimestamp(
                        current_period_end_ts, tz=timezone.utc
                    )
                sub.updated_at = datetime.now(timezone.utc)
                db.commit()

    return {"received": True, "event": event_type}
