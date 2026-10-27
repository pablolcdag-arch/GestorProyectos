"""Modelos relacionales SQLAlchemy 2.0 para el Gestor de Proyectos."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utc_now() -> datetime:
    """Devuelve la fecha y hora actual en UTC con timezone."""
    return datetime.now(timezone.utc)


def trial_end_default() -> datetime:
    """Calcula 14 días a partir de ahora en UTC para el período de prueba."""
    return datetime.now(timezone.utc) + timedelta(days=14)


DEFAULT_BOARD_STATUSES: list[dict[str, str | int]] = [
    {"key": "done", "label": "Listo", "color": "#00c875", "position": 0},
    {"key": "in_progress", "label": "En Proceso", "color": "#fdab3d", "position": 1},
    {"key": "blocked", "label": "Bloqueado", "color": "#e2445c", "position": 2},
    {"key": "handed_over", "label": "Traspasado", "color": "#a25ddc", "position": 3},
    {"key": "not_started", "label": "Sin Empezar", "color": "#c4c4c4", "position": 4},
]

DEFAULT_BOARD_GROUPS: list[dict[str, str | int | bool]] = [
    {"title": "Esta Semana", "color": "#579bfc", "position": 0, "collapsed": False},
    {"title": "En Progreso", "color": "#a25ddc", "position": 1, "collapsed": False},
]


class User(Base):
    """Usuario autenticado mediante Google o Microsoft OAuth2 / OIDC."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True, default=None)
    color: Mapped[str] = mapped_column(String(20), nullable=False, default="#0073ea")
    auth_provider: Mapped[str] = mapped_column(String(50), nullable=False)
    provider_subject_id: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="member")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )

    subscription: Mapped[Optional["Subscription"]] = relationship(
        "Subscription",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )


class Subscription(Base):
    """Suscripción SaaS y control de plan comercial asociado al usuario."""

    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    plan_tier: Mapped[str] = mapped_column(
        String(50), nullable=False, default="free_trial"
    )
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="trialing"
    )
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, default=None
    )
    stripe_subscription_id: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, default=None
    )
    billing_cycle: Mapped[str] = mapped_column(
        String(20), nullable=False, default="monthly"
    )
    seats: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    trial_ends_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, default=trial_end_default
    )
    current_period_end: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )

    user: Mapped["User"] = relationship("User", back_populates="subscription")


class Workspace(Base):
    """Espacio de trabajo que agrupa múltiples tableros."""

    __tablename__ = "workspaces"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    icon: Mapped[str] = mapped_column(String(50), nullable=False, default="Briefcase")
    color: Mapped[str] = mapped_column(String(20), nullable=False, default="#0073ea")
    owner_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )

    boards: Mapped[list["Board"]] = relationship(
        "Board",
        back_populates="workspace",
        cascade="all, delete-orphan",
        order_by="Board.id",
    )


class Board(Base):
    """Tablero de proyecto dentro de un Workspace."""

    __tablename__ = "boards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workspace_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )

    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="boards")
    statuses: Mapped[list["BoardStatusConfig"]] = relationship(
        "BoardStatusConfig",
        back_populates="board",
        cascade="all, delete-orphan",
        order_by="BoardStatusConfig.position, BoardStatusConfig.id",
    )
    groups: Mapped[list["TaskGroup"]] = relationship(
        "TaskGroup",
        back_populates="board",
        cascade="all, delete-orphan",
        order_by="TaskGroup.position, TaskGroup.id",
    )
    items: Mapped[list["TaskItem"]] = relationship(
        "TaskItem",
        back_populates="board",
        cascade="all, delete-orphan",
        order_by="TaskItem.position, TaskItem.id",
    )
    automations: Mapped[list["BoardAutomation"]] = relationship(
        "BoardAutomation",
        back_populates="board",
        cascade="all, delete-orphan",
        order_by="BoardAutomation.id",
    )


