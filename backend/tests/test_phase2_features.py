"""Pruebas automatizadas para las funcionalidades de Fase 2 del Backend."""

from __future__ import annotations

import csv
import io

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, text

from app.database import ensure_phase2_schema, ensure_schema_migrations


def test_phase2_numeric_and_timeline_fields_and_activity_log(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    """Verifica creación, edición inline (PATCH), validaciones y auditoría de start_date, estimated_hours y budget."""
    workspaces = client.get("/api/workspaces", headers=auth_headers).json()
    board_id = workspaces[0]["boards"][0]["id"]
    board = client.get(f"/api/boards/{board_id}", headers=auth_headers).json()
    group_id = board["groups"][0]["id"]

    # 1. Crear tarea con campos de Fase 2
    res_create = client.post(
        f"/api/groups/{group_id}/items",
        headers=auth_headers,
        json={
            "title": "Integración de pasarela financiera internacional",
            "status_key": "in_progress",
            "priority": "high",
            "start_date": "2026-10-18",
            "due_date": "2026-10-29",
            "estimated_hours": 18.5,
            "budget": 2750.0,
            "notes": "Fase 2 presupuesto inicial",
        },
    )
    assert res_create.status_code == 201
    created = res_create.json()
    item_id = created["id"]
    assert created["start_date"] == "2026-10-18"
    assert created["due_date"] == "2026-10-29"
    assert created["estimated_hours"] == 18.5
    assert created["budget"] == 2750.0

    # 2. Actualizar start_date, estimated_hours y budget vía PATCH
    res_patch = client.patch(
        f"/api/items/{item_id}",
        headers=auth_headers,
        json={
            "start_date": "2026-10-20",
            "estimated_hours": 24.0,
            "budget": 3400.5,
        },
    )
    assert res_patch.status_code == 200
    patched = res_patch.json()
    assert patched["start_date"] == "2026-10-20"
    assert patched["estimated_hours"] == 24.0
    assert patched["budget"] == 3400.5

    # 3. Verificar en el historial de actividad los eventos registrados
    detail = client.get(f"/api/items/{item_id}/detail", headers=auth_headers).json()
    actions = [act["action"] for act in detail["activities"]]
    assert "start_date_changed" in actions
    assert "hours_changed" in actions
    assert "budget_changed" in actions

    # 4. Limpiar start_date enviando string vacío ""
    res_clear_start = client.patch(
        f"/api/items/{item_id}",
        headers=auth_headers,
        json={"start_date": ""},
    )
    assert res_clear_start.status_code == 200
    assert res_clear_start.json()["start_date"] is None

    # 5. Rechazar valores negativos en estimated_hours o budget y fechas inválidas con 422
    res_neg_hours = client.patch(
        f"/api/items/{item_id}",
        headers=auth_headers,
        json={"estimated_hours": -5.0},
    )
    assert res_neg_hours.status_code == 422

    res_neg_budget = client.patch(
        f"/api/items/{item_id}",
        headers=auth_headers,
        json={"budget": -100.0},
    )
    assert res_neg_budget.status_code == 422

    res_bad_start_date = client.patch(
        f"/api/items/{item_id}",
        headers=auth_headers,
        json={"start_date": "2026-99-99"},
    )
    assert res_bad_start_date.status_code == 422


def test_duplicate_task_item_with_checklist_and_activity(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    """Verifica que POST /api/items/{item_id}/duplicate clone tarea y checklist reiniciado a is_completed=False."""
    workspaces = client.get("/api/workspaces", headers=auth_headers).json()
    board_id = workspaces[0]["boards"][0]["id"]
    board = client.get(f"/api/boards/{board_id}", headers=auth_headers).json()

    # La primera tarea del primer grupo tiene 3 checklist items (2 completados y 1 pendiente)
    source_item = board["groups"][0]["items"][0]
    source_id = source_item["id"]
    assert source_item["checklist_total"] == 3
    assert source_item["checklist_completed"] == 2
    assert source_item["estimated_hours"] > 0
    assert source_item["budget"] > 0

    res_dup = client.post(
        f"/api/items/{source_id}/duplicate",
        headers=auth_headers,
    )
    assert res_dup.status_code == 201
    dup = res_dup.json()

    assert dup["id"] != source_id
    assert dup["group_id"] == source_item["group_id"]
    assert dup["title"] == f"{source_item['title']} (Copia)"
    assert dup["status_key"] == source_item["status_key"]
    assert dup["priority"] == source_item["priority"]
    assert dup["assignee_id"] == source_item["assignee_id"]
    assert dup["start_date"] == source_item["start_date"]
    assert dup["due_date"] == source_item["due_date"]
    assert dup["estimated_hours"] == source_item["estimated_hours"]
    assert dup["budget"] == source_item["budget"]
    assert dup["notes"] == source_item["notes"]

    # El checklist se clona con todos sus ítems pero reiniciados en is_completed=False
    assert dup["checklist_total"] == 3
    assert dup["checklist_completed"] == 0
    assert dup["comments_count"] == 0

    dup_detail = client.get(f"/api/items/{dup['id']}/detail", headers=auth_headers).json()
    assert len(dup_detail["checklist_items"]) == 3
    assert all(chk["is_completed"] is False for chk in dup_detail["checklist_items"])
    assert any(act["action"] == "item_duplicated" for act in dup_detail["activities"])


def test_board_analytics_kpis_and_breakdowns(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    """Verifica el cálculo exacto de KPIs y desgloses en GET /api/boards/{board_id}/analytics."""
    workspaces = client.get("/api/workspaces", headers=auth_headers).json()
    board_id = workspaces[0]["boards"][0]["id"]

    res_analytics = client.get(f"/api/boards/{board_id}/analytics", headers=auth_headers)
    assert res_analytics.status_code == 200
    analytics = res_analytics.json()

    assert analytics["board_id"] == board_id
    assert analytics["total_items"] == 6
    assert analytics["completed_items"] == 1
    assert analytics["completion_rate"] == 16.67
    assert analytics["total_estimated_hours"] == 76.0
    assert analytics["total_budget"] == 11000.0
    assert analytics["overdue_items"] == 0
    assert analytics["unassigned_items"] == 0

    # La suma de count en by_status debe coincidir con total_items
    status_counts_sum = sum(s["count"] for s in analytics["by_status"])
    assert status_counts_sum == analytics["total_items"]

    # La suma de count en by_priority debe coincidir con total_items y tener los 4 niveles
    assert len(analytics["by_priority"]) == 4
    priority_counts_sum = sum(p["count"] for p in analytics["by_priority"])
    assert priority_counts_sum == analytics["total_items"]

    # La suma de tareas por grupo debe coincidir con total_items y el presupuesto total
    group_items_sum = sum(g["total_items"] for g in analytics["by_group"])
    group_budget_sum = sum(g["total_budget"] for g in analytics["by_group"])
    group_hours_sum = sum(g["total_estimated_hours"] for g in analytics["by_group"])
    assert group_items_sum == analytics["total_items"]
    assert group_budget_sum == analytics["total_budget"]
    assert group_hours_sum == analytics["total_estimated_hours"]

    # Verificar que by_assignee refleje las cargas de trabajo de los miembros asignados
    assignee_total = sum(a["total_items"] for a in analytics["by_assignee"])
    assert assignee_total == analytics["total_items"]

    # Forzar 1 tarea vencida y sin asignar para validar overdue_items y unassigned_items
    board = client.get(f"/api/boards/{board_id}", headers=auth_headers).json()
    first_item_id = board["groups"][0]["items"][0]["id"]
    assert (
        client.patch(
            f"/api/items/{first_item_id}",
            headers=auth_headers,
            json={"due_date": "2020-01-01", "assignee_id": None},
        ).status_code
        == 200
    )
    updated_analytics = client.get(
        f"/api/boards/{board_id}/analytics", headers=auth_headers
    ).json()
    assert updated_analytics["overdue_items"] == 1
    assert updated_analytics["unassigned_items"] == 1


def test_board_export_csv_format_and_rows(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    """Verifica la exportación CSV UTF-8 del tablero con encabezados exactos y todas las tareas."""
    workspaces = client.get("/api/workspaces", headers=auth_headers).json()
    board_id = workspaces[0]["boards"][0]["id"]

    res_csv = client.get(f"/api/boards/{board_id}/export.csv", headers=auth_headers)
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]
    assert f"board_{board_id}_export.csv" in res_csv.headers.get("content-disposition", "")

    reader = list(csv.reader(io.StringIO(res_csv.text)))
    assert len(reader) == 7  # 1 fila de cabecera + 6 tareas del tablero semilla
    expected_header = [
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
    assert reader[0] == expected_header

    first_data_row = reader[1]
    assert first_data_row[1] == "Esta Semana"
    assert "SSO" in first_data_row[2]
    assert first_data_row[3] == "En Proceso"
    assert first_data_row[8] == "16.00"
    assert first_data_row[9] == "2400.00"


def test_defensive_sqlite_schema_migration_idempotency() -> None:
    """Verifica que ensure_phase2_schema agregue columnas faltantes en tablas SQLite preexistentes."""
    legacy_engine = create_engine("sqlite:///:memory:")
    with legacy_engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE task_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    group_id INTEGER NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    status_key VARCHAR(50) NOT NULL DEFAULT 'not_started',
                    priority VARCHAR(30) NOT NULL DEFAULT 'medium'
                )
                """
            )
        )

    # Ejecutar migración defensiva dos veces para comprobar idempotencia
    ensure_phase2_schema(legacy_engine)
    ensure_schema_migrations(legacy_engine)

    inspector = inspect(legacy_engine)
    col_names = {c["name"] for c in inspector.get_columns("task_items")}
    assert "start_date" in col_names
    assert "estimated_hours" in col_names
    assert "budget" in col_names
