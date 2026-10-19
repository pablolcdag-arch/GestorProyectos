"""Pruebas automatizadas para Comentarios, Checklist Interno e Historial de Actividad por Tarea."""

from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import TaskActivityLog, TaskChecklistItem, TaskComment


def test_automatic_activity_log_on_item_lifecycle(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    """Verifica el registro automático de actividad al crear y editar celdas de una tarea."""
    workspaces = client.get("/api/workspaces", headers=auth_headers).json()
    board_id = workspaces[0]["boards"][0]["id"]
    board = client.get(f"/api/boards/{board_id}", headers=auth_headers).json()
    group_id = board["groups"][0]["id"]

    users = client.get("/api/users", headers=auth_headers).json()
    carlos_id = next(u["id"] for u in users if u["email"] == "carlos@gestor.dev")

    # 1. Crear tarea -> debe registrar item_created
    res_create = client.post(
        f"/api/groups/{group_id}/items",
        headers=auth_headers,
        json={"title": "Implementar vista Kanban con drag and drop"},
    )
    assert res_create.status_code == 201
    item_id = res_create.json()["id"]

    # 2. Editar estado, prioridad, responsable y título mediante PATCH
    assert (
        client.patch(
            f"/api/items/{item_id}",
            headers=auth_headers,
            json={
                "status_key": "in_progress",
                "priority": "high",
                "assignee_id": carlos_id,
                "title": "Vista Kanban Interactiva",
            },
        ).status_code
        == 200
    )

    # 3. Consultar detalle enriquecido de la tarea
    res_detail = client.get(f"/api/items/{item_id}/detail", headers=auth_headers)
    assert res_detail.status_code == 200
    detail = res_detail.json()

    actions = [act["action"] for act in detail["activities"]]
    assert "item_created" in actions
    assert "status_changed" in actions
    assert "priority_changed" in actions
    assert "assignee_changed" in actions
    assert "title_changed" in actions

    for act in detail["activities"]:
        assert act["user"] is not None
        assert act["user"]["email"] == "ana@gestor.dev"
        assert act["description"]


def test_task_comments_lifecycle_and_counters(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    """Verifica creación, validación de texto vacío, contadores y eliminación de comentarios."""
    workspaces = client.get("/api/workspaces", headers=auth_headers).json()
    board_id = workspaces[0]["boards"][0]["id"]
    board = client.get(f"/api/boards/{board_id}", headers=auth_headers).json()

    # Usamos la segunda tarea del primer grupo (que empieza con 0 comentarios)
    target_item = board["groups"][0]["items"][1]
    item_id = target_item["id"]
    assert target_item["comments_count"] == 0

    # 1. Rechazar comentario vacío -> 422
    res_empty = client.post(
        f"/api/items/{item_id}/comments",
        headers=auth_headers,
        json={"content": "   "},
    )
    assert res_empty.status_code == 422

    # 2. Publicar 2 comentarios válidos
    res_c1 = client.post(
        f"/api/items/{item_id}/comments",
        headers=auth_headers,
        json={"content": "Primer comentario de revisión técnica."},
    )
    assert res_c1.status_code == 201
    c1 = res_c1.json()
    assert c1["content"] == "Primer comentario de revisión técnica."
    assert c1["author"]["email"] == "ana@gestor.dev"

    res_c2 = client.post(
        f"/api/items/{item_id}/comments",
        headers=auth_headers,
        json={"content": "Segundo comentario con definiciones de UX."},
    )
    assert res_c2.status_code == 201
    c2 = res_c2.json()

    # 3. Verificar comments_count en GET /api/items/{item_id}/detail y GET /api/boards/{board_id}
    detail = client.get(f"/api/items/{item_id}/detail", headers=auth_headers).json()
    assert detail["comments_count"] == 2
    assert len(detail["comments"]) == 2
    assert any(a["action"] == "comment_added" for a in detail["activities"])

    board_after = client.get(f"/api/boards/{board_id}", headers=auth_headers).json()
    item_in_board = next(
        it
        for grp in board_after["groups"]
        for it in grp["items"]
        if it["id"] == item_id
    )
    assert item_in_board["comments_count"] == 2

    # 4. Eliminar un comentario y verificar decremento del contador
    res_del = client.delete(f"/api/comments/{c1['id']}", headers=auth_headers)
    assert res_del.status_code == 200
    assert res_del.json() == {"deleted": True, "id": c1["id"]}

    detail_after_del = client.get(
        f"/api/items/{item_id}/detail", headers=auth_headers
    ).json()
    assert detail_after_del["comments_count"] == 1
    assert detail_after_del["comments"][0]["id"] == c2["id"]


def test_task_checklist_lifecycle_and_counters(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    """Verifica alta, edición, marcado de completado, contadores y baja en checklist interno."""
    workspaces = client.get("/api/workspaces", headers=auth_headers).json()
    board_id = workspaces[0]["boards"][0]["id"]
    board = client.get(f"/api/boards/{board_id}", headers=auth_headers).json()

    target_item = board["groups"][0]["items"][1]
    item_id = target_item["id"]
    assert target_item["checklist_total"] == 0
    assert target_item["checklist_completed"] == 0

    # 1. Agregar 2 ítems al checklist
    res_chk1 = client.post(
        f"/api/items/{item_id}/checklist",
        headers=auth_headers,
        json={"title": "Definir índices en tablas"},
    )
    assert res_chk1.status_code == 201
    chk1 = res_chk1.json()
    assert chk1["is_completed"] is False
    assert chk1["position"] == 0

    res_chk2 = client.post(
        f"/api/items/{item_id}/checklist",
        headers=auth_headers,
        json={"title": "Escribir pruebas unitarias"},
    )
    assert res_chk2.status_code == 201
    chk2 = res_chk2.json()
    assert chk2["position"] == 1

    # 2. Marcar el primero como completado y renombrarlo
    res_patch = client.patch(
        f"/api/checklist/{chk1['id']}",
        headers=auth_headers,
        json={"title": "Definir índices y claves foráneas", "is_completed": True},
    )
    assert res_patch.status_code == 200
    updated_chk1 = res_patch.json()
    assert updated_chk1["title"] == "Definir índices y claves foráneas"
    assert updated_chk1["is_completed"] is True

    # 3. Verificar checklist_total=2 y checklist_completed=1 en el detalle y en el tablero
    detail = client.get(f"/api/items/{item_id}/detail", headers=auth_headers).json()
    assert detail["checklist_total"] == 2
    assert detail["checklist_completed"] == 1
    assert any(a["action"] == "checklist_updated" for a in detail["activities"])

    board_after = client.get(f"/api/boards/{board_id}", headers=auth_headers).json()
    item_in_board = next(
        it
        for grp in board_after["groups"]
        for it in grp["items"]
        if it["id"] == item_id
    )
    assert item_in_board["checklist_total"] == 2
    assert item_in_board["checklist_completed"] == 1

    # 4. Eliminar el segundo ítem del checklist
    res_del = client.delete(f"/api/checklist/{chk2['id']}", headers=auth_headers)
    assert res_del.status_code == 200

    detail_after = client.get(
        f"/api/items/{item_id}/detail", headers=auth_headers
    ).json()
    assert detail_after["checklist_total"] == 1
    assert detail_after["checklist_completed"] == 1


def test_cascade_delete_item_cleans_comments_checklist_and_activities(
    client: TestClient, auth_headers: dict[str, str], db_session: Session
) -> None:
    """Verifica que al eliminar una tarea se borren en cascada sus comentarios, checklist y actividades."""
    workspaces = client.get("/api/workspaces", headers=auth_headers).json()
    board_id = workspaces[0]["boards"][0]["id"]
    board = client.get(f"/api/boards/{board_id}", headers=auth_headers).json()

    # La primera tarea del tablero tiene datos semilla de comentarios, checklist y actividad
    seeded_item = board["groups"][0]["items"][0]
    item_id = seeded_item["id"]
    assert seeded_item["comments_count"] >= 2
    assert seeded_item["checklist_total"] >= 3

    # Eliminar la tarea
    res_del = client.delete(f"/api/items/{item_id}", headers=auth_headers)
    assert res_del.status_code == 200

    # Verificar que GET /api/items/{item_id}/detail devuelva 404 y que no queden registros huérfanos en DB
    assert client.get(f"/api/items/{item_id}/detail", headers=auth_headers).status_code == 404
    assert db_session.query(TaskComment).filter(TaskComment.item_id == item_id).count() == 0
    assert (
        db_session.query(TaskChecklistItem)
        .filter(TaskChecklistItem.item_id == item_id)
        .count()
        == 0
    )
    assert (
        db_session.query(TaskActivityLog)
        .filter(TaskActivityLog.item_id == item_id)
        .count()
        == 0
    )

