"""Pruebas automatizadas para Workspaces, Boards, Semilla y Estados Personalizables."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_seed_workspaces_and_boards(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    """Verifica que los datos semilla creen los 2 workspaces, sus tableros, grupos y tareas."""
    res = client.get("/api/workspaces", headers=auth_headers)
    assert res.status_code == 200
    workspaces = res.json()
    assert len(workspaces) == 2

    names = [ws["name"] for ws in workspaces]
    assert "Espacio Principal" in names
    assert "Marketing & Crecimiento" in names

    ws_main = next(ws for ws in workspaces if ws["name"] == "Espacio Principal")
    assert len(ws_main["boards"]) == 1
    roadmap_summary = ws_main["boards"][0]
    assert roadmap_summary["name"] == "Roadmap de Producto Q4"

    # Consultar detalle completo del tablero semilla
    board_res = client.get(
        f"/api/boards/{roadmap_summary['id']}", headers=auth_headers
    )
    assert board_res.status_code == 200
    board_detail = board_res.json()

    # Verificar los 5 estados iniciales por defecto
    statuses = board_detail["statuses"]
    assert len(statuses) == 5
    assert [s["label"] for s in statuses] == [
        "Listo",
        "En Proceso",
        "Bloqueado",
        "Traspasado",
        "Sin Empezar",
    ]
    assert [s["color"] for s in statuses] == [
        "#00c875",
        "#fdab3d",
        "#e2445c",
        "#a25ddc",
        "#c4c4c4",
    ]

    # Verificar los 3 grupos y al menos 6 tareas con sus responsables
    groups = board_detail["groups"]
    assert len(groups) == 3
    assert [g["title"] for g in groups] == [
        "Esta Semana",
        "En Progreso",
        "Completadas",
    ]
    total_items = sum(len(g["items"]) for g in groups)
    assert total_items >= 6
    first_item = groups[0]["items"][0]
    assert first_item["assignee"] is not None
    assert "email" in first_item["assignee"]


def test_workspace_crud_and_validations(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    """Verifica creación, edición, validación de nombre vacío/color y borrado de Workspaces."""
    # Validación de nombre vacío -> 422
    res_empty = client.post(
        "/api/workspaces",
        headers=auth_headers,
        json={"name": "   ", "color": "#0073ea"},
    )
    assert res_empty.status_code == 422

    # Validación de color hex inválido -> 422
    res_bad_color = client.post(
        "/api/workspaces",
        headers=auth_headers,
        json={"name": "Operaciones", "color": "azul"},
    )
    assert res_bad_color.status_code == 422

    # Creación exitosa
    res_create = client.post(
        "/api/workspaces",
        headers=auth_headers,
        json={
            "name": "  Operaciones & Finanzas  ",
            "description": "Control presupuestario",
            "icon": "Folder",
            "color": "#A25DDC",
        },
    )
    assert res_create.status_code == 201
    created = res_create.json()
    ws_id = created["id"]
    assert created["name"] == "Operaciones & Finanzas"
    assert created["color"] == "#a25ddc"

    # Edición exitosa (PATCH)
    res_patch = client.patch(
        f"/api/workspaces/{ws_id}",
        headers=auth_headers,
        json={"name": "Operaciones Globales", "color": "#00c875"},
    )
    assert res_patch.status_code == 200
    patched = res_patch.json()
    assert patched["name"] == "Operaciones Globales"
    assert patched["color"] == "#00c875"

    # PATCH a un workspace inexistente -> 404
    res_404 = client.patch(
        "/api/workspaces/99999",
        headers=auth_headers,
        json={"name": "No Existe"},
    )
    assert res_404.status_code == 404

    # Eliminación exitosa
    res_del = client.delete(f"/api/workspaces/{ws_id}", headers=auth_headers)
    assert res_del.status_code in (200, 204)

    # Verificar que ya no aparece en el listado
    remaining_ids = [
        w["id"] for w in client.get("/api/workspaces", headers=auth_headers).json()
    ]
    assert ws_id not in remaining_ids


def test_create_update_delete_board_with_default_statuses_and_groups(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    """Verifica que un nuevo tablero nazca con los 5 estados por defecto y 2 grupos iniciales."""
    workspaces = client.get("/api/workspaces", headers=auth_headers).json()
    ws_id = workspaces[0]["id"]

    # Crear tablero en workspace inexistente -> 404
    res_bad_ws = client.post(
        "/api/boards",
        headers=auth_headers,
        json={"workspace_id": 99999, "name": "Tablero Huérfano"},
    )
    assert res_bad_ws.status_code == 404

    # Crear tablero válido
    res_board = client.post(
        "/api/boards",
        headers=auth_headers,
        json={
            "workspace_id": ws_id,
            "name": "Sprint 1 Backlog",
            "description": "Entregables del primer sprint",
        },
    )
    assert res_board.status_code == 201
    board = res_board.json()
    board_id = board["id"]
    assert board["name"] == "Sprint 1 Backlog"

    # Verificar 5 estados por defecto
    statuses = board["statuses"]
    assert len(statuses) == 5
    expected_statuses = [
        ("done", "Listo", "#00c875", 0),
        ("in_progress", "En Proceso", "#fdab3d", 1),
        ("blocked", "Bloqueado", "#e2445c", 2),
        ("handed_over", "Traspasado", "#a25ddc", 3),
        ("not_started", "Sin Empezar", "#c4c4c4", 4),
    ]
    for idx, (exp_key, exp_label, exp_color, exp_pos) in enumerate(expected_statuses):
        assert statuses[idx]["key"] == exp_key
        assert statuses[idx]["label"] == exp_label
        assert statuses[idx]["color"] == exp_color
        assert statuses[idx]["position"] == exp_pos

    # Verificar 2 grupos iniciales por defecto
    groups = board["groups"]
    assert len(groups) == 2
    assert groups[0]["title"] == "Esta Semana"
    assert groups[0]["color"] == "#579bfc"
    assert groups[1]["title"] == "En Progreso"
    assert groups[1]["color"] == "#a25ddc"

    # Editar nombre y descripción del tablero
    res_patch = client.patch(
        f"/api/boards/{board_id}",
        headers=auth_headers,
        json={"name": "Sprint 1A Finalizado", "description": "Actualizado"},
    )
    assert res_patch.status_code == 200
    assert res_patch.json()["name"] == "Sprint 1A Finalizado"

    # Eliminar el tablero
    res_del = client.delete(f"/api/boards/{board_id}", headers=auth_headers)
    assert res_del.status_code in (200, 204)
    assert client.get(f"/api/boards/{board_id}", headers=auth_headers).status_code == 404


def test_custom_board_statuses_lifecycle_and_reassignment(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    """Verifica alta, edición, validación hex, reasignación de tareas al borrar estado y protección del último estado."""
    workspaces = client.get("/api/workspaces", headers=auth_headers).json()
    board_id = workspaces[0]["boards"][0]["id"]

    # 1. Agregar un 6° estado personalizado
    res_add = client.post(
        f"/api/boards/{board_id}/statuses",
        headers=auth_headers,
        json={"label": "En Revisión QA", "color": "#579bfc"},
    )
    assert res_add.status_code == 201
    custom_status = res_add.json()
    assert custom_status["label"] == "En Revisión QA"
    assert custom_status["color"] == "#579bfc"
    assert custom_status["key"] == "en_revision_qa"
    assert custom_status["position"] == 5

    # 2. Rechazar color inválido con 422
    res_invalid_color = client.post(
        f"/api/boards/{board_id}/statuses",
        headers=auth_headers,
        json={"label": "Estado Malo", "color": "123456"},
    )
    assert res_invalid_color.status_code == 422

    res_invalid_patch = client.patch(
        f"/api/boards/{board_id}/statuses/{custom_status['id']}",
        headers=auth_headers,
        json={"color": "#GGGGGG"},
    )
    assert res_invalid_patch.status_code == 422

    # 3. Editar etiqueta y color hex de un estado existente
    res_patch = client.patch(
        f"/api/boards/{board_id}/statuses/{custom_status['id']}",
        headers=auth_headers,
        json={"label": "Aprobado por QA", "color": "#00c875", "position": 10},
    )
    assert res_patch.status_code == 200
    updated_st = res_patch.json()
    assert updated_st["label"] == "Aprobado por QA"
    assert updated_st["color"] == "#00c875"
    assert updated_st["position"] == 10

    # 4. Eliminar el estado "in_progress" (usado por tareas semilla) y verificar que se reasignen al primer estado disponible ("done")
    board_before = client.get(f"/api/boards/{board_id}", headers=auth_headers).json()
    in_progress_st = next(
        s for s in board_before["statuses"] if s["key"] == "in_progress"
    )
    first_available_key = next(
        s["key"] for s in board_before["statuses"] if s["id"] != in_progress_st["id"]
    )

    items_in_progress_before = [
        item["id"]
        for grp in board_before["groups"]
        for item in grp["items"]
        if item["status_key"] == "in_progress"
    ]
    assert len(items_in_progress_before) > 0

    res_del_st = client.delete(
        f"/api/boards/{board_id}/statuses/{in_progress_st['id']}",
        headers=auth_headers,
    )
    assert res_del_st.status_code == 200
    del_data = res_del_st.json()
    assert del_data["reassigned_to_key"] == first_available_key

    board_after = client.get(f"/api/boards/{board_id}", headers=auth_headers).json()
    items_by_id = {
        item["id"]: item
        for grp in board_after["groups"]
        for item in grp["items"]
    }
    for item_id in items_in_progress_before:
        assert items_by_id[item_id]["status_key"] == first_available_key

    # 5. Eliminar estados restantes hasta que quede 1 e impedir eliminar el último (400 Bad Request)
    remaining_statuses = board_after["statuses"]
    for st in remaining_statuses[:-1]:
        r = client.delete(
            f"/api/boards/{board_id}/statuses/{st['id']}",
            headers=auth_headers,
        )
        assert r.status_code == 200

    last_status = remaining_statuses[-1]
    res_last = client.delete(
        f"/api/boards/{board_id}/statuses/{last_status['id']}",
        headers=auth_headers,
    )
    assert res_last.status_code == 400

