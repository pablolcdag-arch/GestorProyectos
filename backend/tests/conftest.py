"""Configuración de fixtures Pytest con SQLite en memoria (StaticPool)."""

from __future__ import annotations

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.database as db_module
from app.database import Base, get_db
from app.main import app
from app.seed import seed_initial_data

TEST_SQLALCHEMY_DATABASE_URL = "sqlite://"

test_engine = create_engine(
    TEST_SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
    future=True,
)

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=test_engine,
    class_=Session,
)

# Redirigir engine y SessionLocal del módulo database al motor en memoria durante tests
db_module.engine = test_engine
db_module.SessionLocal = TestingSessionLocal


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    """Crea un esquema limpio en memoria con datos semilla para cada test individual."""
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    try:
        seed_initial_data(session)
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """Cliente de pruebas FastAPI conectado a la sesión en memoria."""

    def override_get_db() -> Generator[Session, None, None]:
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def auth_headers(client: TestClient) -> dict[str, str]:
    """Cabeceras con Bearer token válido (autenticado como Ana García en modo dev)."""
    response = client.post(
        "/api/auth/oauth/google/callback",
        json={"code": "dev_google_ana"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

