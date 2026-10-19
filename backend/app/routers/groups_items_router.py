"""Endpoints REST para gestión de Grupos de Tareas (TaskGroup) y Filas/Tareas (TaskItem)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import (
    Board,
    BoardStatusConfig,
    TaskActivityLog,
    TaskGroup,
    TaskItem,
    User,
)
from app.schemas import (
    TaskGroupCreate,
    TaskGroupRead,
    TaskGroupUpdate,
    TaskItemCreate,
    TaskItemRead,
    TaskItemUpdate,
)

router = APIRouter(prefix="/api", tags=["Grupos y Tareas"])


def _get_board_or_404(db: Session, board_id: int) -> Board:
    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tablero con ID {board_id} no encontrado.",
        )
    return board


def _get_group_or_404(db: Session, group_id: int) -> TaskGroup:
    group = db.query(TaskGroup).filter(TaskGroup.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Grupo con ID {group_id} no encontrado.",
        )
    return group


def _get_item_or_404(db: Session, item_id: int) -> TaskItem:
    item = db.query(TaskItem).filter(TaskItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tarea con ID {item_id} no encontrada.",
        )
    return item


def _validate_user_exists(db: Session, user_id: int) -> User:
    user = (
        db.query(User)
        .filter(User.id == user_id, User.is_active.is_(True))
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario activo con ID {user_id} no encontrado.",
        )
    return user


def _get_board_statuses(db: Session, board_id: int) -> list[BoardStatusConfig]:
    return (
        db.query(BoardStatusConfig)
        .filter(BoardStatusConfig.board_id == board_id)
        .order_by(BoardStatusConfig.position.asc(), BoardStatusConfig.id.asc())
        .all()
    )


def _get_board_status_keys(db: Session, board_id: int) -> list[str]:
    return [st.key for st in _get_board_statuses(db, board_id)]


# ---------------------------------------------------------------------------
# A. Gestión de Grupos (TaskGroup)
# ---------------------------------------------------------------------------


@router.post(
    "/boards/{board_id}/groups",
    response_model=TaskGroupRead,
    status_code=status.HTTP_201_CREATED,
)
def create_task_group(
    board_id: int,
    payload: TaskGroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskGroup:
    """Crea un nuevo grupo de tareas dentro del tablero especificado."""
    board = _get_board_or_404(db, board_id)
    existing_groups = board.groups
    next_position = (
        payload.position
        if payload.position is not None
        else (max((grp.position for grp in existing_groups), default=-1) + 1)
    )

    new_group = TaskGroup(
        board_id=board.id,
        title=payload.title,
        color=payload.color,
        position=next_position,
        collapsed=payload.collapsed,
    )
    db.add(new_group)
    db.commit()
    db.refresh(new_group)
    return new_group


@router.patch("/groups/{group_id}", response_model=TaskGroupRead)
def update_task_group(
    group_id: int,
    payload: TaskGroupUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskGroup:
    """Actualiza título, color, posición o estado colapsado de un grupo."""
    group = _get_group_or_404(db, group_id)

    if payload.title is not None:
        group.title = payload.title
    if payload.color is not None:
        group.color = payload.color
    if payload.position is not None:
        group.position = payload.position
    if payload.collapsed is not None:
        group.collapsed = payload.collapsed

    db.commit()
    db.refresh(group)
    return group


@router.delete("/groups/{group_id}")
def delete_task_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Elimina un grupo y todas sus tareas asociadas en cascada."""
    group = _get_group_or_404(db, group_id)
    db.delete(group)
    db.commit()
    return {"deleted": True, "id": group_id}


# ---------------------------------------------------------------------------
# B. Gestión de Tareas / Filas (TaskItem)
# ---------------------------------------------------------------------------


@router.post(
    "/groups/{group_id}/items",
    response_model=TaskItemRead,
    status_code=status.HTTP_201_CREATED,
)
def create_task_item(
    group_id: int,
    payload: TaskItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskItem:
    """Crea una nueva tarea dentro de un grupo validando estado, responsable y fecha."""
    group = _get_group_or_404(db, group_id)
    board_id = group.board_id

    valid_status_keys = _get_board_status_keys(db, board_id)
    if payload.status_key is None:
        if "not_started" in valid_status_keys:
            resolved_status_key = "not_started"
        elif valid_status_keys:
            resolved_status_key = valid_status_keys[0]
        else:
            resolved_status_key = "not_started"
    else:
        if payload.status_key not in valid_status_keys:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"El estado '{payload.status_key}' no pertenece a los estados "
                    f"configurados en el tablero {board_id}."
                ),
            )
        resolved_status_key = payload.status_key

    if payload.assignee_id is not None:
        _validate_user_exists(db, payload.assignee_id)

    existing_items = group.items
    next_position = (
        payload.position
        if payload.position is not None
        else (max((item.position for item in existing_items), default=-1) + 1)
    )

    new_item = TaskItem(
        group_id=group.id,
        board_id=board_id,
        title=payload.title,
        status_key=resolved_status_key,
        priority=payload.priority,
        assignee_id=payload.assignee_id,
        due_date=payload.due_date,
        notes=payload.notes,
        position=next_position,
    )
    db.add(new_item)
    db.flush()

    db.add(
        TaskActivityLog(
            item_id=new_item.id,
            user_id=current_user.id,
            action="item_created",
            description=f"Creó la tarea '{new_item.title}'",
        )
    )
    db.commit()
    db.refresh(new_item)
    return new_item


