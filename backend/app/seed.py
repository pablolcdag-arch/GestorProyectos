"""Datos semilla iniciales (Usuarios, Workspaces, Tableros, Estados, Grupos y Tareas)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import (
    DEFAULT_BOARD_STATUSES,
    Board,
    BoardAutomation,
    BoardStatusConfig,
    TaskActivityLog,
    TaskChecklistItem,
    TaskComment,
    TaskGroup,
    TaskItem,
    User,
    Workspace,
)

DEFAULT_BOARD_AUTOMATIONS: list[dict[str, str | bool]] = [
    {
        "rule_type": "when_checklist_complete_set_status",
        "target_status_key": "done",
        "is_active": True,
    },
    {
        "rule_type": "when_status_done_complete_checklist",
        "target_status_key": "done",
        "is_active": True,
    },
    {
        "rule_type": "when_status_blocked_log_alert",
        "target_status_key": "done",
        "is_active": True,
    },
]


def seed_initial_data(db: Session) -> None:
    """Puebla la base de datos con el equipo inicial, workspaces y tableros si está vacía y SEED_DEMO_DATA está activo."""
    from app.config import settings
    if not settings.SEED_DEMO_DATA:
        return

    if db.query(User).count() > 0:
        dirty = False
        # Si la DB local fue creada en Sprints previos, asegurar semilla de colaboración si está vacía
        if (
            db.query(TaskComment).count() == 0
            and db.query(TaskChecklistItem).count() == 0
            and db.query(TaskActivityLog).count() == 0
        ):
            first_item = db.query(TaskItem).order_by(TaskItem.id.asc()).first()
            first_user = db.query(User).order_by(User.id.asc()).first()
            if first_item and first_user:
                _seed_collaboration_for_items(
                    db=db,
                    primary_item=first_item,
                    secondary_item=first_item,
                    ana=first_user,
                    carlos=first_user,
                    lucia=first_user,
                )
                dirty = True

        # Poblar métricas de Fase 2 en tareas semilla preexistentes si todas están en 0
        all_items = db.query(TaskItem).order_by(TaskItem.id.asc()).all()
        if all_items and all(
            it.estimated_hours == 0.0 and it.budget == 0.0 and it.start_date is None
            for it in all_items
        ):
            default_metrics = [
                ("2026-10-18", 16.0, 2400.0),
                ("2026-10-16", 12.0, 1800.0),
                ("2026-10-20", 24.0, 3600.0),
                ("2026-10-24", 10.0, 1500.0),
                ("2026-10-27", 8.0, 950.0),
                ("2026-10-15", 6.0, 750.0),
            ]
            for idx, item in enumerate(all_items):
                s_date, hrs, bdg = default_metrics[idx % len(default_metrics)]
                item.start_date = s_date
                item.estimated_hours = hrs
                item.budget = bdg
            dirty = True

        # Asegurar reglas de automatización por defecto en el primer tablero si no existen
        if db.query(BoardAutomation).count() == 0:
            first_board = db.query(Board).order_by(Board.id.asc()).first()
            if first_board:
                for auto in DEFAULT_BOARD_AUTOMATIONS:
                    db.add(
                        BoardAutomation(
                            board_id=first_board.id,
                            rule_type=str(auto["rule_type"]),
                            target_status_key=str(auto["target_status_key"]),
                            is_active=bool(auto["is_active"]),
                        )
                    )
                dirty = True

        if dirty:
            db.commit()
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

    # Crear las 3 reglas de automatización por defecto en el Tablero Roadmap
    for auto in DEFAULT_BOARD_AUTOMATIONS:
        db.add(
            BoardAutomation(
                board_id=board_roadmap.id,
                rule_type=str(auto["rule_type"]),
                target_status_key=str(auto["target_status_key"]),
                is_active=bool(auto["is_active"]),
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
            start_date="2026-10-18",
            due_date="2026-10-25",
            estimated_hours=16.0,
            budget=2400.0,
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
            start_date="2026-10-16",
            due_date="2026-10-22",
            estimated_hours=12.0,
            budget=1800.0,
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
            start_date="2026-10-20",
            due_date="2026-10-28",
            estimated_hours=24.0,
            budget=3600.0,
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
            start_date="2026-10-24",
            due_date="2026-11-02",
            estimated_hours=10.0,
            budget=1500.0,
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
            start_date="2026-10-27",
            due_date="2026-11-05",
            estimated_hours=8.0,
            budget=950.0,
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
            start_date="2026-10-15",
            due_date="2026-10-20",
            estimated_hours=6.0,
            budget=750.0,
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
            start_date="2026-10-18",
            due_date="2026-10-24",
            estimated_hours=10.0,
            budget=1200.0,
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
            start_date="2026-10-20",
            due_date="2026-10-26",
            estimated_hours=14.0,
            budget=2100.0,
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
            start_date="2026-10-21",
            due_date="2026-10-30",
            estimated_hours=20.0,
            budget=4500.0,
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
            start_date="2026-10-22",
            due_date="2026-10-27",
            estimated_hours=4.0,
            budget=8000.0,
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
            start_date="2026-10-25",
            due_date="2026-11-01",
            estimated_hours=12.0,
            budget=1600.0,
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
            start_date="2026-10-14",
            due_date="2026-10-19",
            estimated_hours=8.0,
            budget=1100.0,
            notes="Aprobado por todo el equipo.",
            position=0,
        ),
    ]

    db.add_all(roadmap_tasks + marketing_tasks)
    db.flush()

    _seed_collaboration_for_items(
        db=db,
        primary_item=roadmap_tasks[0],
        secondary_item=roadmap_tasks[2],
        ana=ana,
        carlos=carlos,
        lucia=lucia,
    )
    db.commit()


def _seed_collaboration_for_items(
    db: Session,
    primary_item: TaskItem,
    secondary_item: TaskItem,
    ana: User,
    carlos: User,
    lucia: User,
) -> None:
    """Agrega comentarios, checklist interno e historial de actividad inicial."""
    comments = [
        TaskComment(
            item_id=primary_item.id,
            author_id=ana.id,
            content="Ya quedaron listos los endpoints de autorización para Google y Microsoft con soporte dual.",
        ),
        TaskComment(
            item_id=primary_item.id,
            author_id=carlos.id,
            content="Excelente, verifiqué también el flujo con cuentas de desarrollo y tokens JWT firmados.",
        ),
    ]
    checklist = [
        TaskChecklistItem(
            item_id=primary_item.id,
            title="Configurar proveedor OAuth2 de Google",
            is_completed=True,
            position=0,
        ),
        TaskChecklistItem(
            item_id=primary_item.id,
            title="Configurar proveedor OAuth2 de Microsoft Entra ID",
            is_completed=True,
            position=1,
        ),
        TaskChecklistItem(
            item_id=primary_item.id,
            title="Documentar variables de entorno en .env.example",
            is_completed=False,
            position=2,
        ),
    ]
    activities = [
        TaskActivityLog(
            item_id=primary_item.id,
            user_id=ana.id,
            action="item_created",
            description=f"Creó la tarea '{primary_item.title}'",
        ),
        TaskActivityLog(
            item_id=primary_item.id,
            user_id=ana.id,
            action="status_changed",
            description="Cambió el estado a 'En Proceso'",
        ),
        TaskActivityLog(
            item_id=secondary_item.id,
            user_id=lucia.id,
            action="item_created",
            description=f"Creó la tarea '{secondary_item.title}'",
        ),
    ]
    db.add_all(comments + checklist + activities)


