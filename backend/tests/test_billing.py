"""Pruebas automatizadas para el Motor de Suscripciones y Planes SaaS (Billing)."""

from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Subscription, User


def test_get_billing_plans_half_price_monday(client: TestClient) -> None:
    """Verifica que el catálogo de planes retorne los 4 tiers con precios a mitad de Monday.com."""
    res = client.get("/api/billing/plans")
    assert res.status_code == 200
    plans = res.json()
    assert len(plans) == 4

    plans_by_tier = {p["tier"]: p for p in plans}
    assert "basic" in plans_by_tier
    assert "standard" in plans_by_tier
    assert "pro" in plans_by_tier
    assert "enterprise" in plans_by_tier

    # 1. Básico ($4.50 / $45)
    basic = plans_by_tier["basic"]
    assert basic["name"] == "Básico"
    assert basic["monthly_price"] == 4.5
    assert basic["yearly_price"] == 45.0
    assert len(basic["features"]) >= 3
    assert basic["is_popular"] is False

    # 2. Estándar ($6.00 / $60)
    standard = plans_by_tier["standard"]
    assert standard["name"] == "Estándar"
    assert standard["monthly_price"] == 6.0
    assert standard["yearly_price"] == 60.0
    assert standard["is_popular"] is False

    # 3. Pro ($9.50 / $95 - Más popular)
    pro = plans_by_tier["pro"]
    assert pro["name"] == "Pro"
    assert pro["monthly_price"] == 9.5
    assert pro["yearly_price"] == 95.0
    assert pro["is_popular"] is True

    # 4. Enterprise (A medida)
    enterprise = plans_by_tier["enterprise"]
    assert enterprise["name"] == "Enterprise"
    assert enterprise["monthly_price"] is None
    assert enterprise["yearly_price"] is None


def test_user_initial_subscription_free_trial(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    """Verifica que un usuario autenticado reciba su suscripción inicial con Free Trial de 14 días."""
    res = client.get("/api/billing/subscription", headers=auth_headers)
    assert res.status_code == 200
    sub = res.json()

    assert sub["plan_tier"] == "free_trial"
    assert sub["status"] == "trialing"
    assert sub["is_trial_active"] is True
    assert sub["days_left_in_trial"] in (13, 14)
    assert sub["billing_cycle"] == "monthly"
    assert sub["seats"] == 1
    assert sub["trial_ends_at"] is not None


def test_checkout_simulated_mode_upgrades_to_pro(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    """Verifica que en BILLING_DEV_MODE el checkout actualice la suscripción directamente a 'pro' activo."""
    # 1. Ejecutar checkout simulado al plan Pro
    res_checkout = client.post(
        "/api/billing/checkout",
        headers=auth_headers,
        json={"plan_tier": "pro", "billing_cycle": "monthly"},
    )
    assert res_checkout.status_code == 200
    data = res_checkout.json()
    assert data["success"] is True
    assert data["mode"] == "simulated"
    assert data["checkout_url"] is None

    # 2. Consultar suscripción y verificar actualización
    res_sub = client.get("/api/billing/subscription", headers=auth_headers)
    assert res_sub.status_code == 200
    sub = res_sub.json()
    assert sub["plan_tier"] == "pro"
    assert sub["status"] == "active"
    assert sub["billing_cycle"] == "monthly"
    assert sub["current_period_end"] is not None


def test_checkout_validation_and_yearly_cycle(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    """Verifica validación de planes permitidos y soporte del ciclo anual."""
    # 1. Rechazar plan inválido
    bad_plan = client.post(
        "/api/billing/checkout",
        headers=auth_headers,
        json={"plan_tier": "ultra_vip", "billing_cycle": "monthly"},
    )
    assert bad_plan.status_code == 422

    # 2. Rechazar ciclo inválido
    bad_cycle = client.post(
        "/api/billing/checkout",
        headers=auth_headers,
        json={"plan_tier": "standard", "billing_cycle": "biweekly"},
    )
    assert bad_cycle.status_code == 422

    # 3. Upgrade válido a ciclo anual
    ok_yearly = client.post(
        "/api/billing/checkout",
        headers=auth_headers,
        json={"plan_tier": "standard", "billing_cycle": "yearly"},
    )
    assert ok_yearly.status_code == 200
    sub = client.get("/api/billing/subscription", headers=auth_headers).json()
    assert sub["plan_tier"] == "standard"
    assert sub["billing_cycle"] == "yearly"
    assert sub["status"] == "active"


def test_billing_webhook_lifecycle(client: TestClient, db_session: Session) -> None:
    """Verifica el procesamiento de eventos de webhook de Stripe (checkout completed y subscription deleted)."""
    # 1. Obtener un usuario de prueba (Ana)
    ana = db_session.query(User).filter(User.email == "ana@gestor.dev").first()
    assert ana is not None

    # 2. Enviar evento checkout.session.completed vía webhook público
    event_payload = {
        "id": "evt_test_123",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "client_reference_id": str(ana.id),
                "customer_email": ana.email,
                "customer": "cus_test_stripe_999",
                "subscription": "sub_test_stripe_888",
                "metadata": {
                    "plan_tier": "pro",
                    "billing_cycle": "monthly",
                    "user_id": str(ana.id),
                },
            }
        },
    }
    res_webhook = client.post("/api/billing/webhook", json=event_payload)
    assert res_webhook.status_code == 200
    assert res_webhook.json()["received"] is True

    # Verificar actualización en base de datos
    sub = db_session.query(Subscription).filter(Subscription.user_id == ana.id).first()
    assert sub is not None
    assert sub.status == "active"
    assert sub.plan_tier == "pro"
    assert sub.stripe_customer_id == "cus_test_stripe_999"
    assert sub.stripe_subscription_id == "sub_test_stripe_888"

    # 3. Enviar evento customer.subscription.deleted
    cancel_payload = {
        "id": "evt_test_456",
        "type": "customer.subscription.deleted",
        "data": {
            "object": {
                "id": "sub_test_stripe_888",
                "status": "canceled",
            }
        },
    }
    res_cancel = client.post("/api/billing/webhook", json=cancel_payload)
    assert res_cancel.status_code == 200

    db_session.refresh(sub)
    assert sub.status == "canceled"


def test_billing_endpoints_require_authentication(client: TestClient) -> None:
    """Verifica que los endpoints protegidos devuelvan 401 si no hay token de autenticación."""
    assert client.get("/api/billing/subscription").status_code == 401
    assert client.post("/api/billing/checkout", json={"plan_tier": "pro"}).status_code == 401
