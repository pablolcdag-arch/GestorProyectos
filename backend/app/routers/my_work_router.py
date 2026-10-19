"""Router para la vista global 'Mi Trabajo' (Fase 3)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import TaskItem, User
from app.schemas import (
    MyWorkItemRead,
    MyWorkResponse,
    MyWorkSummary,
    UserRead,
)

router = APIRouter(prefix="/api", tags=["Mi Trabajo"])


@router.get("/my-work", response_model=MyWorkResponse)
def get_my_work(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MyWorkResponse:
    """Devuelve todas las tareas asignadas al usuario actual categorizadas en 5 secciones temporales."""
    items = (
        db.query(TaskItem)
        .filter(TaskItem.assignee_id == current_user.id)
        .order_by(TaskItem.due_date.asc().nullslast(), TaskItem.id.asc())
        .all()
    )

    today = datetime.now(timezone.utc).date()
    today_str = today.isoformat()
    week_limit_str = (today + timedelta(days=7)).isoformat()

    overdue: list[MyWorkItemRead] = []
    today_items: list[MyWorkItemRead] = []
    this_week: list[MyWorkItemRead] = []
    upcoming_or_no_date: list[MyWorkItemRead] = []
    completed: list[MyWorkItemRead] = []

    for item in items:
        board = item.board
        workspace = board.workspace if board else None
        group = item.group

        item_read = MyWorkItemRead(
            id=item.id,
            group_id=item.group_id,
            board_id=item.board_id,
            title=item.title,
            status_key=item.status_key,
            priority=item.priority,
            assignee_id=item.assignee_id,
            assignee=UserRead.model_validate(item.assignee) if item.assignee else None,
            start_date=item.start_date,
            due_date=item.due_date,
            estimated_hours=float(item.estimated_hours or 0.0),
            budget=float(item.budget or 0.0),
            notes=item.notes or "",
            position=item.position,
            comments_count=len(item.comments),
            checklist_total=len(item.checklist_items),
            checklist_completed=sum(1 for chk in item.checklist_items if chk.is_completed),
            created_at=item.created_at,
            updated_at=item.updated_at,
            board_name=board.name if board else "",
            workspace_id=board.workspace_id if board else 0,
            workspace_name=workspace.name if workspace else "",
            group_title=group.title if group else "",
            group_color=group.color if group else "#579bfc",
        )

        if item.status_key == "done":
            completed.append(item_read)
        else:
            if item.due_date is not None and item.due_date < today_str:
                overdue.append(item_read)
            elif item.due_date == today_str:
                today_items.append(item_read)
            elif item.due_date is not None and today_str < item.due_date <= week_limit_str:
                this_week.append(item_read)
            else:
                upcoming_or_no_date.append(item_read)

    summary = MyWorkSummary(
        total_assigned=len(items),
        overdue_count=len(overdue),
        today_count=len(today_items),
        this_week_count=len(this_week),
        upcoming_count=len(upcoming_or_no_date),
        completed_count=len(completed),
    )

    return MyWorkResponse(
        summary=summary,
        overdue=overdue,
        today=today_items,
        this_week=this_week,
        upcoming_or_no_date=upcoming_or_no_date,
        completed=completed,
    )
