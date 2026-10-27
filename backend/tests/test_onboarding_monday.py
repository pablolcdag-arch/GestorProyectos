"""Pruebas automatizadas para el Onboarding Automático 1:1 Monday.com."""

from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.auth import ensure_user_default_workspace, upsert_oauth_user
from app.models import Board, BoardAutomation, BoardStatusConfig, TaskGroup, TaskItem, Workspace


def test_new_user_onboarding_creates_workspace_board_and_monday_tasks(
    client: TestClient, db_session: Session
) -> None:
    """Verifica que un nuevo usuario reciba automáticamente su espacio, tablero y 3 tareas Monday."""
    # 1. Autenticar a un nuevo usuario vía endpoint OAuth dev
    response = client.post(
        "/api/auth/oauth/google/callback",
        json={"code": "dev_google_newuser", "email": "newuser@gestor.dev", "full_name": "Nuevo Usuario"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    user_data = response.json()["user"]
    user_id = user_data["id"]

    # 2. Consultar base de datos para validar workspace y board
    ws = db_session.query(Workspace).filter(Workspace.owner_id == user_id).first()
    assert ws is not None
    assert ws.name == "Mi Espacio de Trabajo"
    assert ws.icon == "Briefcase"
    assert ws.color == "#0073ea"

    board = db_session.query(Board).filter(Board.workspace_id == ws.id).first()
    assert board is not None
    assert board.name == "Primer proyecto"
    assert board.description == "Gestioná tus tareas y flujos de trabajo en un solo lugar"

    # 3. Validar los 5 estados por defecto
    statuses = db_session.query(BoardStatusConfig).filter(BoardStatusConfig.board_id == board.id).all()
    assert len(statuses) == 5

    # 4. Validar los 2 grupos oficiales
    groups = (
        db_session.query(TaskGroup)
        .filter(TaskGroup.board_id == board.id)
        .order_by(TaskGroup.position.asc())
        .all()
    )
    assert len(groups) == 2
    grp_pending, grp_completed = groups[0], groups[1]
    assert grp_pending.title == "Pendientes"
    assert grp_pending.color == "#579bfc"
    assert grp_completed.title == "Completado"
    assert grp_completed.color == "#00c875"

    # 5. Validar las 3 tareas precargadas en "Pendientes"
    tasks = (
        db_session.query(TaskItem)
        .filter(TaskItem.group_id == grp_pending.id)
        .order_by(TaskItem.position.asc())
        .all()
    )
    assert len(tasks) == 3

    t1, t2, t3 = tasks[0], tasks[1], tasks[2]

    # Tarea 1
    assert t1.title == "Tarea 1"
    assert t1.status_key == "in_progress"
    assert t1.priority == "low"
    assert t1.assignee_id == user_id
    assert t1.budget == 100.0
    assert t1.estimated_hours == 4.0
    assert t1.notes == "Elementos de acción y entregables principales"
    assert t1.due_date is not None

    # Tarea 2
    assert t2.title == "Tarea 2"
    assert t2.status_key == "done"
    assert t2.priority == "high"
    assert t2.assignee_id is None
    assert t2.budget == 1000.0
    assert t2.estimated_hours == 8.0
    assert t2.notes == "Notas de la reunión y seguimiento con el equipo"
    assert t2.due_date is not None

    # Tarea 3
    assert t3.title == "Tarea 3"
    assert t3.status_key == "blocked"
    assert t3.priority == "medium"
    assert t3.assignee_id is None
    assert t3.budget == 500.0
    assert t3.estimated_hours == 2.0
    assert t3.notes == "Revisión técnica y control de calidad"
    assert t3.due_date is not None

    # 6. Verificar suma exacta de presupuesto = $1,600.0
    total_budget = sum(t.budget for t in tasks)
    assert total_budget == 1600.0

    # 7. Validar las 3 automatizaciones por defecto
    automations = db_session.query(BoardAutomation).filter(BoardAutomation.board_id == board.id).all()
    assert len(automations) == 3
    rule_types = {a.rule_type for a in automations}
    assert "when_checklist_complete_set_status" in rule_types
    assert "when_status_done_complete_checklist" in rule_types
    assert "when_status_blocked_log_alert" in rule_types


def test_ensure_user_default_workspace_idempotency(db_session: Session) -> None:
    """Verifica que llamadas repetidas no dupliquen tableros ni tareas."""
    # 1. Crear usuario mediante upsert_oauth_user
    profile = {
        "email": "test_idempotent@gestor.dev",
        "full_name": "Idempotent User",
        "provider_subject_id": "google:test_idempotent@gestor.dev",
    }
    user = upsert_oauth_user(db_session, "google", profile)

    # Contar recursos iniciales creados
    ws_count_1 = db_session.query(Workspace).filter(Workspace.owner_id == user.id).count()
    user_ws = db_session.query(Workspace).filter(Workspace.owner_id == user.id).first()
    assert user_ws is not None
    board_count_1 = db_session.query(Board).filter(Board.workspace_id == user_ws.id).count()
    user_board = db_session.query(Board).filter(Board.workspace_id == user_ws.id).first()
    assert user_board is not None
    task_count_1 = db_session.query(TaskItem).filter(TaskItem.board_id == user_board.id).count()

    assert ws_count_1 == 1
    assert board_count_1 == 1
    assert task_count_1 == 3

    # 2. Invocar nuevamente ensure_user_default_workspace y upsert_oauth_user
    ensure_user_default_workspace(db_session, user)
    upsert_oauth_user(db_session, "google", profile)

    # 3. Verificar que no se hayan duplicado recursos
    ws_count_2 = db_session.query(Workspace).filter(Workspace.owner_id == user.id).count()
    board_count_2 = db_session.query(Board).filter(Board.workspace_id == user_ws.id).count()
    task_count_2 = db_session.query(TaskItem).filter(TaskItem.board_id == user_board.id).count()

    assert ws_count_2 == 1
    assert board_count_2 == 1
    assert task_count_2 == 3
