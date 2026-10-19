"""Router para la gestión y ejecución de Automatizaciones de Tablero (Fase 3)."""

from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Board, BoardAutomation, TaskActivityLog, TaskItem, User
from app.schemas import (
    BoardAutomationCreate,
    BoardAutomationRead,
    BoardAutomationUpdate,
)

router = APIRouter(prefix="/api", tags=["Automations"])


def _get_board_or_404(db: Session, board_id: int) -> Board:
    """Obtiene un tablero por ID o lanza 404 Not Found."""
    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tablero con ID {board_id} no encontrado.",
        )
    return board


def _get_automation_or_404(db: Session, automation_id: int) -> BoardAutomation:
    """Obtiene una regla de automatización por ID o lanza 404 Not Found."""
    rule = db.query(BoardAutomation).filter(BoardAutomation.id == automation_id).first()
    if not rule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Regla de automatización con ID {automation_id} no encontrada.",
        )
    return rule


def run_board_automations(
    db: Session,
    item: TaskItem,
    trigger_event: str,
    current_user_id: int,
) -> None:
    """Ejecuta las recetas de automatización configuradas y activas para un tablero."""
    active_rules = (
        db.query(BoardAutomation)
        .filter(
            BoardAutomation.board_id == item.board_id,
            BoardAutomation.is_active.is_(True),
        )
        .all()
    )
    rule_map = {r.rule_type: r for r in active_rules}

    if trigger_event == "status_changed":
        # Receta 1: when_status_done_complete_checklist
        if item.status_key == "done" and "when_status_done_complete_checklist" in rule_map:
            updated_any = False
            for chk in item.checklist_items:
                if not chk.is_completed:
                    chk.is_completed = True
                    updated_any = True
            if updated_any or item.checklist_items:
                db.add(
                    TaskActivityLog(
                        item_id=item.id,
                        user_id=current_user_id,
                        action="automation_executed",
                        description="Automatización: Marcó todos los ítems de checklist como completados al pasar a Listo.",
                    )
                )

        # Receta 2: when_status_blocked_log_alert
        if (
            item.status_key in ("blocked", "stuck")
            and "when_status_blocked_log_alert" in rule_map
        ):
            db.add(
                TaskActivityLog(
                    item_id=item.id,
                    user_id=current_user_id,
                    action="automation_alert",
                    description="🚨 ALERTA de Automatización: La tarea fue marcada como Bloqueada.",
                )
            )

    elif trigger_event == "checklist_updated":
        # Receta 3: when_checklist_complete_set_status
        if "when_checklist_complete_set_status" in rule_map:
            rule = rule_map["when_checklist_complete_set_status"]
            target_status = rule.target_status_key or "done"
            total_items = len(item.checklist_items)
            completed_items = sum(1 for chk in item.checklist_items if chk.is_completed)

            if total_items > 0 and completed_items == total_items:
                if item.status_key != target_status:
                    item.status_key = target_status
                    db.add(
                        TaskActivityLog(
                            item_id=item.id,
                            user_id=current_user_id,
                            action="automation_executed",
                            description=f"Automatización: Cambió el estado a '{item.status_key}' porque se completó el 100% del checklist.",
                        )
                    )


@router.get(
    "/boards/{board_id}/automations",
    response_model=list[BoardAutomationRead],
)
def get_board_automations(
    board_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[BoardAutomation]:
    """Devuelve las reglas de automatización configuradas en un tablero."""
    board = _get_board_or_404(db, board_id)
    return (
        db.query(BoardAutomation)
        .filter(BoardAutomation.board_id == board.id)
        .order_by(BoardAutomation.id.asc())
        .all()
    )


@router.post(
    "/boards/{board_id}/automations",
    response_model=BoardAutomationRead,
    status_code=status.HTTP_201_CREATED,
)
def create_or_update_board_automation(
    board_id: int,
    payload: BoardAutomationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BoardAutomation:
    """Crea o actualiza una regla de automatización para un tablero."""
    board = _get_board_or_404(db, board_id)

    existing = (
        db.query(BoardAutomation)
        .filter(
            BoardAutomation.board_id == board.id,
            BoardAutomation.rule_type == payload.rule_type,
        )
        .first()
    )

    target_status = payload.target_status_key or "done"

    if existing:
        existing.is_active = payload.is_active
        existing.target_status_key = target_status
        db.commit()
        db.refresh(existing)
        return existing

    new_rule = BoardAutomation(
        board_id=board.id,
        rule_type=payload.rule_type,
        target_status_key=target_status,
        is_active=payload.is_active,
    )
    db.add(new_rule)
    db.commit()
    db.refresh(new_rule)
    return new_rule


@router.patch(
    "/automations/{automation_id}",
    response_model=BoardAutomationRead,
)
def update_board_automation(
    automation_id: int,
    payload: BoardAutomationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BoardAutomation:
    """Activa, desactiva o ajusta una regla de automatización existente."""
    rule = _get_automation_or_404(db, automation_id)

    if payload.is_active is not None:
        rule.is_active = payload.is_active
    if payload.target_status_key is not None:
        rule.target_status_key = payload.target_status_key

    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/automations/{automation_id}")
def delete_board_automation(
    automation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Elimina una regla de automatización por su ID."""
    rule = _get_automation_or_404(db, automation_id)
    db.delete(rule)
    db.commit()
    return {"deleted": True, "id": automation_id}
