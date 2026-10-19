"""Pruebas automatizadas para las funcionalidades de Fase 3 del Backend.

Cubre:
1. Vista global 'Mi Trabajo' (/api/my-work) y clasificación en 5 cubetas temporales.
2. CRUD completo de reglas de automatización (/api/boards/{board_id}/automations).
3. Disparo de automatización: when_checklist_complete_set_status.
4. Disparo de automatización: when_status_done_complete_checklist.
5. Disparo de automatización: when_status_blocked_log_alert.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient


def test_my_work_global_view_and_temporal_buckets(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    """Verifica que /api/my-work clasifique con precisión las tareas en las 5 secciones temporales."""
    # Obtener el usuario autenticado (Ana García)
    me_res = client.get("/api/auth/me", headers=auth_headers)
    assert me_res.status_code == 200
    ana_id = me_res.json()["id"]

    workspaces = client.get("/api/workspaces", headers=auth_headers).json()
    board_id = workspaces[0]["boards"][0]["id"]
    board = client.get(f"/api/boards/{board_id}", headers=auth_headers).json()
    group_id = board["groups"][0]["id"]

    today = datetime.now(timezone.utc).date()
    yesterday = (today - timedelta(days=2)).isoformat()
    today_str = today.isoformat()
    in_three_days = (today + timedelta(days=3)).isoformat()
    next_month = (today + timedelta(days=25)).isoformat()

    # Crear 5 tareas con diferentes fechas y estados asignadas a Ana
    t_overdue = client.post(
        f"/api/groups/{group_id}/items",
        headers=auth_headers,
        json={
            "title": "Tarea Vencida de Prueba",
            "assignee_id": ana_id,
            "due_date": yesterday,
            "status_key": "in_progress",
        },
    ).json()

    t_today = client.post(
        f"/api/groups/{group_id}/items",
        headers=auth_headers,
        json={
            "title": "Tarea Para Hoy",
            "assignee_id": ana_id,
            "due_date": today_str,
            "status_key": "not_started",
        },
    ).json()

    t_this_week = client.post(
        f"/api/groups/{group_id}/items",
        headers=auth_headers,
        json={
            "title": "Tarea Esta Semana",
            "assignee_id": ana_id,
            "due_date": in_three_days,
            "status_key": "in_progress",
        },
    ).json()

    t_upcoming = client.post(
        f"/api/groups/{group_id}/items",
        headers=auth_headers,
        json={
            "title": "Tarea Próxima Mes Siguiente",
            "assignee_id": ana_id,
            "due_date": next_month,
            "status_key": "not_started",
        },
    ).json()

    t_completed = client.post(
        f"/api/groups/{group_id}/items",
        headers=auth_headers,
        json={
            "title": "Tarea Ya Terminada",
            "assignee_id": ana_id,
            "due_date": yesterday,  # aunque la fecha esté en el pasado, está done
            "status_key": "done",
        },
    ).json()

    res_my_work = client.get("/api/my-work", headers=auth_headers)
    assert res_my_work.status_code == 200
    my_work = res_my_work.json()

    summary = my_work["summary"]
    assert summary["total_assigned"] >= 5

    # Validar presencia de nuestras tareas en sus cubetas correspondientes
    overdue_ids = [it["id"] for it in my_work["overdue"]]
    assert t_overdue["id"] in overdue_ids

    today_ids = [it["id"] for it in my_work["today"]]
    assert t_today["id"] in today_ids

    this_week_ids = [it["id"] for it in my_work["this_week"]]
    assert t_this_week["id"] in this_week_ids

    upcoming_ids = [it["id"] for it in my_work["upcoming_or_no_date"]]
    assert t_upcoming["id"] in upcoming_ids

    completed_ids = [it["id"] for it in my_work["completed"]]
    assert t_completed["id"] in completed_ids

    # Validar campos enriquecidos (board_name, workspace_id, workspace_name, group_title, group_color)
    sample_item = next(it for it in my_work["overdue"] if it["id"] == t_overdue["id"])
    assert sample_item["board_name"] == board["name"]
    assert sample_item["workspace_id"] == workspaces[0]["id"]
    assert sample_item["workspace_name"] == workspaces[0]["name"]
    assert sample_item["group_title"] == "Esta Semana"
    assert sample_item["group_color"] == "#579bfc"

    # Validar consistencia matemática del summary
    assert summary["overdue_count"] == len(my_work["overdue"])
    assert summary["today_count"] == len(my_work["today"])
    assert summary["this_week_count"] == len(my_work["this_week"])
    assert summary["upcoming_count"] == len(my_work["upcoming_or_no_date"])
    assert summary["completed_count"] == len(my_work["completed"])
    assert summary["total_assigned"] == (
        summary["overdue_count"]
        + summary["today_count"]
        + summary["this_week_count"]
        + summary["upcoming_count"]
        + summary["completed_count"]
    )


def test_board_automations_crud_lifecycle(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    """Verifica el ciclo de vida CRUD de reglas de automatización en un tablero."""
    workspaces = client.get("/api/workspaces", headers=auth_headers).json()
    board_id = workspaces[0]["boards"][0]["id"]

    # 1. Consultar reglas del tablero semilla (debe incluir las 3 recetas por defecto)
    res_list = client.get(f"/api/boards/{board_id}/automations", headers=auth_headers)
    assert res_list.status_code == 200
    automations = res_list.json()
    assert len(automations) >= 3
    rule_types = [a["rule_type"] for a in automations]
    assert "when_checklist_complete_set_status" in rule_types
    assert "when_status_done_complete_checklist" in rule_types
    assert "when_status_blocked_log_alert" in rule_types

    # 2. Crear / reemplazar una regla mediante POST
    res_post = client.post(
        f"/api/boards/{board_id}/automations",
        headers=auth_headers,
        json={
            "rule_type": "when_checklist_complete_set_status",
            "target_status_key": "done",
            "is_active": True,
        },
    )
    assert res_post.status_code in (200, 201)
    rule = res_post.json()
    rule_id = rule["id"]
    assert rule["rule_type"] == "when_checklist_complete_set_status"
    assert rule["is_active"] is True

    # 3. Desactivar la regla mediante PATCH
    res_patch = client.patch(
        f"/api/automations/{rule_id}",
        headers=auth_headers,
        json={"is_active": False},
    )
    assert res_patch.status_code == 200
    assert res_patch.json()["is_active"] is False

    # 4. Eliminar la regla mediante DELETE
    res_del = client.delete(f"/api/automations/{rule_id}", headers=auth_headers)
    assert res_del.status_code == 200
    assert res_del.json() == {"deleted": True, "id": rule_id}

    # 5. Verificar que ya no existe (404 al consultar o actualizar)
    assert (
        client.patch(
            f"/api/automations/{rule_id}",
            headers=auth_headers,
            json={"is_active": True},
        ).status_code
        == 404
    )


def test_automation_when_checklist_complete_set_status(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    """Verifica que al completar el 100% del checklist, el estado de la tarea cambie a 'done' automáticamente."""
    workspaces = client.get("/api/workspaces", headers=auth_headers).json()
    board_id = workspaces[0]["boards"][0]["id"]
    board = client.get(f"/api/boards/{board_id}", headers=auth_headers).json()
    group_id = board["groups"][0]["id"]

    # Asegurar que la automatización esté activa
    client.post(
        f"/api/boards/{board_id}/automations",
        headers=auth_headers,
        json={
            "rule_type": "when_checklist_complete_set_status",
            "target_status_key": "done",
            "is_active": True,
        },
    )

    # Crear una tarea en estado in_progress con 2 subtareas pendientes
    task = client.post(
        f"/api/groups/{group_id}/items",
        headers=auth_headers,
        json={
            "title": "Tarea de Automatización Checklist",
            "status_key": "in_progress",
        },
    ).json()
    task_id = task["id"]

    chk1 = client.post(
        f"/api/items/{task_id}/checklist",
        headers=auth_headers,
        json={"title": "Subtarea 1", "is_completed": False},
    ).json()

    chk2 = client.post(
        f"/api/items/{task_id}/checklist",
        headers=auth_headers,
        json={"title": "Subtarea 2", "is_completed": False},
    ).json()

    # Completar la primera subtarea -> la tarea aún NO debe cambiar a done
    client.patch(
        f"/api/checklist/{chk1['id']}",
        headers=auth_headers,
        json={"is_completed": True},
    )
    detail_mid = client.get(f"/api/items/{task_id}/detail", headers=auth_headers).json()
    assert detail_mid["status_key"] == "in_progress"

    # Completar la segunda subtarea (100% completado) -> DEBE disparar la automatización a 'done'
    client.patch(
        f"/api/checklist/{chk2['id']}",
        headers=auth_headers,
        json={"is_completed": True},
    )
    detail_after = client.get(f"/api/items/{task_id}/detail", headers=auth_headers).json()
    assert detail_after["status_key"] == "done"

    # Verificar registro en el historial de actividad
    activities = detail_after["activities"]
    assert any(
        a["action"] == "automation_executed"
        and "se completó el 100% del checklist" in a["description"]
        for a in activities
    )


def test_automation_when_status_done_complete_checklist(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    """Verifica que al marcar una tarea como 'done', todos sus ítems de checklist se marquen como completados."""
    workspaces = client.get("/api/workspaces", headers=auth_headers).json()
    board_id = workspaces[0]["boards"][0]["id"]
    board = client.get(f"/api/boards/{board_id}", headers=auth_headers).json()
    group_id = board["groups"][0]["id"]

    # Asegurar que la automatización esté activa
    client.post(
        f"/api/boards/{board_id}/automations",
        headers=auth_headers,
        json={
            "rule_type": "when_status_done_complete_checklist",
            "target_status_key": "done",
            "is_active": True,
        },
    )

    # Crear una tarea con 2 subtareas pendientes
    task = client.post(
        f"/api/groups/{group_id}/items",
        headers=auth_headers,
        json={
            "title": "Tarea de Automatización Marcar Done",
            "status_key": "in_progress",
        },
    ).json()
    task_id = task["id"]

    client.post(
        f"/api/items/{task_id}/checklist",
        headers=auth_headers,
        json={"title": "Check A", "is_completed": False},
    )
    client.post(
        f"/api/items/{task_id}/checklist",
        headers=auth_headers,
        json={"title": "Check B", "is_completed": False},
    )

    # Cambiar el estado a 'done' mediante PATCH
    res_patch = client.patch(
        f"/api/items/{task_id}",
        headers=auth_headers,
        json={"status_key": "done"},
    )
    assert res_patch.status_code == 200

    # Consultar detalle: ambas subtareas deben estar is_completed=True
    detail = client.get(f"/api/items/{task_id}/detail", headers=auth_headers).json()
    assert detail["status_key"] == "done"
    assert detail["checklist_total"] == 2
    assert detail["checklist_completed"] == 2
    assert all(chk["is_completed"] is True for chk in detail["checklist_items"])

    activities = detail["activities"]
    assert any(
        a["action"] == "automation_executed"
        and "Marcó todos los ítems de checklist como completados" in a["description"]
        for a in activities
    )


def test_automation_when_status_blocked_log_alert(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    """Verifica que al marcar una tarea como 'blocked', se registre la alerta en TaskActivityLog."""
    workspaces = client.get("/api/workspaces", headers=auth_headers).json()
    board_id = workspaces[0]["boards"][0]["id"]
    board = client.get(f"/api/boards/{board_id}", headers=auth_headers).json()
    group_id = board["groups"][0]["id"]

    # Asegurar que la automatización esté activa
    client.post(
        f"/api/boards/{board_id}/automations",
        headers=auth_headers,
        json={
            "rule_type": "when_status_blocked_log_alert",
            "target_status_key": "done",
            "is_active": True,
        },
    )

    # Crear una tarea
    task = client.post(
        f"/api/groups/{group_id}/items",
        headers=auth_headers,
        json={
            "title": "Tarea para Probar Alerta de Bloqueo",
            "status_key": "in_progress",
        },
    ).json()
    task_id = task["id"]

    # Cambiar el estado a 'blocked'
    res_patch = client.patch(
        f"/api/items/{task_id}",
        headers=auth_headers,
        json={"status_key": "blocked"},
    )
    assert res_patch.status_code == 200

    # Consultar detalle e historial de actividad
    detail = client.get(f"/api/items/{task_id}/detail", headers=auth_headers).json()
    assert detail["status_key"] == "blocked"

    activities = detail["activities"]
    assert any(
        a["action"] == "automation_alert"
        and "ALERTA de Automatización" in a["description"]
        for a in activities
    )
