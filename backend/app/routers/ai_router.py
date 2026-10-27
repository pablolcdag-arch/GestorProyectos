"""Router REST para el Asistente de IA ('Sidekick' estilo Monday.com)."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Subscription, User
from app.schemas import (
    AICreditsResponse,
    AIPromptRequest,
    AIPromptResponse,
)
from app.services.ai_service import execute_ai_action

router = APIRouter(prefix="/api/ai", tags=["AI Assistant"])


@router.post("/ask", response_model=AIPromptResponse)
def ask_ai_assistant(
    payload: AIPromptRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AIPromptResponse:
    """Procesa una consulta o acción con el Asistente de IA (generar tareas, desglosar checklist o resumir)."""
    return execute_ai_action(db=db, user=current_user, payload=payload)


@router.get("/credits", response_model=AICreditsResponse)
def get_ai_credits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AICreditsResponse:
    """Devuelve la disponibilidad y balance de créditos de IA según el plan de suscripción actual."""
    sub = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
    plan_tier = sub.plan_tier if sub else "free_trial"

    if plan_tier in ("pro", "free_trial", "enterprise"):
        return AICreditsResponse(
            credits_total=None,
            credits_used=0,
            is_unlimited=True,
            plan_tier=plan_tier,
        )
    elif plan_tier == "standard":
        return AICreditsResponse(
            credits_total=2000,
            credits_used=0,
            is_unlimited=False,
            plan_tier=plan_tier,
        )
    elif plan_tier == "basic":
        return AICreditsResponse(
            credits_total=500,
            credits_used=0,
            is_unlimited=False,
            plan_tier=plan_tier,
        )

    return AICreditsResponse(
        credits_total=500,
        credits_used=0,
        is_unlimited=False,
        plan_tier=plan_tier,
    )
