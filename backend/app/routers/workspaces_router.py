"""Endpoints REST para gestión de Espacios de Trabajo (Workspaces)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User, Workspace
from app.schemas import WorkspaceCreate, WorkspaceRead, WorkspaceUpdate

router = APIRouter(prefix="/api/workspaces", tags=["Workspaces"])


@router.get("", response_model=list[WorkspaceRead])
def list_workspaces(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Workspace]:
    """Lista todos los espacios de trabajo ordenados por ID con el resumen de sus tableros."""
    return db.query(Workspace).order_by(Workspace.id.asc()).all()


@router.post("", response_model=WorkspaceRead, status_code=status.HTTP_201_CREATED)
def create_workspace(
    payload: WorkspaceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Workspace:
    """Crea un nuevo espacio de trabajo."""
    workspace = Workspace(
        name=payload.name,
        description=payload.description.strip(),
        icon=payload.icon.strip() or "Briefcase",
        color=payload.color,
        owner_id=current_user.id,
    )
    db.add(workspace)
    db.commit()
    db.refresh(workspace)
    return workspace


@router.patch("/{workspace_id}", response_model=WorkspaceRead)
def update_workspace(
    workspace_id: int,
    payload: WorkspaceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Workspace:
    """Actualiza nombre, descripción, ícono o color de un espacio de trabajo existente."""
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Espacio de trabajo con ID {workspace_id} no encontrado.",
        )

    if payload.name is not None:
        workspace.name = payload.name
    if payload.description is not None:
        workspace.description = payload.description.strip()
    if payload.icon is not None:
        workspace.icon = payload.icon.strip() or workspace.icon
    if payload.color is not None:
        workspace.color = payload.color

    db.commit()
    db.refresh(workspace)
    return workspace


@router.delete("/{workspace_id}")
def delete_workspace(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Elimina un espacio de trabajo y sus tableros asociados en cascada."""
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Espacio de trabajo con ID {workspace_id} no encontrado.",
        )

    db.delete(workspace)
    db.commit()
    return {"deleted": True, "id": workspace_id}

