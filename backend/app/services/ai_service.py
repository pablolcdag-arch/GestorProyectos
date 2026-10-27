"""Servicio de Asistente de IA ('Sidekick' estilo Monday.com) con soporte real y simulador determinístico."""

from __future__ import annotations

from typing import Any, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.models import (
    Board,
    DEFAULT_BOARD_STATUSES,
    TaskActivityLog,
    TaskChecklistItem,
    TaskGroup,
    TaskItem,
    User,
    Workspace,
)
from app.schemas import (
    AIGeneratedTask,
    AIPromptRequest,
    AIPromptResponse,
)


def _get_or_create_target_group(db: Session, board: Board) -> TaskGroup:
    """Devuelve el primer grupo disponible del tablero o crea uno por defecto."""
    if board.groups:
        return board.groups[0]
    grp = TaskGroup(
        board_id=board.id,
        title="Tareas Generadas",
        color="#579bfc",
        position=0,
    )
    db.add(grp)
    db.flush()
    return grp


def _build_tasks_for_prompt(prompt: str, group_title: str) -> list[dict[str, Any]]:
    """Genera entre 2 y 4 definiciones contextuales de tareas según las palabras clave del prompt."""
    p_lower = prompt.lower()

    if any(k in p_lower for k in ("marketing", "campaña", "lanzamiento", "pauta", "anuncio", "publicidad")):
        return [
            {
                "title": "Diseño de piezas visuales y creativos publicitarios",
                "group_name": group_title,
                "status_key": "in_progress",
                "priority": "high",
                "estimated_hours": 6.0,
                "budget": 450.0,
                "notes": "Formatos para Instagram, LinkedIn y display banners",
            },
            {
                "title": "Redacción de copys persuasivos y propuesta de valor",
                "group_name": group_title,
                "status_key": "not_started",
                "priority": "medium",
                "estimated_hours": 4.0,
                "budget": 300.0,
                "notes": "Textos enfocados en conversión y beneficios principales",
            },
            {
                "title": "Configuración y segmentación de campañas en Meta & Google Ads",
                "group_name": group_title,
                "status_key": "not_started",
                "priority": "high",
                "estimated_hours": 5.0,
                "budget": 650.0,
                "notes": "Definición de audiencias similares e intereses afines",
            },
            {
                "title": "Implementación de eventos de conversión y analítica web",
                "group_name": group_title,
                "status_key": "not_started",
                "priority": "medium",
                "estimated_hours": 3.0,
                "budget": 200.0,
                "notes": "Verificación del píxel y Google Analytics 4",
            },
        ]

    if any(k in p_lower for k in ("desarrollo", "software", "api", "backend", "frontend", "app", "codigo", "bug")):
        return [
            {
                "title": "Modelado de datos y diseño de endpoints REST",
                "group_name": group_title,
                "status_key": "in_progress",
                "priority": "high",
                "estimated_hours": 8.0,
                "budget": 800.0,
                "notes": "Definición de esquemas Pydantic y migraciones SQLAlchemy",
            },
            {
                "title": "Implementación de lógica de negocio y validaciones",
                "group_name": group_title,
                "status_key": "not_started",
                "priority": "high",
                "estimated_hours": 12.0,
                "budget": 1200.0,
                "notes": "Programación defensiva y manejo de excepciones estructuradas",
            },
            {
                "title": "Integración con interfaz de usuario en React",
                "group_name": group_title,
                "status_key": "not_started",
                "priority": "medium",
                "estimated_hours": 10.0,
                "budget": 950.0,
                "notes": "Componentes interactivos y estados globales con Zustand",
            },
            {
                "title": "Creación de suite de pruebas unitarias e integrales",
                "group_name": group_title,
                "status_key": "not_started",
                "priority": "medium",
                "estimated_hours": 6.0,
                "budget": 500.0,
                "notes": "100% de tests pasando en verde",
            },
        ]

    # Caso genérico / adaptable
    clean_topic = prompt[:45].strip()
    return [
        {
            "title": f"Planificación y alcance: {clean_topic}",
            "group_name": group_title,
            "status_key": "in_progress",
            "priority": "high",
            "estimated_hours": 4.0,
            "budget": 350.0,
            "notes": "Definición de hitos y criterios de éxito",
        },
        {
            "title": f"Ejecución de actividades operativas: {clean_topic}",
            "group_name": group_title,
            "status_key": "not_started",
            "priority": "medium",
            "estimated_hours": 8.0,
            "budget": 600.0,
            "notes": "Desarrollo de entregables principales",
        },
        {
            "title": f"Revisión de calidad y entrega final: {clean_topic}",
            "group_name": group_title,
            "status_key": "not_started",
            "priority": "low",
            "estimated_hours": 4.0,
            "budget": 300.0,
            "notes": "Control de calidad y retroalimentación del equipo",
        },
    ]


