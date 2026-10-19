"""Endpoints REST para Comentarios, Checklist Interno e Historial de Actividad por Tarea."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import (
    TaskActivityLog,
    TaskChecklistItem,
    TaskComment,
    TaskItem,
    User,
)
from app.schemas import (
    TaskChecklistCreate,
    TaskChecklistItemRead,
    TaskChecklistUpdate,
    TaskCommentCreate,
    TaskCommentRead,
    TaskItemDetailRead,
)

router = APIRouter(prefix="/api", tags=["Colaboración y Actividad por Tarea"])


def _get_item_or_404(db: Session, item_id: int) -> TaskItem:
    item = db.query(TaskItem).filter(TaskItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tarea con ID {item_id} no encontrada.",
        )
    return item


@router.get("/items/{item_id}/detail", response_model=TaskItemDetailRead)
def get_task_item_detail(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskItem:
    """Devuelve el detalle completo de una tarea con comentarios, checklist e historial."""
    return _get_item_or_404(db, item_id)


@router.post(
    "/items/{item_id}/comments",
    response_model=TaskCommentRead,
    status_code=status.HTTP_201_CREATED,
)
def create_task_comment(
    item_id: int,
    payload: TaskCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskComment:
    """Publica un nuevo comentario en la tarea y registra la actividad."""
    item = _get_item_or_404(db, item_id)

    comment = TaskComment(
        item_id=item.id,
        author_id=current_user.id,
        content=payload.content,
    )
    db.add(comment)
    db.add(
        TaskActivityLog(
            item_id=item.id,
            user_id=current_user.id,
            action="comment_added",
            description="Agregó un comentario en la tarea.",
        )
    )
    item.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(comment)
    return comment


@router.delete("/comments/{comment_id}")
def delete_task_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Elimina un comentario por su ID."""
    comment = db.query(TaskComment).filter(TaskComment.id == comment_id).first()
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Comentario con ID {comment_id} no encontrado.",
        )
    db.delete(comment)
    db.commit()
    return {"deleted": True, "id": comment_id}


@router.post(
    "/items/{item_id}/checklist",
    response_model=TaskChecklistItemRead,
    status_code=status.HTTP_201_CREATED,
)
def create_checklist_item(
    item_id: int,
    payload: TaskChecklistCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskChecklistItem:
    """Agrega un nuevo ítem al checklist interno de la tarea."""
    item = _get_item_or_404(db, item_id)
    existing_checklist = item.checklist_items
    next_position = (
        payload.position
        if payload.position is not None
        else (max((c.position for c in existing_checklist), default=-1) + 1)
    )

    checklist_item = TaskChecklistItem(
        item_id=item.id,
        title=payload.title,
        is_completed=payload.is_completed,
        position=next_position,
    )
    db.add(checklist_item)
    db.add(
        TaskActivityLog(
            item_id=item.id,
            user_id=current_user.id,
            action="checklist_updated",
            description=f"Agregó al checklist: '{payload.title}'",
        )
    )
    item.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(checklist_item)
    return checklist_item


@router.patch(
    "/checklist/{checklist_id}",
    response_model=TaskChecklistItemRead,
)
def update_checklist_item(
    checklist_id: int,
    payload: TaskChecklistUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskChecklistItem:
    """Actualiza el título, estado completado o posición de un ítem del checklist."""
    checklist_item = (
        db.query(TaskChecklistItem)
        .filter(TaskChecklistItem.id == checklist_id)
        .first()
    )
    if not checklist_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ítem de checklist con ID {checklist_id} no encontrado.",
        )

    old_completed = checklist_item.is_completed

    if payload.title is not None:
        checklist_item.title = payload.title
    if payload.position is not None:
        checklist_item.position = payload.position
    if payload.is_completed is not None:
        checklist_item.is_completed = payload.is_completed

    if payload.is_completed is not None and payload.is_completed != old_completed:
        verb = "Completó" if checklist_item.is_completed else "Reabrió"
        db.add(
            TaskActivityLog(
                item_id=checklist_item.item_id,
                user_id=current_user.id,
                action="checklist_updated",
                description=f"{verb} el ítem del checklist: '{checklist_item.title}'",
            )
        )

    db.commit()
    db.refresh(checklist_item)
    return checklist_item


@router.delete("/checklist/{checklist_id}")
def delete_checklist_item(
    checklist_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Elimina un ítem del checklist interno por su ID."""
    checklist_item = (
        db.query(TaskChecklistItem)
        .filter(TaskChecklistItem.id == checklist_id)
        .first()
    )
    if not checklist_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ítem de checklist con ID {checklist_id} no encontrado.",
        )

    db.delete(checklist_item)
    db.commit()
    return {"deleted": True, "id": checklist_id}

