"""Router para Archivos Adjuntos por Tarea y Centro de Notificaciones de Usuario."""

from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import (
    Notification,
    TaskActivityLog,
    TaskAttachment,
    TaskItem,
    User,
)
from app.schemas import (
    NotificationRead,
    NotificationUpdate,
    TaskAttachmentCreate,
    TaskAttachmentRead,
)

router = APIRouter(prefix="/api", tags=["Attachments & Notifications"])


# ============================================================================
# Endpoints de Archivos Adjuntos (TaskAttachment)
# ============================================================================

@router.post(
    "/items/{item_id}/attachments",
    response_model=TaskAttachmentRead,
    status_code=status.HTTP_201_CREATED,
)
def upload_task_attachment(
    item_id: int,
    payload: TaskAttachmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskAttachment:
    """Registra un archivo adjunto en una tarea con auditoría de actividad y notificación."""
    item = db.query(TaskItem).filter(TaskItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tarea con ID {item_id} no encontrada.",
        )

    resolved_url = payload.file_url or f"/uploads/{item.id}/{payload.filename}"

    attachment = TaskAttachment(
        item_id=item.id,
        filename=payload.filename,
        file_size=payload.file_size,
        content_type=payload.content_type,
        file_url=resolved_url,
        uploaded_by_id=current_user.id,
    )
    db.add(attachment)

    db.add(
        TaskActivityLog(
            item_id=item.id,
            user_id=current_user.id,
            action="attachment_added",
            description=f"Adjuntó el archivo '{payload.filename}'",
        )
    )

    # Notificar al responsable si no es el mismo usuario que sube el archivo
    if item.assignee_id and item.assignee_id != current_user.id:
        db.add(
            Notification(
                user_id=item.assignee_id,
                title="Nuevo archivo adjunto",
                message=f"{current_user.full_name} adjuntó '{payload.filename}' en la tarea '{item.title}'.",
                link_url=f"/boards/{item.board_id}?item={item.id}",
                is_read=False,
            )
        )

    db.commit()
    db.refresh(attachment)
    return attachment


@router.get(
    "/items/{item_id}/attachments",
    response_model=list[TaskAttachmentRead],
)
def list_task_attachments(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[TaskAttachment]:
    """Devuelve la lista de archivos adjuntos asociados a una tarea."""
    item = db.query(TaskItem).filter(TaskItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tarea con ID {item_id} no encontrada.",
        )
    return (
        db.query(TaskAttachment)
        .filter(TaskAttachment.item_id == item.id)
        .order_by(TaskAttachment.id.desc())
        .all()
    )


@router.delete("/attachments/{attachment_id}")
def delete_task_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Elimina un archivo adjunto por su ID."""
    attachment = db.query(TaskAttachment).filter(TaskAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Adjunto con ID {attachment_id} no encontrado.",
        )

    item_id = attachment.item_id
    filename = attachment.filename

    db.delete(attachment)
    db.add(
        TaskActivityLog(
            item_id=item_id,
            user_id=current_user.id,
            action="attachment_deleted",
            description=f"Eliminó el archivo adjunto '{filename}'",
        )
    )
    db.commit()
    return {"deleted": True, "id": attachment_id}


# ============================================================================
# Endpoints de Notificaciones de Usuario
# ============================================================================

@router.get("/notifications", response_model=list[NotificationRead])
def list_user_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Notification]:
    """Lista las notificaciones del usuario autenticado ordenadas por fecha más reciente."""
    return (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc(), Notification.id.desc())
        .all()
    )


@router.patch("/notifications/{notification_id}/read", response_model=NotificationRead)
def mark_notification_as_read(
    notification_id: int,
    payload: NotificationUpdate = NotificationUpdate(is_read=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Notification:
    """Marca una notificación específica como leída o no leída."""
    notif = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
        .first()
    )
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notificación con ID {notification_id} no encontrada.",
        )

    notif.is_read = payload.is_read
    db.commit()
    db.refresh(notif)
    return notif


@router.post("/notifications/mark-all-read")
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Marca todas las notificaciones pendientes del usuario como leídas."""
    unread_notifs = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.is_read.is_(False),
        )
        .all()
    )
    count = len(unread_notifs)
    for n in unread_notifs:
        n.is_read = True

    db.commit()
    return {"updated": True, "count": count}
