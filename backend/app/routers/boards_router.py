"""Endpoints REST para gestión de Tableros (Boards) y Estados Personalizables."""

from __future__ import annotations

import csv
import io
import re
import unicodedata
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import (
    DEFAULT_BOARD_GROUPS,
    DEFAULT_BOARD_STATUSES,
    Board,
    BoardStatusConfig,
    TaskGroup,
    TaskItem,
    User,
    Workspace,
)
from app.schemas import (
    AssigneeWorkloadItem,
    BoardAnalyticsRead,
    BoardCreate,
    BoardDetailRead,
    BoardStatusCreate,
    BoardStatusRead,
    BoardStatusUpdate,
    BoardUpdate,
    GroupMetricsItem,
    PriorityBreakdownItem,
    StatusBreakdownItem,
)

router = APIRouter(prefix="/api/boards", tags=["Boards y Estados"])

PRIORITY_LABELS: dict[str, str] = {
    "critical": "Crítica",
    "high": "Alta",
    "medium": "Media",
    "low": "Baja",
}


def _slugify_status_key(raw_text: str) -> str:
    """Convierte una etiqueta de estado en un identificador slug limpio."""
    normalized = (
        unicodedata.normalize("NFKD", raw_text)
        .encode("ascii", "ignore")
        .decode("ascii")
        .lower()
    )
    slug = re.sub(r"[^a-z0-9]+", "_", normalized).strip("_")
    return slug or "custom_status"


def _generate_unique_status_key(
    existing_keys: set[str], label: str, requested_key: str | None = None
) -> str:
    """Genera una clave única para el estado dentro del tablero."""
    base_key = _slugify_status_key(requested_key if requested_key else label)[:45]
    candidate = base_key
    counter = 2
    while candidate in existing_keys:
        candidate = f"{base_key}_{counter}"
        counter += 1
    return candidate


def _get_board_or_404(db: Session, board_id: int) -> Board:
    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tablero con ID {board_id} no encontrado.",
        )
    return board


@router.post("", response_model=BoardDetailRead, status_code=status.HTTP_201_CREATED)
def create_board(
    payload: BoardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Board:
    """Crea un tablero nuevo con sus 5 estados por defecto y 2 grupos iniciales."""
    workspace = (
        db.query(Workspace).filter(Workspace.id == payload.workspace_id).first()
    )
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Espacio de trabajo con ID {payload.workspace_id} no encontrado.",
        )

    board = Board(
        workspace_id=payload.workspace_id,
        name=payload.name,
        description=payload.description.strip(),
    )
    db.add(board)
    db.flush()

    for st in DEFAULT_BOARD_STATUSES:
        db.add(
            BoardStatusConfig(
                board_id=board.id,
                key=str(st["key"]),
                label=str(st["label"]),
                color=str(st["color"]),
                position=int(st["position"]),
            )
        )

    for grp in DEFAULT_BOARD_GROUPS:
        db.add(
            TaskGroup(
                board_id=board.id,
                title=str(grp["title"]),
                color=str(grp["color"]),
                position=int(grp["position"]),
                collapsed=bool(grp["collapsed"]),
            )
        )

    db.commit()
    db.refresh(board)
    return board


