"""Datos semilla iniciales (Usuarios, Workspaces, Tableros, Estados, Grupos y Tareas)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import (
    DEFAULT_BOARD_STATUSES,
    Board,
    BoardStatusConfig,
    TaskGroup,
    TaskItem,
    User,
    Workspace,
)


def seed_initial_data(db: Session) -> None:
    """Puebla la base de datos con el equipo inicial, workspaces y tableros si está vacía."""
    if db.query(User).count() > 0:
        return

    # 1. Crear los 4 usuarios de equipo
    ana = User(
        email="ana@gestor.dev",
        full_name="Ana García",
        auth_provider="google",
        provider_subject_id="google:ana@gestor.dev",
        role="admin",
        color="#0073ea",
        is_active=True,
    )
    carlos = User(
        email="carlos@gestor.dev",
        full_name="Carlos Ruiz",
        auth_provider="microsoft",
        provider_subject_id="microsoft:carlos@gestor.dev",
        role="admin",
        color="#00c875",
        is_active=True,
    )
    lucia = User(
        email="lucia@gestor.dev",
        full_name="Lucía Méndez",
        auth_provider="google",
        provider_subject_id="google:lucia@gestor.dev",
        role="member",
        color="#a25ddc",
        is_active=True,
    )
    martin = User(
        email="martin@gestor.dev",
        full_name="Martín López",
        auth_provider="microsoft",
        provider_subject_id="microsoft:martin@gestor.dev",
        role="member",
        color="#fdab3d",
        is_active=True,
    )
    db.add_all([ana, carlos, lucia, martin])
    db.flush()

    # 2. Crear los 2 Workspaces iniciales
    ws_principal = Workspace(
        name="Espacio Principal",
        description="Gestión central de producto, ingeniería y entregas trimestrales.",
        icon="Briefcase",
        color="#0073ea",
        owner_id=ana.id,
    )
    ws_marketing = Workspace(
        name="Marketing & Crecimiento",
        description="Campañas de adquisición, contenidos y lanzamiento web.",
        icon="Rocket",
        color="#00c875",
        owner_id=carlos.id,
    )
    db.add_all([ws_principal, ws_marketing])
    db.flush()

    # 3. Tablero 1: Roadmap de Producto Q4
    board_roadmap = Board(
        workspace_id=ws_principal.id,
        name="Roadmap de Producto Q4",
        description="Planificación y seguimiento de funcionalidades clave del trimestre.",
    )
    # 4. Tablero 2: Lanzamiento Campaña Web
    board_marketing = Board(
        workspace_id=ws_marketing.id,
        name="Lanzamiento Campaña Web",
        description="Coordinación de diseño, copy, analítica y pauta digital.",
    )
    db.add_all([board_roadmap, board_marketing])
    db.flush()

    # Crear los 5 estados por defecto en ambos tableros
    for board in (board_roadmap, board_marketing):
        for st in DEFAULT_BOARD_STATUSES:
            db.add(
                BoardStatusConfig(
                    board_id=board.id,
                    key=str(st["key"]),
                    label=str(st["label"]),
                    color=str(st["color"]),
                    position=int(st["position"]),
                )
            )

    # Crear los 3 grupos en el Tablero 1 (Roadmap de Producto Q4)
    g1_week = TaskGroup(
        board_id=board_roadmap.id,
        title="Esta Semana",
        color="#579bfc",
        position=0,
        collapsed=False,
    )
    g1_prog = TaskGroup(
        board_id=board_roadmap.id,
        title="En Progreso",
        color="#a25ddc",
        position=1,
        collapsed=False,
    )
    g1_done = TaskGroup(
        board_id=board_roadmap.id,
        title="Completadas",
        color="#00c875",
        position=2,
        collapsed=False,
    )
    db.add_all([g1_week, g1_prog, g1_done])

    # Crear los 3 grupos en el Tablero 2 (Lanzamiento Campaña Web)
    g2_week = TaskGroup(
        board_id=board_marketing.id,
        title="Esta Semana",
        color="#579bfc",
        position=0,
        collapsed=False,
    )
    g2_prog = TaskGroup(
        board_id=board_marketing.id,
        title="En Progreso",
        color="#a25ddc",
        position=1,
        collapsed=False,
    )
    g2_done = TaskGroup(
        board_id=board_marketing.id,
        title="Completadas",
        color="#00c875",
        position=2,
        collapsed=False,
    )
    db.add_all([g2_week, g2_prog, g2_done])
    db.flush()

    # 6 tareas realistas en Tablero 1 (Roadmap de Producto Q4)
    roadmap_tasks = [
        TaskItem(
            group_id=g1_week.id,
            board_id=board_roadmap.id,
            title="Implementar autenticación SSO con Google y Microsoft",
            status_key="in_progress",
            priority="critical",
            assignee_id=ana.id,
            due_date="2026-10-25",
            notes="Soportar OAuth2 real y modo simulador determinístico en local.",
            position=0,
        ),
        TaskItem(
            group_id=g1_week.id,
            board_id=board_roadmap.id,
            title="Diseñar modelo relacional de Workspaces y Estados por Tablero",
            status_key="done",
            priority="high",
            assignee_id=carlos.id,
            due_date="2026-10-22",
            notes="Incluir los 5 estados iniciales por defecto personalizables.",
            position=1,
        ),
        TaskItem(
            group_id=g1_prog.id,
            board_id=board_roadmap.id,
            title="Construir vista de tabla interactiva con edición inline",
            status_key="in_progress",
            priority="high",
            assignee_id=lucia.id,
            due_date="2026-10-28",
            notes="Actualización optimista con rollback ante errores de red.",
            position=0,
        ),
        TaskItem(
            group_id=g1_prog.id,
            board_id=board_roadmap.id,
            title="Integración de pasarela de notificaciones por webhook",
            status_key="blocked",
            priority="medium",
            assignee_id=martin.id,
            due_date="2026-11-02",
            notes="Esperando definición de endpoints del proveedor externo.",
            position=1,
        ),
        TaskItem(
            group_id=g1_prog.id,
            board_id=board_roadmap.id,
            title="Delegar pruebas de carga del motor de filtros a QA",
            status_key="handed_over",
            priority="low",
            assignee_id=carlos.id,
            due_date="2026-11-05",
            notes="Entregado al equipo de infraestructura con scripts listos.",
            position=2,
        ),
        TaskItem(
            group_id=g1_done.id,
            board_id=board_roadmap.id,
            title="Definir arquitectura base y bitácora de decisiones",
            status_key="not_started",
            priority="medium",
            assignee_id=ana.id,
            due_date="2026-10-20",
            notes="Documentado en AGENTS.md y decisions_log.md.",
            position=0,
        ),
    ]

    # 6 tareas realistas en Tablero 2 (Lanzamiento Campaña Web)
    marketing_tasks = [
        TaskItem(
            group_id=g2_week.id,
            board_id=board_marketing.id,
            title="Redactar copy principal para landing page de producto",
            status_key="in_progress",
            priority="high",
            assignee_id=lucia.id,
            due_date="2026-10-24",
            notes="Enfocar propuesta de valor en velocidad y colaboración visual.",
            position=0,
        ),
        TaskItem(
            group_id=g2_week.id,
            board_id=board_marketing.id,
            title="Configurar seguimiento de conversiones y eventos clave",
            status_key="not_started",
            priority="critical",
            assignee_id=martin.id,
            due_date="2026-10-26",
            notes="Definir embudo de registro con Google y Microsoft SSO.",
            position=1,
        ),
        TaskItem(
            group_id=g2_prog.id,
            board_id=board_marketing.id,
            title="Producir video demostrativo de 60 segundos",
            status_key="in_progress",
            priority="medium",
            assignee_id=carlos.id,
            due_date="2026-10-30",
            notes="Grabación de pantalla con flujo de tablas y Kanban.",
            position=0,
        ),
        TaskItem(
            group_id=g2_prog.id,
            board_id=board_marketing.id,
            title="Aprobar presupuesto de pauta en LinkedIn y Google Ads",
            status_key="blocked",
            priority="high",
            assignee_id=ana.id,
            due_date="2026-10-27",
            notes="Pendiente de revisión financiera trimestral.",
            position=1,
        ),
        TaskItem(
            group_id=g2_prog.id,
            board_id=board_marketing.id,
            title="Entregar piezas gráficas finales a agencia de medios",
            status_key="handed_over",
            priority="low",
            assignee_id=lucia.id,
            due_date="2026-11-01",
            notes="Carpeta compartida con formatos adaptados.",
            position=2,
        ),
        TaskItem(
            group_id=g2_done.id,
            board_id=board_marketing.id,
            title="Definir identidad visual y paleta de colores del lanzamiento",
            status_key="done",
            priority="medium",
            assignee_id=carlos.id,
            due_date="2026-10-19",
            notes="Aprobado por todo el equipo.",
            position=0,
        ),
    ]

    db.add_all(roadmap_tasks + marketing_tasks)
    db.commit()

