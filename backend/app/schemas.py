"""Esquemas Pydantic v2 con validaciones estrictas para requests y responses."""

from __future__ import annotations

import re
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator

HEX_COLOR_PATTERN = re.compile(r"^#[0-9a-fA-F]{6}$")


def validate_non_empty_text(value: str, field_label: str) -> str:
    """Valida que un campo de texto no esté vacío tras eliminar espacios."""
    cleaned = value.strip()
    if not cleaned:
        raise ValueError(f"El campo '{field_label}' no puede estar vacío.")
    return cleaned


def validate_hex_color(value: str) -> str:
    """Valida que el color tenga formato hexadecimal #RRGGBB."""
    cleaned = value.strip()
    if not HEX_COLOR_PATTERN.match(cleaned):
        raise ValueError(
            f"El color '{value}' es inválido. Debe tener formato hexadecimal #RRGGBB."
        )
    return cleaned.lower()


# ---------------------------------------------------------------------------
# Usuarios y Autenticación OAuth2 / OIDC
# ---------------------------------------------------------------------------


class UserRead(BaseModel):
    """Representación pública de un usuario."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    avatar_url: Optional[str] = None
    color: str
    auth_provider: str
    provider_subject_id: str
    role: str
    is_active: bool
    created_at: datetime


class DevAccountInfo(BaseModel):
    """Cuenta preconfigurada para el simulador de login en modo desarrollo."""

    code: str
    email: str
    full_name: str
    role: str
    color: str
    provider: str


class OAuthProviderConfig(BaseModel):
    """Estado y modo de operación de un proveedor OAuth2 (Google o Microsoft)."""

    provider: str
    enabled: bool
    mode: str
    dev_accounts: list[DevAccountInfo] = []


class OAuthAuthorizeResponse(BaseModel):
    """Respuesta con la URL de autorización OAuth2 o del simulador de desarrollo."""

    provider: str
    mode: str
    authorization_url: str
    state: str


class OAuthCallbackRequest(BaseModel):
    """Datos enviados al endpoint de callback OAuth2."""

    code: str
    redirect_uri: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None

    @field_validator("code")
    @classmethod
    def check_code_not_empty(cls, v: str) -> str:
        return validate_non_empty_text(v, "code")


class TokenResponse(BaseModel):
    """Respuesta de sesión emitida tras autenticación exitosa."""

    access_token: str
    token_type: str = "bearer"
    user: UserRead


# ---------------------------------------------------------------------------
# Estados Personalizables por Tablero (BoardStatusConfig)
# ---------------------------------------------------------------------------


class BoardStatusCreate(BaseModel):
    """Payload para crear un nuevo estado personalizado en un tablero."""

    label: str
    color: str = "#0073ea"
    key: Optional[str] = None
    position: Optional[int] = None

    @field_validator("label")
    @classmethod
    def check_label(cls, v: str) -> str:
        return validate_non_empty_text(v, "label")

    @field_validator("color")
    @classmethod
    def check_color(cls, v: str) -> str:
        return validate_hex_color(v)


class BoardStatusUpdate(BaseModel):
    """Payload para actualizar etiqueta, color o posición de un estado."""

    label: Optional[str] = None
    color: Optional[str] = None
    position: Optional[int] = None

    @field_validator("label")
    @classmethod
    def check_label(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return validate_non_empty_text(v, "label")

    @field_validator("color")
    @classmethod
    def check_color(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return validate_hex_color(v)


class BoardStatusRead(BaseModel):
    """Representación de un estado configurado en un tablero."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    board_id: int
    key: str
    label: str
    color: str
    position: int


# ---------------------------------------------------------------------------
# Grupos y Tareas (TaskGroup & TaskItem)
# ---------------------------------------------------------------------------


class TaskItemRead(BaseModel):
    """Representación de una tarea (fila) dentro de un grupo."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    group_id: int
    board_id: int
    title: str
    status_key: str
    priority: str
    assignee_id: Optional[int] = None
    assignee: Optional[UserRead] = None
    due_date: Optional[str] = None
    notes: str
    position: int
    created_at: datetime
    updated_at: datetime


class TaskGroupRead(BaseModel):
    """Representación de un grupo desplegable con sus tareas ordenadas."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    board_id: int
    title: str
    color: str
    position: int
    collapsed: bool
    items: list[TaskItemRead] = []


# ---------------------------------------------------------------------------
# Tableros (Boards) y Espacios de Trabajo (Workspaces)
# ---------------------------------------------------------------------------


class BoardSummaryRead(BaseModel):
    """Resumen ligero de un tablero dentro del listado de Workspaces."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    workspace_id: int
    name: str
    description: str
    created_at: datetime


class BoardCreate(BaseModel):
    """Payload para crear un tablero nuevo dentro de un Workspace."""

    workspace_id: int
    name: str
    description: str = ""

    @field_validator("name")
    @classmethod
    def check_name(cls, v: str) -> str:
        return validate_non_empty_text(v, "name")


class BoardUpdate(BaseModel):
    """Payload para editar nombre o descripción de un tablero."""

    name: Optional[str] = None
    description: Optional[str] = None

    @field_validator("name")
    @classmethod
    def check_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return validate_non_empty_text(v, "name")


class BoardDetailRead(BaseModel):
    """Detalle completo de un tablero incluyendo estados, grupos e items."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    workspace_id: int
    name: str
    description: str
    created_at: datetime
    statuses: list[BoardStatusRead] = []
    groups: list[TaskGroupRead] = []


class WorkspaceCreate(BaseModel):
    """Payload para crear un nuevo Espacio de Trabajo."""

    name: str
    description: str = ""
    icon: str = "Briefcase"
    color: str = "#0073ea"

    @field_validator("name")
    @classmethod
    def check_name(cls, v: str) -> str:
        return validate_non_empty_text(v, "name")

    @field_validator("color")
    @classmethod
    def check_color(cls, v: str) -> str:
        return validate_hex_color(v)


class WorkspaceUpdate(BaseModel):
    """Payload para actualizar un Espacio de Trabajo existente."""

    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None

    @field_validator("name")
    @classmethod
    def check_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return validate_non_empty_text(v, "name")

    @field_validator("color")
    @classmethod
    def check_color(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return validate_hex_color(v)


class WorkspaceRead(BaseModel):
    """Representación de un Espacio de Trabajo con el resumen de sus tableros."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str
    icon: str
    color: str
    owner_id: Optional[int] = None
    created_at: datetime
    boards: list[BoardSummaryRead] = []

