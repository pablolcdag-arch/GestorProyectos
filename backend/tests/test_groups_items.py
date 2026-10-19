"""Pruebas automatizadas para CRUD de TaskGroup, TaskItem y edición inline de celdas."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_task_group_crud_and_cascade_delete(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    """Verifica creación, actualización (título, color, colapso, posición) y borrado en cascada de grupos."""
    workspaces = client.get("/api/workspaces", headers=auth_headers).json()
    board_id = workspaces[0]["boards"][0]["id"]

    # 1. Validación de grupo en tablero inexistente -> 404 y título vacío -> 422
    assert (
        client.post(
            "/api/boards/99999/groups",
            headers=auth_headers,
            json={"title": "Grupo Fantasma"},
        ).status_code
        == 404
    )
    assert (
        client.post(
            f"/api/boards/{board_id}/groups",
            headers=auth_headers,
            json={"title": "   ", "color": "#579bfc"},
        ).status_code
        == 422
    )

    # 2. Crear un nuevo grupo en el tablero
    res_create = client.post(
        f"/api/boards/{board_id}/groups",
        headers=auth_headers,
        json={"title": "  Backlog Q1  ", "color": "#FDAB3D"},
    )
    assert res_create.status_code == 201
    group = res_create.json()
    group_id = group["id"]
    assert group["title"] == "Backlog Q1"
    assert group["color"] == "#fdab3d"
    assert group["collapsed"] is False
    assert group["position"] == 3  # Después de los 3 grupos semilla (0, 1, 2)
    assert group["items"] == []

    # 3. Crear una tarea dentro del grupo para verificar luego el borrado en cascada
    res_item = client.post(
        f"/api/groups/{group_id}/items",
        headers=auth_headers,
        json={"title": "Tarea efímera dentro del grupo"},
    )
    assert res_item.status_code == 201
    item_id = res_item.json()["id"]

    # 4. Actualizar título, color y estado colapsado del grupo
    res_patch = client.patch(
        f"/api/groups/{group_id}",
        headers=auth_headers,
        json={
            "title": "Backlog Priorizado",
            "color": "#e2445c",
            "collapsed": True,
            "position": 5,
        },
    )
    assert res_patch.status_code == 200
    updated_grp = res_patch.json()
    assert updated_grp["title"] == "Backlog Priorizado"
    assert updated_grp["color"] == "#e2445c"
    assert updated_grp["collapsed"] is True
    assert updated_grp["position"] == 5
    assert len(updated_grp["items"]) == 1

    # 5. Eliminar el grupo y verificar que la tarea hija también se eliminó en cascada
    res_del = client.delete(f"/api/groups/{group_id}", headers=auth_headers)
    assert res_del.status_code == 200
    assert res_del.json()["deleted"] is True

    assert client.patch(f"/api/groups/{group_id}", headers=auth_headers, json={"title": "X"}).status_code == 404
    assert client.patch(f"/api/items/{item_id}", headers=auth_headers, json={"title": "X"}).status_code == 404


def test_task_item_creation_defaults_and_explicit_fields(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    """Verifica creación de tareas con valores por defecto y con campos explícitos validados."""
    workspaces = client.get("/api/workspaces", headers=auth_headers).json()
    board_id = workspaces[0]["boards"][0]["id"]
    board = client.get(f"/api/boards/{board_id}", headers=auth_headers).json()
    group_id = board["groups"][0]["id"]

    users = client.get("/api/users", headers=auth_headers).json()
    carlos_id = next(u["id"] for u in users if u["email"] == "carlos@gestor.dev")

    # 1. Crear tarea con valores por defecto
    res_default = client.post(
        f"/api/groups/{group_id}/items",
        headers=auth_headers,
        json={"title": "  Nueva tarea rápida  "},
    )
    assert res_default.status_code == 201
    default_item = res_default.json()
    assert default_item["title"] == "Nueva tarea rápida"
    assert default_item["status_key"] == "not_started"
    assert default_item["priority"] == "medium"
    assert default_item["assignee_id"] is None
    assert default_item["assignee"] is None
    assert default_item["due_date"] is None
    assert default_item["notes"] == ""

    # 2. Crear tarea con estado, prioridad, responsable y fecha límite explícitos
    res_explicit = client.post(
        f"/api/groups/{group_id}/items",
        headers=auth_headers,
        json={
            "title": "Lanzar versión beta privada",
            "status_key": "in_progress",
            "priority": "critical",
            "assignee_id": carlos_id,
            "due_date": "2026-11-15",
            "notes": "Coordinar con el equipo de soporte.",
        },
    )
    assert res_explicit.status_code == 201
    exp_item = res_explicit.json()
    assert exp_item["title"] == "Lanzar versión beta privada"
    assert exp_item["status_key"] == "in_progress"
    assert exp_item["priority"] == "critical"
    assert exp_item["assignee_id"] == carlos_id
    assert exp_item["assignee"]["email"] == "carlos@gestor.dev"
    assert exp_item["due_date"] == "2026-11-15"
    assert exp_item["notes"] == "Coordinar con el equipo de soporte."

    # 3. Rechazar status_key inexistente en el tablero al crear -> 400
    res_bad_status = client.post(
        f"/api/groups/{group_id}/items",
        headers=auth_headers,
        json={"title": "Tarea con estado falso", "status_key": "no_existe_en_tablero"},
    )
    assert res_bad_status.status_code == 400


def test_task_item_inline_patch_all_columns_and_validations(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    """Verifica la edición inline parcial (PATCH /api/items/{item_id}) de todas las celdas y sus validaciones."""
    workspaces = client.get("/api/workspaces", headers=auth_headers).json()
    board_1_id = workspaces[0]["boards"][0]["id"]
    board_2_id = workspaces[1]["boards"][0]["id"]

    board_1 = client.get(f"/api/boards/{board_1_id}", headers=auth_headers).json()
    board_2 = client.get(f"/api/boards/{board_2_id}", headers=auth_headers).json()

    group_a_id = board_1["groups"][0]["id"]
    group_b_id = board_1["groups"][1]["id"]
    other_board_group_id = board_2["groups"][0]["id"]

    item_id = board_1["groups"][0]["items"][0]["id"]

    users = client.get("/api/users", headers=auth_headers).json()
    lucia_id = next(u["id"] for u in users if u["email"] == "lucia@gestor.dev")

    # 1. Renombrar tarea (title)
    res_title = client.patch(
        f"/api/items/{item_id}",
        headers=auth_headers,
        json={"title": "  Título Editado Inline  "},
    )
    assert res_title.status_code == 200
    assert res_title.json()["title"] == "Título Editado Inline"

    # 2. Cambiar status_key a estados válidos ("handed_over", "done") y rechazar estado inexistente (400)
    res_status = client.patch(
        f"/api/items/{item_id}",
        headers=auth_headers,
        json={"status_key": "handed_over"},
    )
    assert res_status.status_code == 200
    assert res_status.json()["status_key"] == "handed_over"

    res_bad_status = client.patch(
        f"/api/items/{item_id}",
        headers=auth_headers,
        json={"status_key": "estado_inventado"},
    )
    assert res_bad_status.status_code == 400

    # 3. Cambiar priority a "critical", "high", "low" y rechazar prioridad inválida (422)
    for valid_prio in ("critical", "high", "low"):
        res_prio = client.patch(
            f"/api/items/{item_id}",
            headers=auth_headers,
            json={"priority": valid_prio},
        )
        assert res_prio.status_code == 200
        assert res_prio.json()["priority"] == valid_prio

    res_bad_prio = client.patch(
        f"/api/items/{item_id}",
        headers=auth_headers,
        json={"priority": "urgentisima"},
    )
    assert res_bad_prio.status_code == 422

    # 4. Asignar assignee_id válido y luego desasignarlo con {"assignee_id": null}
    res_assign = client.patch(
        f"/api/items/{item_id}",
        headers=auth_headers,
        json={"assignee_id": lucia_id},
    )
    assert res_assign.status_code == 200
    assert res_assign.json()["assignee_id"] == lucia_id
    assert res_assign.json()["assignee"]["email"] == "lucia@gestor.dev"

    res_unassign = client.patch(
        f"/api/items/{item_id}",
        headers=auth_headers,
        json={"assignee_id": None},
    )
    assert res_unassign.status_code == 200
    assert res_unassign.json()["assignee_id"] is None
    assert res_unassign.json()["assignee"] is None

    # 5. Asignar due_date válido, rechazar fechas inválidas (422) y limpiar con null y ""
    res_date = client.patch(
        f"/api/items/{item_id}",
        headers=auth_headers,
        json={"due_date": "2026-12-31"},
    )
    assert res_date.status_code == 200
    assert res_date.json()["due_date"] == "2026-12-31"

    for invalid_date in ("31-12-2026", "2026-02-30", "no-es-fecha"):
        res_bad_date = client.patch(
            f"/api/items/{item_id}",
            headers=auth_headers,
            json={"due_date": invalid_date},
        )
        assert res_bad_date.status_code == 422

    res_clear_null = client.patch(
        f"/api/items/{item_id}",
        headers=auth_headers,
        json={"due_date": None},
    )
    assert res_clear_null.status_code == 200
    assert res_clear_null.json()["due_date"] is None

    # Volver a setear y limpiar con cadena vacía ""
    client.patch(
        f"/api/items/{item_id}",
        headers=auth_headers,
        json={"due_date": "2026-11-20"},
    )
    res_clear_empty = client.patch(
        f"/api/items/{item_id}",
        headers=auth_headers,
        json={"due_date": ""},
    )
    assert res_clear_empty.status_code == 200
    assert res_clear_empty.json()["due_date"] is None

    # 6. Actualizar notes y mover de grupo dentro del mismo tablero, rechazando grupo de otro tablero (400)
    res_move = client.patch(
        f"/api/items/{item_id}",
        headers=auth_headers,
        json={
            "notes": "Nota actualizada en vivo",
            "group_id": group_b_id,
            "position": 9,
        },
    )
    assert res_move.status_code == 200
    moved = res_move.json()
    assert moved["notes"] == "Nota actualizada en vivo"
    assert moved["group_id"] == group_b_id
    assert moved["position"] == 9

    res_cross_board = client.patch(
        f"/api/items/{item_id}",
        headers=auth_headers,
        json={"group_id": other_board_group_id},
    )
    assert res_cross_board.status_code == 400

    # Devolver al grupo original
    res_back = client.patch(
        f"/api/items/{item_id}",
        headers=auth_headers,
        json={"group_id": group_a_id},
    )
    assert res_back.status_code == 200


def test_delete_task_item_and_verify_board(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    """Verifica la eliminación de una tarea y que desaparezca del detalle del tablero."""
    workspaces = client.get("/api/workspaces", headers=auth_headers).json()
    board_id = workspaces[0]["boards"][0]["id"]
    board_before = client.get(f"/api/boards/{board_id}", headers=auth_headers).json()

    target_item_id = board_before["groups"][0]["items"][0]["id"]

    res_del = client.delete(f"/api/items/{target_item_id}", headers=auth_headers)
    assert res_del.status_code == 200
    assert res_del.json() == {"deleted": True, "id": target_item_id}

    # Verificar que un segundo DELETE devuelva 404
    assert client.delete(f"/api/items/{target_item_id}", headers=auth_headers).status_code == 404

    # Verificar en GET /api/boards/{board_id}
    board_after = client.get(f"/api/boards/{board_id}", headers=auth_headers).json()
    all_item_ids = [
        item["id"]
        for grp in board_after["groups"]
        for item in grp["items"]
    ]
    assert target_item_id not in all_item_ids

