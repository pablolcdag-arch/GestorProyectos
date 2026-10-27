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


def ensure_phase3_schema(target_engine: Engine) -> None:
    """Garantiza la creación de la tabla board_automations si no existe en bases preexistentes."""
    inspector = inspect(target_engine)
    if "board_automations" not in inspector.get_table_names():
        is_sqlite = target_engine.dialect.name == "sqlite"
        pk_type = "INTEGER PRIMARY KEY AUTOINCREMENT" if is_sqlite else "SERIAL PRIMARY KEY"
        with target_engine.begin() as conn:
            conn.execute(
                text(
                    f"""
                    CREATE TABLE IF NOT EXISTS board_automations (
                        id {pk_type},
                        board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
                        rule_type VARCHAR(80) NOT NULL,
                        target_status_key VARCHAR(60) DEFAULT 'done',
                        is_active BOOLEAN NOT NULL DEFAULT 1,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                    """
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_board_automations_board_id ON board_automations(board_id)"
                )
            )


def ensure_billing_schema(target_engine: Engine) -> None:
    """Garantiza la creación de la tabla subscriptions si no existe en bases preexistentes."""
    inspector = inspect(target_engine)
    if "subscriptions" not in inspector.get_table_names():
        is_sqlite = target_engine.dialect.name == "sqlite"
        pk_type = "INTEGER PRIMARY KEY AUTOINCREMENT" if is_sqlite else "SERIAL PRIMARY KEY"
        with target_engine.begin() as conn:
            conn.execute(
                text(
                    f"""
                    CREATE TABLE IF NOT EXISTS subscriptions (
                        id {pk_type},
                        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                        plan_tier VARCHAR(50) NOT NULL DEFAULT 'free_trial',
                        status VARCHAR(50) NOT NULL DEFAULT 'trialing',
                        stripe_customer_id VARCHAR(255),
                        stripe_subscription_id VARCHAR(255),
                        billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
                        seats INTEGER NOT NULL DEFAULT 1,
                        trial_ends_at TIMESTAMP,
                        current_period_end TIMESTAMP,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                    """
                )
            )
            conn.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS ix_subscriptions_user_id ON subscriptions(user_id)"
                )
            )


def ensure_integrations_schema(target_engine: Engine) -> None:
    """Garantiza la creación de las tablas task_attachments y notifications en bases preexistentes."""
    inspector = inspect(target_engine)
    existing_tables = set(inspector.get_table_names())
    is_sqlite = target_engine.dialect.name == "sqlite"
    pk_type = "INTEGER PRIMARY KEY AUTOINCREMENT" if is_sqlite else "SERIAL PRIMARY KEY"

    with target_engine.begin() as conn:
        if "task_attachments" not in existing_tables:
            conn.execute(
                text(
                    f"""
                    CREATE TABLE IF NOT EXISTS task_attachments (
                        id {pk_type},
                        item_id INTEGER NOT NULL REFERENCES task_items(id) ON DELETE CASCADE,
                        filename VARCHAR(255) NOT NULL,
                        file_size INTEGER NOT NULL DEFAULT 0,
                        content_type VARCHAR(100) NOT NULL DEFAULT 'application/octet-stream',
                        file_url VARCHAR(500) NOT NULL,
                        uploaded_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                    """
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_task_attachments_item_id ON task_attachments(item_id)"
                )
            )

        if "notifications" not in existing_tables:
            conn.execute(
                text(
                    f"""
                    CREATE TABLE IF NOT EXISTS notifications (
                        id {pk_type},
                        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        title VARCHAR(255) NOT NULL,
                        message TEXT NOT NULL,
                        link_url VARCHAR(500),
                        is_read BOOLEAN NOT NULL DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                    """
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications(user_id)"
                )
            )


def ensure_schema_migrations(target_engine: Engine) -> None:
    """Aplica todas las migraciones defensivas para bases de datos preexistentes."""
    ensure_phase2_schema(target_engine)
    ensure_phase3_schema(target_engine)
    ensure_billing_schema(target_engine)
    ensure_integrations_schema(target_engine)


def get_db() -> Generator[Session, None, None]:
    """Dependencia FastAPI que entrega una sesión de base de datos por request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