@router.get("/{board_id}", response_model=BoardDetailRead)
def get_board_detail(
    board_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Board:
    """Devuelve el detalle completo de un tablero con estados, grupos e items ordenados."""
    return _get_board_or_404(db, board_id)


@router.get("/{board_id}/analytics", response_model=BoardAnalyticsRead)
def get_board_analytics(
    board_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BoardAnalyticsRead:
    """Calcula KPIs ejecutivos y desgloses analíticos sobre las tareas del tablero."""
    board = _get_board_or_404(db, board_id)
    all_items: list[TaskItem] = [
        item for grp in board.groups for item in grp.items
    ]

    total_items = len(all_items)
    completed_items = sum(1 for it in all_items if it.status_key == "done")
    completion_rate = (
        round((completed_items / total_items) * 100.0, 2)
        if total_items > 0
        else 0.0
    )

    today_iso = datetime.now(timezone.utc).date().isoformat()
    overdue_items = sum(
        1
        for it in all_items
        if it.due_date is not None
        and it.due_date < today_iso
        and it.status_key != "done"
    )
    unassigned_items = sum(1 for it in all_items if it.assignee_id is None)
    total_estimated_hours = round(
        sum(float(it.estimated_hours or 0.0) for it in all_items), 2
    )
    total_budget = round(sum(float(it.budget or 0.0) for it in all_items), 2)

    # Desglose por estado configurado en el tablero
    status_counts: dict[str, int] = {st.key: 0 for st in board.statuses}
    for it in all_items:
        status_counts[it.status_key] = status_counts.get(it.status_key, 0) + 1

    by_status = [
        StatusBreakdownItem(
            key=st.key,
            label=st.label,
            color=st.color,
            count=status_counts.get(st.key, 0),
            percentage=(
                round((status_counts.get(st.key, 0) / total_items) * 100.0, 2)
                if total_items > 0
                else 0.0
            ),
        )
        for st in board.statuses
    ]

    # Desglose por prioridad
    priority_order = ("critical", "high", "medium", "low")
    by_priority = [
        PriorityBreakdownItem(
            priority=prio,
            count=sum(1 for it in all_items if it.priority == prio),
        )
        for prio in priority_order
    ]

    # Desglose por responsable (incluyendo "Sin asignar" si aplica)
    assignee_map: dict[int | None, dict[str, Any]] = {}
    for it in all_items:
        uid = it.assignee_id
        if uid not in assignee_map:
            if it.assignee is not None:
                assignee_map[uid] = {
                    "user_id": it.assignee.id,
                    "full_name": it.assignee.full_name,
                    "color": it.assignee.color,
                    "total_items": 0,
                    "completed_items": 0,
                    "estimated_hours": 0.0,
                    "budget": 0.0,
                }
            else:
                assignee_map[None] = {
                    "user_id": None,
                    "full_name": "Sin asignar",
                    "color": "#c4c4c4",
                    "total_items": 0,
                    "completed_items": 0,
                    "estimated_hours": 0.0,
                    "budget": 0.0,
                }
        entry = assignee_map[uid]
        entry["total_items"] += 1
        if it.status_key == "done":
            entry["completed_items"] += 1
        entry["estimated_hours"] = round(
            entry["estimated_hours"] + float(it.estimated_hours or 0.0), 2
        )
        entry["budget"] = round(entry["budget"] + float(it.budget or 0.0), 2)

    by_assignee = [
        AssigneeWorkloadItem(**val)
        for key, val in sorted(
            assignee_map.items(),
            key=lambda kv: (kv[0] is None, kv[0] or 0),
        )
    ]

    # Desglose por grupo
    by_group = [
        GroupMetricsItem(
            group_id=grp.id,
            title=grp.title,
            color=grp.color,
            total_items=len(grp.items),
            completed_items=sum(
                1 for it in grp.items if it.status_key == "done"
            ),
            total_estimated_hours=round(
                sum(float(it.estimated_hours or 0.0) for it in grp.items), 2
            ),
            total_budget=round(
                sum(float(it.budget or 0.0) for it in grp.items), 2
            ),
        )
        for grp in board.groups
    ]

    return BoardAnalyticsRead(
        board_id=board.id,
        total_items=total_items,
        completed_items=completed_items,
        completion_rate=completion_rate,
        overdue_items=overdue_items,
        unassigned_items=unassigned_items,
        total_estimated_hours=total_estimated_hours,
        total_budget=total_budget,
        by_status=by_status,
        by_priority=by_priority,
        by_assignee=by_assignee,
        by_group=by_group,
    )


@router.get("/{board_id}/export.csv")
def export_board_csv(
    board_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    """Exporta todas las tareas del tablero en formato CSV UTF-8."""
    board = _get_board_or_404(db, board_id)
    status_label_by_key = {st.key: st.label for st in board.statuses}

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "ID",
            "Grupo",
            "Tarea",
            "Estado",
            "Prioridad",
            "Responsable",
            "Fecha Inicio",
            "Fecha Limite",
            "Horas Estimadas",
            "Presupuesto",
            "Notas",
        ]
    )

    for grp in board.groups:
        for item in grp.items:
            writer.writerow(
                [
                    item.id,
                    grp.title,
                    item.title,
                    status_label_by_key.get(item.status_key, item.status_key),
                    PRIORITY_LABELS.get(item.priority, item.priority),
                    item.assignee.full_name if item.assignee else "Sin asignar",
                    item.start_date or "",
                    item.due_date or "",
                    f"{float(item.estimated_hours or 0.0):.2f}",
                    f"{float(item.budget or 0.0):.2f}",
                    item.notes or "",
                ]
            )

    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="board_{board_id}_export.csv"'
        },
    )


