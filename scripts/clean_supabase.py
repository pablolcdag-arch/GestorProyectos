from sqlalchemy import create_engine
from sqlalchemy.orm import Session
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.models import (
    User, Workspace, Board, BoardStatusConfig, TaskGroup, 
    TaskItem, TaskComment, TaskChecklistItem, TaskActivityLog, BoardAutomation,
    DEFAULT_BOARD_STATUSES, DEFAULT_BOARD_GROUPS
)

DATABASE_URL = "postgresql://postgres.xwvfrmxkzzblchxgyuoi:MiPasswordSeguro123!@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

def main():
    engine = create_engine(DATABASE_URL)
    with Session(engine) as db:
        print("Eliminando tareas, checklist, logs, comentarios y grupos...")
        db.query(TaskActivityLog).delete()
        db.query(TaskChecklistItem).delete()
        db.query(TaskComment).delete()
        db.query(TaskItem).delete()
        db.query(TaskGroup).delete()
        db.query(BoardAutomation).delete()
        db.query(BoardStatusConfig).delete()
        db.query(Board).delete()
        db.query(Workspace).delete()
        
        print("Eliminando usuarios demo (@gestor.dev)...")
        db.query(User).filter(User.email.like("%@gestor.dev")).delete()
        db.commit()
        
        real_user = db.query(User).filter(User.email == "pablo.lcdag@gmail.com").first()
        if not real_user:
            print("Usuario pablo.lcdag@gmail.com no encontrado!")
            return
            
        print(f"Usuario real encontrado: {real_user.full_name} ({real_user.email}) ID: {real_user.id}")
        
        print("Creando workspace inicial limpio...")
        ws = Workspace(
            name="Mi Espacio de Trabajo",
            description="Espacio principal de gestión",
            icon="Briefcase",
            color="#0073ea",
            owner_id=real_user.id,
        )
        db.add(ws)
        db.commit()
        db.refresh(ws)
        
        print(f"Creando tablero principal (ID WS: {ws.id})...")
        board = Board(
            name="Tablero Principal",
            description="Gestioná tus tareas y proyectos visualmente",
            workspace_id=ws.id,
        )
        db.add(board)
        db.commit()
        db.refresh(board)
        
        print("Configurando estados por defecto...")
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
            
        print("Creando grupos vacíos (0 tareas)...")
        for grp in DEFAULT_BOARD_GROUPS:
            db.add(
                TaskGroup(
                    board_id=board.id,
                    title=str(grp["title"]),
                    color=str(grp["color"]),
                    position=int(grp["position"]),
                    collapsed=bool(grp.get("collapsed", False)),
                )
            )
        
        print("Configurando automatizaciones...")
        db.add_all([
            BoardAutomation(
                board_id=board.id,
                rule_type="when_checklist_complete_set_status",
                target_status_key="done",
                is_active=True,
            ),
            BoardAutomation(
                board_id=board.id,
                rule_type="when_status_done_complete_checklist",
                target_status_key="done",
                is_active=True,
            ),
            BoardAutomation(
                board_id=board.id,
                rule_type="when_status_blocked_log_alert",
                target_status_key="done",
                is_active=True,
            ),
        ])
        
        db.commit()
        
        u_count = db.query(User).count()
        ws_count = db.query(Workspace).count()
        b_count = db.query(Board).count()
        t_count = db.query(TaskItem).count()
        print(f"✅ Limpieza finalizada: Usuarios={u_count}, Workspaces={ws_count}, Tableros={b_count}, Tareas={t_count}")

if __name__ == "__main__":
    main()

