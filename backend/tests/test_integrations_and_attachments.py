"""Pruebas automatizadas para Integraciones (iCal RFC 5545, Google Calendar, Adjuntos y Notificaciones)."""

from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Board, Notification, TaskAttachment, TaskItem, User


def test_calendar_feed_and_google_url(
    client: TestClient, db_session: Session
) -> None:
    """Verifica que el feed iCal cumpla con RFC 5545 y que la URL de Google Calendar se genere correctamente."""
    board = db_session.query(Board).first()
    assert board is not None

    # 1. Consultar el feed iCal .ics
    res_feed = client.get(f"/api/integrations/calendar/feed/{board.id}.ics")
    assert res_feed.status_code == 200
    assert "text/calendar" in res_feed.headers["content-type"]
    assert f'inline; filename="board_{board.id}.ics"' in res_feed.headers["content-disposition"]

    content = res_feed.text
    assert "BEGIN:VCALENDAR" in content
    assert "VERSION:2.0" in content
    assert "METHOD:PUBLISH" in content
    assert f"X-WR-CALNAME:{board.name}" in content
    assert "BEGIN:VEVENT" in content
    assert "DTSTART;VALUE=DATE:" in content
    assert "SUMMARY:" in content
    assert "END:VEVENT" in content
    assert "END:VCALENDAR" in content

    # 2. Consultar URL de Google Calendar
    res_url = client.get(f"/api/integrations/calendar/google-url/{board.id}")
    assert res_url.status_code == 200
    data_url = res_url.json()
    assert f"/api/integrations/calendar/feed/{board.id}.ics" in data_url["feed_url"]
    assert "https://calendar.google.com/calendar/render?cid=" in data_url["google_calendar_url"]

    # 3. 404 para tablero inexistente
    res_404 = client.get("/api/integrations/calendar/feed/99999.ics")
    assert res_404.status_code == 404


def test_task_attachments_crud_lifecycle(
    client: TestClient, auth_headers: dict[str, str], db_session: Session
) -> None:
    """Verifica registro, consulta y eliminación de archivos adjuntos por tarea."""
    item = db_session.query(TaskItem).first()
    assert item is not None

    # 1. Subir/registrar adjunto vía POST
    attachment_payload = {
        "filename": "especificacion_tecnica_v1.pdf",
        "file_size": 1048576,  # 1 MB
        "content_type": "application/pdf",
        "file_url": f"https://cdn.gestor.dev/items/{item.id}/especificacion_tecnica_v1.pdf",
    }
    res_post = client.post(
        f"/api/items/{item.id}/attachments",
        headers=auth_headers,
        json=attachment_payload,
    )
    assert res_post.status_code == 201
    created_att = res_post.json()
    att_id = created_att["id"]
    assert created_att["filename"] == "especificacion_tecnica_v1.pdf"
    assert created_att["file_size"] == 1048576
    assert created_att["content_type"] == "application/pdf"
    assert created_att["item_id"] == item.id

    # 2. Listar adjuntos de la tarea vía GET
    res_list = client.get(
        f"/api/items/{item.id}/attachments",
        headers=auth_headers,
    )
    assert res_list.status_code == 200
    attachments = res_list.json()
    assert len(attachments) >= 1
    assert any(a["id"] == att_id for a in attachments)

    # 3. Eliminar adjunto vía DELETE
    res_del = client.delete(
        f"/api/attachments/{att_id}",
        headers=auth_headers,
    )
    assert res_del.status_code == 200
    assert res_del.json() == {"deleted": True, "id": att_id}

    # 4. Verificar que ya no existe en la base de datos
    check_db = db_session.query(TaskAttachment).filter(TaskAttachment.id == att_id).first()
    assert check_db is None

    # 5. 404 para adjunto inexistente
    assert client.delete("/api/attachments/99999", headers=auth_headers).status_code == 404


def test_notifications_lifecycle_and_mark_read(
    client: TestClient, auth_headers: dict[str, str], db_session: Session
) -> None:
    """Verifica consulta de notificaciones, marcado individual y masivo de lectura."""
    # 1. Obtener el usuario autenticado (Ana)
    ana = db_session.query(User).filter(User.email == "ana@gestor.dev").first()
    assert ana is not None

    # 2. Crear 2 notificaciones para Ana
    notif1 = Notification(
        user_id=ana.id,
        title="Tarea asignada",
        message="Se te ha asignado la tarea 'Refactorizar autenticación'.",
        link_url="/boards/1?item=1",
        is_read=False,
    )
    notif2 = Notification(
        user_id=ana.id,
        title="Nuevo comentario",
        message="Carlos comentó en tu entrega.",
        link_url="/boards/1?item=2",
        is_read=False,
    )
    db_session.add_all([notif1, notif2])
    db_session.commit()
    db_session.refresh(notif1)
    db_session.refresh(notif2)

    # 3. Listar notificaciones del usuario
    res_get = client.get("/api/notifications", headers=auth_headers)
    assert res_get.status_code == 200
    notifs = res_get.json()
    assert len(notifs) >= 2
    user_ids = {n["user_id"] for n in notifs}
    assert user_ids == {ana.id}

    # 4. Marcar una notificación individual como leída vía PATCH
    res_read = client.patch(
        f"/api/notifications/{notif1.id}/read",
        headers=auth_headers,
        json={"is_read": True},
    )
    assert res_read.status_code == 200
    assert res_read.json()["is_read"] is True

    # 5. Marcar todas las notificaciones como leídas vía POST
    res_mark_all = client.post("/api/notifications/mark-all-read", headers=auth_headers)
    assert res_mark_all.status_code == 200
    data_all = res_mark_all.json()
    assert data_all["updated"] is True
    assert data_all["count"] >= 1

    # 6. Comprobar que en GET todas figuran leídas
    res_after = client.get("/api/notifications", headers=auth_headers)
    assert res_after.status_code == 200
    for n in res_after.json():
        if n["id"] in (notif1.id, notif2.id):
            assert n["is_read"] is True


def test_attachments_and_notifications_auth_protection(client: TestClient) -> None:
    """Verifica que endpoints protegidos exijan autenticación JWT."""
    assert client.get("/api/items/1/attachments").status_code == 401
    assert client.post("/api/items/1/attachments", json={"filename": "a.txt", "file_size": 10}).status_code == 401
    assert client.delete("/api/attachments/1").status_code == 401
    assert client.get("/api/notifications").status_code == 401
    assert client.patch("/api/notifications/1/read").status_code == 401
    assert client.post("/api/notifications/mark-all-read").status_code == 401
