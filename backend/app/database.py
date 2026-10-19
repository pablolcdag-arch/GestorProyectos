"""Configuración de SQLAlchemy 2.0 y sesión de base de datos."""

from __future__ import annotations

from collections.abc import Generator
from sqlalchemy import create_engine
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


def get_db() -> Generator[Session, None, None]:
    """Dependencia FastAPI que entrega una sesión de base de datos por request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