class BoardStatusConfig(Base):
    """Configuración personalizable de estados por tablero."""

    __tablename__ = "board_statuses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    board_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("boards.id", ondelete="CASCADE"), nullable=False
    )
    key: Mapped[str] = mapped_column(String(60), nullable=False)
    label: Mapped[str] = mapped_column(String(80), nullable=False)
    color: Mapped[str] = mapped_column(String(20), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    board: Mapped["Board"] = relationship("Board", back_populates="statuses")


class BoardAutomation(Base):
    """Regla de automatización configurable dentro de un tablero."""

    __tablename__ = "board_automations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    board_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("boards.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    rule_type: Mapped[str] = mapped_column(String(80), nullable=False)
    target_status_key: Mapped[Optional[str]] = mapped_column(
        String(60), nullable=True, default="done"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )

    board: Mapped["Board"] = relationship("Board", back_populates="automations")


class TaskGroup(Base):
    """Grupo desplegable de tareas dentro de un tablero."""

    __tablename__ = "task_groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    board_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("boards.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    color: Mapped[str] = mapped_column(String(20), nullable=False, default="#579bfc")
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    collapsed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    board: Mapped["Board"] = relationship("Board", back_populates="groups")
    items: Mapped[list["TaskItem"]] = relationship(
        "TaskItem",
        back_populates="group",
        cascade="all, delete-orphan",
        order_by="TaskItem.position, TaskItem.id",
    )


class TaskItem(Base):
    """Fila de tarea (Item) perteneciente a un grupo y un tablero."""

    __tablename__ = "task_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    group_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("task_groups.id", ondelete="CASCADE"), nullable=False
    )
    board_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("boards.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status_key: Mapped[str] = mapped_column(String(60), nullable=False, default="not_started")
    priority: Mapped[str] = mapped_column(String(30), nullable=False, default="medium")
    assignee_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    start_date: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default=None)
    due_date: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default=None)
    estimated_hours: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    budget: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, onupdate=utc_now
    )

    group: Mapped["TaskGroup"] = relationship("TaskGroup", back_populates="items")
    board: Mapped["Board"] = relationship("Board", back_populates="items")
    assignee: Mapped[Optional["User"]] = relationship("User", foreign_keys=[assignee_id])
    comments: Mapped[list["TaskComment"]] = relationship(
        "TaskComment",
        back_populates="item",
        cascade="all, delete-orphan",
        order_by="TaskComment.id.desc()",
    )
    checklist_items: Mapped[list["TaskChecklistItem"]] = relationship(
        "TaskChecklistItem",
        back_populates="item",
        cascade="all, delete-orphan",
        order_by="TaskChecklistItem.position.asc(), TaskChecklistItem.id.asc()",
    )
    activities: Mapped[list["TaskActivityLog"]] = relationship(
        "TaskActivityLog",
        back_populates="item",
        cascade="all, delete-orphan",
        order_by="TaskActivityLog.id.desc()",
    )

    @property
    def comments_count(self) -> int:
        """Cantidad total de comentarios asociados a la tarea."""
        return len(self.comments)

    @property
    def checklist_total(self) -> int:
        """Cantidad total de ítems en el checklist interno de la tarea."""
        return len(self.checklist_items)

    @property
    def checklist_completed(self) -> int:
        """Cantidad de ítems completados en el checklist interno de la tarea."""
        return sum(1 for c in self.checklist_items if c.is_completed)


class TaskComment(Base):
    """Comentario publicado por un usuario dentro de una tarea."""

    __tablename__ = "task_comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    item_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("task_items.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    author_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )

    item: Mapped["TaskItem"] = relationship("TaskItem", back_populates="comments")
    author: Mapped[Optional["User"]] = relationship("User", foreign_keys=[author_id])


class TaskChecklistItem(Base):
    """Subtarea o ítem de checklist interno asociado a una tarea."""

    __tablename__ = "task_checklist_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    item_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("task_items.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    is_completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )

    item: Mapped["TaskItem"] = relationship("TaskItem", back_populates="checklist_items")


class TaskActivityLog(Base):
    """Registro de auditoría de cambios y actividad ocurridos en una tarea."""

    __tablename__ = "task_activity_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    item_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("task_items.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    action: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )

    item: Mapped["TaskItem"] = relationship("TaskItem", back_populates="activities")
    user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[user_id])

