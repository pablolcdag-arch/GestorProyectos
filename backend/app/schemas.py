"""Esquemas Pydantic v2 con validaciones estrictas para requests y responses."""

from __future__ import annotations

import re
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator

HEX_COLOR_PATTERN = re.compile(r"^#[0-9a-fA-F]{6}$")
ISO_DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
VALID_PRIORITIES = {"critical", "high", "medium", "low"}


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


def validate_priority(value: str) -> str:
    """Valida que la prioridad esté dentro de los valores permitidos."""
    cleaned = value.strip().lower()
    if cleaned not in VALID_PRIORITIES:
        raise ValueError(
            f"Prioridad '{value}' inválida. Valores permitidos: {sorted(VALID_PRIORITIES)}."
        )
    return cleaned


def validate_iso_date_or_none(value: Optional[str]) -> Optional[str]:
    """Normaliza cadenas vacías a None y valida formato calendario YYYY-MM-DD."""
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        return None
    if not ISO_DATE_PATTERN.match(cleaned):
        raise ValueError(
            f"La fecha '{value}' es inválida. Debe tener formato ISO YYYY-MM-DD."
        )
    try:
        datetime.strptime(cleaned, "%Y-%m-%d")
    except ValueError as exc:
        raise ValueError(
            f"La fecha '{value}' no es una fecha de calendario válida (YYYY-MM-DD)."
        ) from exc
    return cleaned


def validate_non_negative_float(value: float, field_label: str) -> float:
    """Valida que un valor numérico sea mayor o igual a cero."""
    val = float(value)
    if val < 0:
        raise ValueError(f"El campo '{field_label}' no puede ser negativo ({value}).")
    return round(val, 2)


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


class TaskGroupCreate(BaseModel):
    """Payload para crear un nuevo grupo de tareas dentro de un tablero."""

    title: str
    color: str = "#579bfc"
    position: Optional[int] = None
    collapsed: bool = False

    @field_validator("title")
    @classmethod
    def check_title(cls, v: str) -> str:
        return validate_non_empty_text(v, "title")

    @field_validator("color")
    @classmethod
    def check_color(cls, v: str) -> str:
        return validate_hex_color(v)


