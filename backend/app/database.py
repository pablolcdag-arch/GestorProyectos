"""Configuración de SQLAlchemy 2.0 y sesión de base de datos."""

from __future__ import annotations

from collections.abc import Generator
from sqlalchemy import Engine, create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


def get_database_url() -> str:
    """Normaliza DATABASE_URL para compatibilidad con SQLAlchemy 2.0 (SQLite y PostgreSQL)."""
    url = settings.DATABASE_URL
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    return url


database_url = get_database_url()
connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}

engine = create_engine(
    database_url,
    connect_args=connect_args,
    future=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=Session,
)


class Base(DeclarativeBase):
    """Clase base declarativa de SQLAlchemy 2.0."""


def ensure_phase2_schema(target_engine: Engine) -> None:
    """Garantiza idempotentemente que task_items posea las columnas de Fase 2 en bases preexistentes."""
    inspector = inspect(target_engine)
    if "task_items" not in inspector.get_table_names():
        return

    existing_cols = {col["name"] for col in inspector.get_columns("task_items")}
    alter_statements: list[str] = []

    if "start_date" not in existing_cols:
        alter_statements.append(
            "ALTER TABLE task_items ADD COLUMN start_date VARCHAR(20)"
        )
    if "estimated_hours" not in existing_cols:
        alter_statements.append(
            "ALTER TABLE task_items ADD COLUMN estimated_hours FLOAT NOT NULL DEFAULT 0.0"
        )
    if "budget" not in existing_cols:
        alter_statements.append(
            "ALTER TABLE task_items ADD COLUMN budget FLOAT NOT NULL DEFAULT 0.0"
        )

    if alter_statements:
        with target_engine.begin() as conn:
            for stmt in alter_statements:
                conn.execute(text(stmt))


ensure_schema_migrations = ensure_phase2_schema


def get_db() -> Generator[Session, None, None]:
    """Dependencia FastAPI que entrega una sesión de base de datos por request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


