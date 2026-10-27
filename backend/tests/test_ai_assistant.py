"""Pruebas automatizadas para el Motor de Asistente de IA Nativo (Sidekick)."""

from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Board, Subscription, TaskChecklistItem, TaskItem, User


def test_ai_generate_tasks_inserts_into_board(
    client: TestClient, auth_headers: dict[str, str], db_session: Session
) -> None:
    """Verifica que action_type='generate_tasks' cree e inserte tareas en el tablero especificado."""
    # 1. Obtener tablero existente
    board = db_session.query(Board).first()
    assert board is not None

    initial_task_count = (
        db_session.query(TaskItem).filter(TaskItem.board_id == board.id).count()
    )

    # 2. Solicitar generación de tareas de marketing
    payload = {
        "prompt": "Generar campaña de marketing digital y lanzamiento de producto",
        "board_id": board.id,
        "action_type": "generate_tasks",
    }
    res = client.post("/api/ai/ask", headers=auth_headers, json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["action_type"] == "generate_tasks"
    assert data["created_tasks_count"] >= 3
    assert len(data["tasks"]) == data["created_tasks_count"]
    assert any("marketing" in t["title"].lower() or "campaña" in t["title"].lower() or "publicitarios" in t["title"].lower() for t in data["tasks"])

    # 3. Validar que se hayan persistido efectivamente en la base de datos
    new_task_count = (
        db_session.query(TaskItem).filter(TaskItem.board_id == board.id).count()
    )
    assert new_task_count == initial_task_count + data["created_tasks_count"]


def test_ai_breakdown_checklist_adds_subtasks(
    client: TestClient, auth_headers: dict[str, str], db_session: Session
) -> None:
    """Verifica que action_type='breakdown_checklist' agregue subtareas al checklist de una tarea."""
    item = db_session.query(TaskItem).first()
    assert item is not None

    initial_checklist_count = (
        db_session.query(TaskChecklistItem)
        .filter(TaskChecklistItem.item_id == item.id)
        .count()
    )

    payload = {
        "prompt": "Desglosar los pasos necesarios para completar esta tarea técnica de desarrollo",
        "item_id": item.id,
        "action_type": "breakdown_checklist",
    }
    res = client.post("/api/ai/ask", headers=auth_headers, json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["action_type"] == "breakdown_checklist"
    assert len(data["checklist_items"]) >= 3
    assert "subtareas" in data["message"].lower()

    new_checklist_count = (
        db_session.query(TaskChecklistItem)
        .filter(TaskChecklistItem.item_id == item.id)
        .count()
    )
    assert new_checklist_count == initial_checklist_count + len(data["checklist_items"])


def test_ai_summarize_board_metrics_and_text(
    client: TestClient, auth_headers: dict[str, str], db_session: Session
) -> None:
    """Verifica que action_type='summarize_board' devuelva métricas ejecutivas y formato Markdown."""
    board = db_session.query(Board).first()
    assert board is not None

    payload = {
        "prompt": "Generar un resumen ejecutivo del avance del proyecto y los riesgos",
        "board_id": board.id,
        "action_type": "summarize_board",
    }
    res = client.post("/api/ai/ask", headers=auth_headers, json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["action_type"] == "summarize_board"
    assert data["summary_text"] is not None
    assert "Resumen Ejecutivo del Tablero" in data["summary_text"]
    assert "Total de tareas:" in data["summary_text"]
    assert "Completadas:" in data["summary_text"]
    assert "$" in data["summary_text"]


def test_get_ai_credits_by_subscription_plan(
    client: TestClient, auth_headers: dict[str, str], db_session: Session
) -> None:
    """Verifica el balance de créditos según el plan (ilimitado en trial/pro, 2000 en standard, 500 en basic)."""
    # 1. Usuario en Free Trial (por defecto)
    res_trial = client.get("/api/ai/credits", headers=auth_headers)
    assert res_trial.status_code == 200
    data_trial = res_trial.json()
    assert data_trial["is_unlimited"] is True
    assert data_trial["credits_total"] is None
    assert data_trial["plan_tier"] == "free_trial"

    # 2. Cambiar a plan Basic (500 créditos)
    ana = db_session.query(User).filter(User.email == "ana@gestor.dev").first()
    assert ana is not None
    sub = db_session.query(Subscription).filter(Subscription.user_id == ana.id).first()
    assert sub is not None

    sub.plan_tier = "basic"
    db_session.commit()

    res_basic = client.get("/api/ai/credits", headers=auth_headers)
    assert res_basic.status_code == 200
    data_basic = res_basic.json()
    assert data_basic["is_unlimited"] is False
    assert data_basic["credits_total"] == 500
    assert data_basic["plan_tier"] == "basic"

    # 3. Cambiar a plan Standard (2,000 créditos)
    sub.plan_tier = "standard"
    db_session.commit()

    res_std = client.get("/api/ai/credits", headers=auth_headers)
    assert res_std.status_code == 200
    data_std = res_std.json()
    assert data_std["is_unlimited"] is False
    assert data_std["credits_total"] == 2000
    assert data_std["plan_tier"] == "standard"


def test_ai_validations_and_auth_protection(client: TestClient) -> None:
    """Verifica que se requiera autenticación y validaciones estrictas de prompt y action_type."""
    # 1. 401 sin autenticación
    assert client.get("/api/ai/credits").status_code == 401
    assert client.post("/api/ai/ask", json={"prompt": "Crear tareas"}).status_code == 401

    # 2. Validación de prompt corto (< 3 caracteres)
    token_res = client.post(
        "/api/auth/oauth/google/callback",
        json={"code": "dev_google_ana"},
    )
    headers = {"Authorization": f"Bearer {token_res.json()['access_token']}"}

    short_prompt = client.post(
        "/api/ai/ask",
        headers=headers,
        json={"prompt": "ab", "action_type": "generate_tasks"},
    )
    assert short_prompt.status_code == 422

    # 3. Validación de action_type inválido
    bad_action = client.post(
        "/api/ai/ask",
        headers=headers,
        json={"prompt": "Prompt válido", "action_type": "dance"},
    )
    assert bad_action.status_code == 422

    # 4. Error 400 cuando falta board_id para generate_tasks
    missing_board = client.post(
        "/api/ai/ask",
        headers=headers,
        json={"prompt": "Crear tareas de prueba", "action_type": "generate_tasks"},
    )
    assert missing_board.status_code == 400

    # 5. Error 404 para board_id inexistente
    not_found_board = client.post(
        "/api/ai/ask",
        headers=headers,
        json={"prompt": "Crear tareas de prueba", "board_id": 99999, "action_type": "generate_tasks"},
    )
    assert not_found_board.status_code == 404