class TaskGroupUpdate(BaseModel):
    """Payload para actualizar título, color, posición o estado colapsado de un grupo."""

    title: Optional[str] = None
    color: Optional[str] = None
    position: Optional[int] = None
    collapsed: Optional[bool] = None

    @field_validator("title")
    @classmethod
    def check_title(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return validate_non_empty_text(v, "title")

    @field_validator("color")
    @classmethod
    def check_color(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return validate_hex_color(v)


class TaskItemCreate(BaseModel):
    """Payload para crear una nueva tarea dentro de un grupo."""

    title: str
    status_key: Optional[str] = None
    priority: str = "medium"
    assignee_id: Optional[int] = None
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    estimated_hours: float = 0.0
    budget: float = 0.0
    notes: str = ""
    position: Optional[int] = None

    @field_validator("title")
    @classmethod
    def check_title(cls, v: str) -> str:
        return validate_non_empty_text(v, "title")

    @field_validator("status_key")
    @classmethod
    def check_status_key(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return validate_non_empty_text(v, "status_key")

    @field_validator("priority")
    @classmethod
    def check_priority(cls, v: str) -> str:
        return validate_priority(v)

    @field_validator("start_date")
    @classmethod
    def check_start_date(cls, v: Optional[str]) -> Optional[str]:
        return validate_iso_date_or_none(v)

    @field_validator("due_date")
    @classmethod
    def check_due_date(cls, v: Optional[str]) -> Optional[str]:
        return validate_iso_date_or_none(v)

    @field_validator("estimated_hours")
    @classmethod
    def check_estimated_hours(cls, v: float) -> float:
        return validate_non_negative_float(v, "estimated_hours")

    @field_validator("budget")
    @classmethod
    def check_budget(cls, v: float) -> float:
        return validate_non_negative_float(v, "budget")


class TaskItemUpdate(BaseModel):
    """Payload para edición inline parcial de una tarea (soporta null en assignee_id, start_date y due_date)."""

    title: Optional[str] = None
    group_id: Optional[int] = None
    status_key: Optional[str] = None
    priority: Optional[str] = None
    assignee_id: Optional[int] = None
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    estimated_hours: Optional[float] = None
    budget: Optional[float] = None
    notes: Optional[str] = None
    position: Optional[int] = None

    @field_validator("title")
    @classmethod
    def check_title(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return validate_non_empty_text(v, "title")

    @field_validator("status_key")
    @classmethod
    def check_status_key(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return validate_non_empty_text(v, "status_key")

    @field_validator("priority")
    @classmethod
    def check_priority(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return validate_priority(v)

    @field_validator("start_date")
    @classmethod
    def check_start_date(cls, v: Optional[str]) -> Optional[str]:
        return validate_iso_date_or_none(v)

    @field_validator("due_date")
    @classmethod
    def check_due_date(cls, v: Optional[str]) -> Optional[str]:
        return validate_iso_date_or_none(v)

    @field_validator("estimated_hours")
    @classmethod
    def check_estimated_hours(cls, v: Optional[float]) -> Optional[float]:
        if v is None:
            return None
        return validate_non_negative_float(v, "estimated_hours")

    @field_validator("budget")
    @classmethod
    def check_budget(cls, v: Optional[float]) -> Optional[float]:
        if v is None:
            return None
        return validate_non_negative_float(v, "budget")


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
    start_date: Optional[str] = None
    due_date: Optional[str] = None
    estimated_hours: float = 0.0
    budget: float = 0.0
    notes: str
    position: int
    comments_count: int = 0
    checklist_total: int = 0
    checklist_completed: int = 0
    created_at: datetime
    updated_at: datetime


class TaskCommentCreate(BaseModel):
    """Payload para publicar un comentario en una tarea."""

    content: str

    @field_validator("content")
    @classmethod
    def check_content(cls, v: str) -> str:
        return validate_non_empty_text(v, "content")


class TaskCommentRead(BaseModel):
    """Representación de un comentario dentro del detalle de una tarea."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    item_id: int
    author_id: Optional[int] = None
    author: Optional[UserRead] = None
    content: str
    created_at: datetime


class TaskChecklistCreate(BaseModel):
    """Payload para agregar un ítem al checklist interno de una tarea."""

    title: str
    is_completed: bool = False
    position: Optional[int] = None

    @field_validator("title")
    @classmethod
    def check_title(cls, v: str) -> str:
        return validate_non_empty_text(v, "title")


class TaskChecklistUpdate(BaseModel):
    """Payload para actualizar título, estado completado o posición de un ítem del checklist."""

    title: Optional[str] = None
    is_completed: Optional[bool] = None
    position: Optional[int] = None

    @field_validator("title")
    @classmethod
    def check_title(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return validate_non_empty_text(v, "title")


class TaskChecklistItemRead(BaseModel):
    """Representación de un ítem del checklist interno de una tarea."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    item_id: int
    title: str
    is_completed: bool
    position: int
    created_at: datetime


class TaskActivityRead(BaseModel):
    """Representación de un registro en el historial de actividad de una tarea."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    item_id: int
    user_id: Optional[int] = None
    user: Optional[UserRead] = None
    action: str
    description: str
    created_at: datetime


class TaskItemDetailRead(TaskItemRead):
    """Detalle enriquecido de una tarea incluyendo comentarios, checklist e historial."""

    comments: list[TaskCommentRead] = []
    checklist_items: list[TaskChecklistItemRead] = []
    activities: list[TaskActivityRead] = []


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
# Analítica Ejecutiva de Tablero (Fase 2)
# ---------------------------------------------------------------------------


class StatusBreakdownItem(BaseModel):
    """Distribución de tareas por estado del tablero."""

    key: str
    label: str
    color: str
    count: int
    percentage: float


class PriorityBreakdownItem(BaseModel):
    """Distribución de tareas por nivel de prioridad."""

    priority: str
    count: int


class AssigneeWorkloadItem(BaseModel):
    """Carga de trabajo, esfuerzo y presupuesto asignado por miembro del equipo."""

    user_id: Optional[int] = None
    full_name: str
    color: str
    total_items: int
    completed_items: int
    estimated_hours: float
    budget: float


class GroupMetricsItem(BaseModel):
    """Métricas agregadas por grupo dentro del tablero."""

    group_id: int
    title: str
    color: str
    total_items: int
    completed_items: int
    total_estimated_hours: float
    total_budget: float


class BoardAnalyticsRead(BaseModel):
    """KPIs ejecutivos y desgloses analíticos de un tablero."""

    board_id: int
    total_items: int
    completed_items: int
    completion_rate: float
    overdue_items: int
    unassigned_items: int
    total_estimated_hours: float
    total_budget: float
    by_status: list[StatusBreakdownItem] = []
    by_priority: list[PriorityBreakdownItem] = []
    by_assignee: list[AssigneeWorkloadItem] = []
    by_group: list[GroupMetricsItem] = []


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


# ============================================================================
# Esquemas para Automatizaciones de Tablero (Fase 3)
# ============================================================================

VALID_AUTOMATION_RULES: set[str] = {
    "when_checklist_complete_set_status",
    "when_status_done_complete_checklist",
    "when_status_blocked_log_alert",
}


class BoardAutomationCreate(BaseModel):
    """Payload para crear o configurar una regla de automatización en un tablero."""

    rule_type: str
    target_status_key: Optional[str] = "done"
    is_active: bool = True

    @field_validator("rule_type")
    @classmethod
    def check_rule_type(cls, v: str) -> str:
        rule = validate_non_empty_text(v, "rule_type")
        if rule not in VALID_AUTOMATION_RULES:
            raise ValueError(
                f"Regla de automatización '{rule}' no válida. Opciones permitidas: {sorted(VALID_AUTOMATION_RULES)}"
            )
        return rule


class BoardAutomationUpdate(BaseModel):
    """Payload para activar, desactivar o modificar una regla de automatización."""

    is_active: Optional[bool] = None
    target_status_key: Optional[str] = None


class BoardAutomationRead(BaseModel):
    """Representación de una regla de automatización configurada en un tablero."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    board_id: int
    rule_type: str
    target_status_key: Optional[str] = "done"
    is_active: bool
    created_at: datetime


# ============================================================================
# Esquemas para la Vista Global 'Mi Trabajo' (Fase 3)
# ============================================================================

class MyWorkItemRead(TaskItemRead):
    """Tarea enriquecida con metadatos contextuales para la vista global Mi Trabajo."""

    board_name: str
    workspace_id: int
    workspace_name: str
    group_title: str
    group_color: str


class MyWorkSummary(BaseModel):
    """Resumen cuantitativo de tareas asignadas al usuario."""

    total_assigned: int
    overdue_count: int
    today_count: int
    this_week_count: int
    upcoming_count: int
    completed_count: int


class MyWorkResponse(BaseModel):
    """Respuesta estructurada para la vista global Mi Trabajo."""

    summary: MyWorkSummary
    overdue: list[MyWorkItemRead]
    today: list[MyWorkItemRead]
    this_week: list[MyWorkItemRead]
    upcoming_or_no_date: list[MyWorkItemRead]
    completed: list[MyWorkItemRead]


# ============================================================================
# Esquemas y Catálogo de Planes de Facturación / Suscripciones SaaS (Billing)
# ============================================================================

OFFICIAL_PRICING_PLANS: list[dict[str, Any]] = [
    {
        "tier": "basic",
        "name": "Básico",
        "monthly_price": 4.5,
        "yearly_price": 45.0,
        "features": [
            "Tableros ilimitados",
            "Vistas básicas (Tabla, Kanban)",
            "500 créditos IA / mes",
            "Hasta 5 GB de almacenamiento",
        ],
        "is_popular": False,
    },
    {
        "tier": "standard",
        "name": "Estándar",
        "monthly_price": 6.0,
        "yearly_price": 60.0,
        "features": [
            "Todo lo de Básico",
            "Vistas Cronograma y Calendario",
            "250 automatizaciones / mes",
            "2,000 créditos IA / mes",
            "Integraciones estándar",
        ],
        "is_popular": False,
    },
    {
        "tier": "pro",
        "name": "Pro",
        "monthly_price": 9.5,
        "yearly_price": 95.0,
        "features": [
            "Todo lo de Estándar",
            "25,000 automatizaciones / mes",
            "IA completa ilimitada",
            "Columnas numéricas, fórmulas y analítica avanzada",
            "Soporte prioritario 24/7",
        ],
        "is_popular": True,
    },
    {
        "tier": "enterprise",
        "name": "Enterprise",
        "monthly_price": None,
        "yearly_price": None,
        "features": [
            "Seguridad y gobernanza corporativa",
            "SSO avanzado / SAML",
            "Auditoría completa",
            "SLA del 99.9% y soporte dedicado",
        ],
        "is_popular": False,
    },
]


class PricingPlanRead(BaseModel):
    """Representación de un plan de precios y suscripción comercial."""

    tier: str
    name: str
    monthly_price: Optional[float]
    yearly_price: Optional[float]
    features: list[str]
    is_popular: bool = False


class SubscriptionRead(BaseModel):
    """Representación del estado y período de la suscripción del usuario."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    plan_tier: str
    status: str
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    billing_cycle: str
    seats: int
    trial_ends_at: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    days_left_in_trial: int = 0
    is_trial_active: bool = False
    created_at: datetime
    updated_at: datetime


class CheckoutSessionCreate(BaseModel):
    """Payload para iniciar o simular un proceso de checkout de suscripción."""

    plan_tier: str
    billing_cycle: str = "monthly"

    @field_validator("plan_tier")
    @classmethod
    def check_plan_tier(cls, v: str) -> str:
        valid = {"basic", "standard", "pro"}
        if v not in valid:
            raise ValueError(f"plan_tier debe ser uno de: {sorted(valid)}")
        return v

    @field_validator("billing_cycle")
    @classmethod
    def check_billing_cycle(cls, v: str) -> str:
        valid = {"monthly", "yearly"}
        if v not in valid:
            raise ValueError(f"billing_cycle debe ser uno de: {sorted(valid)}")
        return v


class CheckoutSessionResponse(BaseModel):
    """Respuesta con URL de checkout Stripe o confirmación simulada."""

    checkout_url: Optional[str] = None
    mode: str
    success: bool = True


# ============================================================================
# Esquemas para el Asistente de IA ("Sidekick" estilo Monday.com)
# ============================================================================

VALID_AI_ACTIONS: set[str] = {
    "generate_tasks",
    "generate_board",
    "breakdown_checklist",
    "summarize_board",
}


class AIPromptRequest(BaseModel):
    """Payload de solicitud para interactuar con el asistente de inteligencia artificial."""

    prompt: str
    board_id: Optional[int] = None
    item_id: Optional[int] = None
    action_type: str = "generate_tasks"

    @field_validator("prompt")
    @classmethod
    def check_prompt(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 3:
            raise ValueError("El prompt debe contener al menos 3 caracteres no vacíos.")
        return cleaned

    @field_validator("action_type")
    @classmethod
    def check_action_type(cls, v: str) -> str:
        action = v.strip().lower()
        if action not in VALID_AI_ACTIONS:
            raise ValueError(
                f"action_type '{action}' no es válido. Opciones permitidas: {sorted(VALID_AI_ACTIONS)}"
            )
        return action


class AIGeneratedTask(BaseModel):
    """Estructura de una tarea generada automáticamente por IA."""

    title: str
    group_name: str
    status_key: str = "not_started"
    priority: str = "medium"
    estimated_hours: Optional[float] = None
    budget: Optional[float] = None
    notes: Optional[str] = None


class AIPromptResponse(BaseModel):
    """Respuesta estructurada emitida por el asistente de inteligencia artificial."""

    action_type: str
    message: str
    created_tasks_count: int = 0
    tasks: list[AIGeneratedTask] = []
    checklist_items: list[str] = []
    summary_text: Optional[str] = None


class AICreditsResponse(BaseModel):
    """Balance y disponibilidad de créditos de IA según el plan de suscripción."""

    credits_total: Optional[int] = None
    credits_used: int = 0
    is_unlimited: bool = False
    plan_tier: str