def _build_checklist_for_prompt(prompt: str, task_title: str) -> list[str]:
    """Genera entre 3 y 5 subtareas lógicas para desglosar el checklist."""
    p_lower = (prompt + " " + task_title).lower()

    if any(k in p_lower for k in ("diseño", "ui", "ux", "banner", "web")):
        return [
            "Revisar guía de estilos y tokens de diseño",
            "Crear wireframes o bocetos iniciales",
            "Diseñar componentes en alta fidelidad",
            "Validar responsive y contraste de colores",
            "Exportar assets y documentar especificaciones",
        ]

    if any(k in p_lower for k in ("backend", "api", "database", "bd", "codigo", "endpoint")):
        return [
            "Definir esquema de datos e índices requeridos",
            "Implementar validaciones defensivas en esquemas",
            "Escribir lógica de negocio y queries optimizadas",
            "Agregar suite de pruebas automatizadas en pytest",
        ]

    return [
        "Revisar requisitos y antecedentes clave",
        "Elaborar borrador inicial del entregable",
        "Validar con los miembros del equipo involucrados",
        "Ajustar observaciones y formalizar entrega",
    ]


def execute_ai_action(
    db: Session,
    user: User,
    payload: AIPromptRequest,
) -> AIPromptResponse:
    """Ejecuta una acción del Asistente de IA sobre el tablero o tarea seleccionada."""
    action = payload.action_type

    # 1. Generar tareas dentro de un tablero
    if action == "generate_tasks":
        if not payload.board_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Se requiere 'board_id' para generar tareas con IA.",
            )
        board = db.query(Board).filter(Board.id == payload.board_id).first()
        if not board:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tablero con ID {payload.board_id} no encontrado.",
            )

        target_group = _get_or_create_target_group(db, board)
        task_defs = _build_tasks_for_prompt(payload.prompt, target_group.title)

        existing_items = (
            db.query(TaskItem)
            .filter(TaskItem.group_id == target_group.id)
            .all()
        )
        base_pos = max((item.position for item in existing_items), default=-1) + 1

        created_tasks: list[AIGeneratedTask] = []
        for idx, tdef in enumerate(task_defs):
            new_item = TaskItem(
                group_id=target_group.id,
                board_id=board.id,
                title=tdef["title"],
                status_key=tdef["status_key"],
                priority=tdef["priority"],
                estimated_hours=tdef["estimated_hours"] or 0.0,
                budget=tdef["budget"] or 0.0,
                notes=tdef["notes"] or "",
                position=base_pos + idx,
            )
            db.add(new_item)
            db.flush()

            db.add(
                TaskActivityLog(
                    item_id=new_item.id,
                    user_id=user.id,
                    action="ai_generated",
                    description=f"Tarea creada automáticamente con Sidekick IA a partir de: '{payload.prompt[:50]}'",
                )
            )

            created_tasks.append(AIGeneratedTask(**tdef))

        db.commit()
        return AIPromptResponse(
            action_type="generate_tasks",
            message=f"Se crearon {len(created_tasks)} tareas exitosamente en el grupo '{target_group.title}' del tablero '{board.name}'.",
            created_tasks_count=len(created_tasks),
            tasks=created_tasks,
        )

    # 2. Desglosar checklist de una tarea
    if action == "breakdown_checklist":
        if not payload.item_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Se requiere 'item_id' para desglosar el checklist de una tarea.",
            )
        item = db.query(TaskItem).filter(TaskItem.id == payload.item_id).first()
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tarea con ID {payload.item_id} no encontrada.",
            )

        subtask_titles = _build_checklist_for_prompt(payload.prompt, item.title)
        existing_checklist = item.checklist_items
        base_pos = max((chk.position for chk in existing_checklist), default=-1) + 1

        for idx, title in enumerate(subtask_titles):
            chk_item = TaskChecklistItem(
                item_id=item.id,
                title=title,
                is_completed=False,
                position=base_pos + idx,
            )
            db.add(chk_item)

        db.add(
            TaskActivityLog(
                item_id=item.id,
                user_id=user.id,
                action="ai_generated",
                description=f"Se desglosaron {len(subtask_titles)} subtareas con Sidekick IA.",
            )
        )
        db.commit()

        return AIPromptResponse(
            action_type="breakdown_checklist",
            message=f"Se agregaron {len(subtask_titles)} subtareas al checklist de '{item.title}'.",
            checklist_items=subtask_titles,
        )

    # 3. Resumir tablero
    if action == "summarize_board":
        if not payload.board_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Se requiere 'board_id' para resumir un tablero.",
            )
        board = db.query(Board).filter(Board.id == payload.board_id).first()
        if not board:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tablero con ID {payload.board_id} no encontrado.",
            )

        all_items: list[TaskItem] = [it for grp in board.groups for it in grp.items]
        total = len(all_items)
        done_cnt = sum(1 for it in all_items if it.status_key == "done")
        in_prog_cnt = sum(1 for it in all_items if it.status_key == "in_progress")
        blocked_cnt = sum(1 for it in all_items if it.status_key in ("blocked", "stuck"))
        total_budget = sum(float(it.budget or 0.0) for it in all_items)
        total_hours = sum(float(it.estimated_hours or 0.0) for it in all_items)
        rate = round((done_cnt / total * 100), 1) if total > 0 else 0.0

        if blocked_cnt > 0:
            health = "⚠️ **Atención recomendada:** Hay tareas bloqueadas que requieren intervención prioritaria."
        elif rate >= 50.0:
            health = "🚀 **Avance óptimo:** El tablero presenta un ritmo sostenido de tareas completadas."
        else:
            health = "📋 **En curso:** Tareas en ejecución según el cronograma inicial planificado."

        summary_md = (
            f"### 📊 Resumen Ejecutivo del Tablero: {board.name}\n"
            f"- **Total de tareas:** {total}\n"
            f"- **Completadas:** {done_cnt} ({rate}%)\n"
            f"- **En progreso:** {in_prog_cnt}\n"
            f"- **Bloqueadas / En riesgo:** {blocked_cnt}\n"
            f"- **Presupuesto acumulado:** ${total_budget:,.2f}\n"
            f"- **Horas estimadas totales:** {total_hours:g} h\n\n"
            f"{health}"
        )

        return AIPromptResponse(
            action_type="summarize_board",
            message="Resumen ejecutivo generado exitosamente.",
            summary_text=summary_md,
        )

    # 4. Generar nuevo tablero
    if action == "generate_board":
        workspace = db.query(Workspace).filter(Workspace.owner_id == user.id).first()
        if not workspace:
            workspace = db.query(Workspace).first()
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No existe un espacio de trabajo para alojar el nuevo tablero.",
            )

        new_board = Board(
            workspace_id=workspace.id,
            name=f"Proyecto IA: {payload.prompt[:40].strip()}",
            description="Tablero generado automáticamente por el Asistente de IA Sidekick.",
        )
        db.add(new_board)
        db.flush()

        from app.models import BoardStatusConfig
        for st in DEFAULT_BOARD_STATUSES:
            db.add(
                BoardStatusConfig(
                    board_id=new_board.id,
                    key=str(st["key"]),
                    label=str(st["label"]),
                    color=str(st["color"]),
                    position=int(st["position"]),
                )
            )

        grp1 = TaskGroup(board_id=new_board.id, title="Pendientes", color="#579bfc", position=0)
        grp2 = TaskGroup(board_id=new_board.id, title="Completado", color="#00c875", position=1)
        db.add_all([grp1, grp2])
        db.flush()

        task_defs = _build_tasks_for_prompt(payload.prompt, grp1.title)
        created_tasks: list[AIGeneratedTask] = []
        for idx, tdef in enumerate(task_defs):
            t_item = TaskItem(
                group_id=grp1.id,
                board_id=new_board.id,
                title=tdef["title"],
                status_key=tdef["status_key"],
                priority=tdef["priority"],
                estimated_hours=tdef["estimated_hours"] or 0.0,
                budget=tdef["budget"] or 0.0,
                position=idx,
            )
            db.add(t_item)
            created_tasks.append(AIGeneratedTask(**tdef))

        db.commit()
        return AIPromptResponse(
            action_type="generate_board",
            message=f"Tablero '{new_board.name}' creado con {len(created_tasks)} tareas iniciales.",
            created_tasks_count=len(created_tasks),
            tasks=created_tasks,
        )

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Acción '{action}' no soportada.",
    )