@router.patch("/items/{item_id}", response_model=TaskItemRead)
def update_task_item(
    item_id: int,
    payload: TaskItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TaskItem:
    """Edición inline parcial de una tarea con auditoría automática en TaskActivityLog."""
    item = _get_item_or_404(db, item_id)
    fields_set = payload.model_fields_set

    if "title" in fields_set:
        if payload.title is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El título de la tarea no puede ser nulo.",
            )
        if payload.title != item.title:
            item.title = payload.title
            db.add(
                TaskActivityLog(
                    item_id=item.id,
                    user_id=current_user.id,
                    action="title_changed",
                    description=f"Renombró la tarea a '{payload.title}'",
                )
            )

    if "group_id" in fields_set:
        if payload.group_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El group_id no puede ser nulo.",
            )
        target_group = _get_group_or_404(db, payload.group_id)
        if target_group.board_id != item.board_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se puede mover una tarea a un grupo perteneciente a otro tablero.",
            )
        if target_group.id != item.group_id:
            item.group_id = target_group.id
            db.add(
                TaskActivityLog(
                    item_id=item.id,
                    user_id=current_user.id,
                    action="group_changed",
                    description=f"Movió la tarea al grupo '{target_group.title}'",
                )
            )

    if "status_key" in fields_set:
        if payload.status_key is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El status_key no puede ser nulo.",
            )
        board_statuses = _get_board_statuses(db, item.board_id)
        status_by_key = {st.key: st.label for st in board_statuses}
        if payload.status_key not in status_by_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"El estado '{payload.status_key}' no pertenece a los estados "
                    f"configurados en el tablero {item.board_id}."
                ),
            )
        if payload.status_key != item.status_key:
            item.status_key = payload.status_key
            status_label = status_by_key[payload.status_key]
            db.add(
                TaskActivityLog(
                    item_id=item.id,
                    user_id=current_user.id,
                    action="status_changed",
                    description=f"Cambió el estado a '{status_label}'",
                )
            )

    if "priority" in fields_set:
        if payload.priority is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La prioridad no puede ser nula.",
            )
        if payload.priority != item.priority:
            item.priority = payload.priority
            db.add(
                TaskActivityLog(
                    item_id=item.id,
                    user_id=current_user.id,
                    action="priority_changed",
                    description=f"Cambió la prioridad a '{payload.priority}'",
                )
            )

    if "assignee_id" in fields_set:
        if payload.assignee_id is None:
            if item.assignee_id is not None:
                item.assignee_id = None
                db.add(
                    TaskActivityLog(
                        item_id=item.id,
                        user_id=current_user.id,
                        action="assignee_changed",
                        description="Desasignó el responsable",
                    )
                )
        else:
            assigned_user = _validate_user_exists(db, payload.assignee_id)
            if payload.assignee_id != item.assignee_id:
                item.assignee_id = payload.assignee_id
                db.add(
                    TaskActivityLog(
                        item_id=item.id,
                        user_id=current_user.id,
                        action="assignee_changed",
                        description=f"Asignó la tarea a {assigned_user.full_name}",
                    )
                )

    if "due_date" in fields_set:
        if payload.due_date != item.due_date:
            item.due_date = payload.due_date
            desc = (
                "Eliminó la fecha límite"
                if payload.due_date is None
                else f"Definió la fecha límite para {payload.due_date}"
            )
            db.add(
                TaskActivityLog(
                    item_id=item.id,
                    user_id=current_user.id,
                    action="due_date_changed",
                    description=desc,
                )
            )

    if "notes" in fields_set:
        item.notes = payload.notes if payload.notes is not None else ""

    if "position" in fields_set and payload.position is not None:
        item.position = payload.position

    item.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/items/{item_id}")
def delete_task_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Elimina una tarea por su ID."""
    item = _get_item_or_404(db, item_id)
    db.delete(item)
    db.commit()
    return {"deleted": True, "id": item_id}

