"""Router para Integraciones Externas y Feed de Calendario iCal RFC 5545 (Google Calendar / Outlook)."""

from __future__ import annotations

import urllib.parse
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Board, TaskItem
from app.schemas import CalendarUrlResponse

router = APIRouter(prefix="/api/integrations", tags=["Integrations & Calendar"])


def _format_ical_date(date_str: str) -> str:
    """Convierte fecha YYYY-MM-DD a formato iCal YYYYMMDD."""
    return date_str.replace("-", "").strip()


@router.get(
    "/calendar/feed/{board_id}.ics",
    response_class=Response,
)
def get_board_calendar_feed(
    board_id: int,
    db: Session = Depends(get_db),
) -> Response:
    """Genera un feed iCalendar estándar (RFC 5545) con todas las tareas con fecha del tablero."""
    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tablero con ID {board_id} no encontrado.",
        )

    now_utc = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    lines: list[str] = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Gestor de Proyectos//ES",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:{board.name}",
        f"X-WR-CALDESC:{board.description or 'Calendario de tareas sincronizado'}",
    ]

    all_items: list[TaskItem] = [it for grp in board.groups for it in grp.items]
    items_with_dates = [it for it in all_items if it.due_date or it.start_date]

    for item in items_with_dates:
        start_date = item.start_date or item.due_date
        end_date = item.due_date or item.start_date

        start_cal = _format_ical_date(start_date)
        end_cal = _format_ical_date(end_date)

        event_status = "COMPLETED" if item.status_key == "done" else "CONFIRMED"
        description_clean = (
            f"Estado: {item.status_key} | Prioridad: {item.priority}\\n"
            f"Grupo: {item.group.title if item.group else ''}\\n"
            f"Notas: {item.notes or 'Sin notas'}"
        ).replace("\r", "")

        lines.extend(
            [
                "BEGIN:VEVENT",
                f"UID:task-{item.id}-{item.board_id}@gestor.dev",
                f"DTSTAMP:{now_utc}",
                f"DTSTART;VALUE=DATE:{start_cal}",
                f"DTEND;VALUE=DATE:{end_cal}",
                f"SUMMARY:{item.title}",
                f"DESCRIPTION:{description_clean}",
                f"STATUS:{event_status}",
                "END:VEVENT",
            ]
        )

    lines.append("END:VCALENDAR")
    ical_content = "\r\n".join(lines) + "\r\n"

    return Response(
        content=ical_content,
        media_type="text/calendar; charset=utf-8",
        headers={
            "Content-Disposition": f'inline; filename="board_{board_id}.ics"',
            "Cache-Control": "no-cache, no-store, must-revalidate",
        },
    )


@router.get(
    "/calendar/google-url/{board_id}",
    response_model=CalendarUrlResponse,
)
def get_google_calendar_url(
    board_id: int,
    request: Request,
    db: Session = Depends(get_db),
) -> CalendarUrlResponse:
    """Devuelve la URL formateada para suscripción directa en Google Calendar y el feed iCal."""
    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tablero con ID {board_id} no encontrado.",
        )

    base_url = str(request.base_url).rstrip("/")
    feed_url = f"{base_url}/api/integrations/calendar/feed/{board_id}.ics"
    encoded_feed = urllib.parse.quote(feed_url, safe="")
    google_calendar_url = f"https://calendar.google.com/calendar/render?cid={encoded_feed}"

    return CalendarUrlResponse(
        feed_url=feed_url,
        google_calendar_url=google_calendar_url,
    )
