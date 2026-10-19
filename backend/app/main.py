"""Punto de entrada principal de la API FastAPI para el Gestor de Proyectos."""

from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.database as db_module
from app.config import settings
from app.database import Base, ensure_schema_migrations
from app.routers import (
    auth_router,
    automations_router,
    boards_router,
    groups_items_router,
    item_collaboration_router,
    my_work_router,
    workspaces_router,
)
from app.seed import seed_initial_data


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncGenerator[None, None]:
    """Inicializa tablas, aplica migraciones defensivas y carga datos semilla si la DB está vacía."""
    Base.metadata.create_all(bind=db_module.engine)
    ensure_schema_migrations(db_module.engine)
    with db_module.SessionLocal() as db:
        seed_initial_data(db)
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="API REST para el Gestor de Proyectos y Tareas Visual (Estilo Monday.com).",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(workspaces_router.router)
app.include_router(boards_router.router)
app.include_router(groups_items_router.router)
app.include_router(item_collaboration_router.router)
app.include_router(automations_router.router)
app.include_router(my_work_router.router)


@app.get("/api/health", tags=["Health"])
def health_check() -> dict[str, str]:
    """Endpoint de verificación de salud del servicio."""
    return {"status": "ok", "service": settings.APP_NAME}