@router.patch("/{board_id}", response_model=BoardDetailRead)
def update_board(
    board_id: int,
    payload: BoardUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Board:
    """Actualiza el nombre y/o la descripción de un tablero."""
    board = _get_board_or_404(db, board_id)

    if payload.name is not None:
        board.name = payload.name
    if payload.description is not None:
        board.description = payload.description.strip()

    db.commit()
    db.refresh(board)
    return board


@router.delete("/{board_id}")
def delete_board(
    board_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Elimina un tablero y todos sus estados, grupos y tareas en cascada."""
    board = _get_board_or_404(db, board_id)
    db.delete(board)
    db.commit()
    return {"deleted": True, "id": board_id}


@router.post(
    "/{board_id}/statuses",
    response_model=BoardStatusRead,
    status_code=status.HTTP_201_CREATED,
)
def create_board_status(
    board_id: int,
    payload: BoardStatusCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BoardStatusConfig:
    """Crea un nuevo estado personalizado dentro de un tablero."""
    board = _get_board_or_404(db, board_id)
    existing_statuses = board.statuses
    existing_keys = {st.key for st in existing_statuses}

    unique_key = _generate_unique_status_key(
        existing_keys=existing_keys,
        label=payload.label,
        requested_key=payload.key,
    )
    next_position = (
        payload.position
        if payload.position is not None
        else (max((st.position for st in existing_statuses), default=-1) + 1)
    )

    new_status = BoardStatusConfig(
        board_id=board.id,
        key=unique_key,
        label=payload.label,
        color=payload.color,
        position=next_position,
    )
    db.add(new_status)
    db.commit()
    db.refresh(new_status)
    return new_status


@router.patch(
    "/{board_id}/statuses/{status_id}",
    response_model=BoardStatusRead,
)
def update_board_status(
    board_id: int,
    status_id: int,
    payload: BoardStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BoardStatusConfig:
    """Actualiza la etiqueta, color o posición de un estado existente del tablero."""
    _get_board_or_404(db, board_id)
    status_cfg = (
        db.query(BoardStatusConfig)
        .filter(
            BoardStatusConfig.id == status_id,
            BoardStatusConfig.board_id == board_id,
        )
        .first()
    )
    if not status_cfg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Estado con ID {status_id} no encontrado en el tablero {board_id}.",
        )

    if payload.label is not None:
        status_cfg.label = payload.label
    if payload.color is not None:
        status_cfg.color = payload.color
    if payload.position is not None:
        status_cfg.position = payload.position

    db.commit()
    db.refresh(status_cfg)
    return status_cfg


@router.delete("/{board_id}/statuses/{status_id}")
def delete_board_status(
    board_id: int,
    status_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Elimina un estado del tablero y reasigna sus tareas al primer estado disponible."""
    _get_board_or_404(db, board_id)
    all_statuses = (
        db.query(BoardStatusConfig)
        .filter(BoardStatusConfig.board_id == board_id)
        .order_by(BoardStatusConfig.position.asc(), BoardStatusConfig.id.asc())
        .all()
    )

    target_status = next((st for st in all_statuses if st.id == status_id), None)
    if not target_status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Estado con ID {status_id} no encontrado en el tablero {board_id}.",
        )

    if len(all_statuses) <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede eliminar el único estado restante del tablero.",
        )

    remaining_statuses = [st for st in all_statuses if st.id != status_id]
    fallback_status = remaining_statuses[0]

    # Reasignar todas las tareas del tablero que usaban el estado eliminado
    affected_items = (
        db.query(TaskItem)
        .filter(
            TaskItem.board_id == board_id,
            TaskItem.status_key == target_status.key,
        )
        .all()
    )
    for item in affected_items:
        item.status_key = fallback_status.key

    db.delete(target_status)
    db.commit()
    return {
        "deleted": True,
        "id": status_id,
        "reassigned_to_key": fallback_status.key,
        "reassigned_items_count": len(affected_items),
    }

