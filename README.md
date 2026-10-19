# 🚀 Gestor de Proyectos (Estilo Monday.com)

Sistema moderno, visual e interactivo de gestión de proyectos, tareas y flujos de trabajo colaborativos inspirado en la experiencia de usuario de **Monday.com**.

---

## 📁 Estructura del Repositorio

```
GestorProyectos/
├── .agents/
│   ├── AGENTS.md            ← Documento Maestro de Contexto (Fuente Única de Verdad)
│   └── rules/
│       └── arquitectura.md  ← Puntero automático para Antigravity / Cursor
├── backend/                 ← API REST en Python 3.11+ + FastAPI + SQLAlchemy 2.0 + Pytest
├── frontend/                ← SPA en React 18 + Vite + TypeScript + Tailwind CSS + Zustand + Vitest
├── decisions_log.md         ← Bitácora de decisiones técnicas de arquitectura
├── .gitignore               ← Archivos y carpetas ignorados por Git
└── README.md                ← Este archivo
```

---

## ✨ Capacidades del Sistema (Fase 1 y Fase 2 Completadas)

1. **Autenticación SSO con Google y Microsoft (OAuth2 / OIDC + JWT):**
   - Soporte dual para credenciales reales (`GOOGLE_CLIENT_ID`, `MICROSOFT_CLIENT_ID`) y modo simulador de desarrollo (`AUTH_DEV_MODE=true`) con cambio rápido de usuario.
2. **Espacios de Trabajo (Workspaces) y Tableros (Boards):**
   - Navegación jerárquica con Sidebar colapsable estilo Monday Work OS y CRUD completo.
3. **Estados Personalizables por Tablero:**
   - 5 estados iniciales por defecto (`Listo` `#00c875`, `En Proceso` `#fdab3d`, `Bloqueado` `#e2445c`, `Traspasado` `#a25ddc`, `Sin Empezar` `#c4c4c4`) más creación/edición/eliminación de estados personalizados por tablero.
4. **Vista Tabla Principal Interactiva (Main Table):**
   - Grupos desplegables, edición inline con 1 clic (Título, Notas, Responsable, Estado, Prioridad, Fecha límite con semáforo de vencimiento, Horas estimadas y Presupuesto $), sumatorias automáticas por grupo en el pie de tabla, duplicación rápida de tareas y exportación a CSV.
5. **Vista Kanban con Drag & Drop:**
   - Columnas automáticas por estado con arrastre fluido de tarjetas, recálculo reactivo y alta rápida por columna.
6. **Vista Cronograma / Calendario (Timeline):**
   - Visualización de rango de fechas (`start_date` → `due_date`), duración en días y edición inline de fechas.
7. **Vista Dashboard Ejecutivo:**
   - Tarjetas KPI en vivo (Avance %, Tareas vencidas, Total Horas, Presupuesto Total) y gráficos de distribución por Estado, Prioridad, Carga por Responsable y Resumen Financiero por Grupo.
8. **Panel Lateral de Colaboración por Tarea (`ItemDetailDrawer`):**
   - Checklist interno con barra de progreso, comentarios del equipo e historial automático de actividad auditado.

---

## 🚦 Cómo Ejecutar el Proyecto Localmente

### 1. Levantar el Backend (FastAPI en puerto `8000`)
```bash
cd backend
./venv/bin/uvicorn app.main:app --reload --port 8000
```

### 2. Levantar el Frontend (Vite en puerto `5173`)
En otra terminal:
```bash
cd frontend
npm run dev
```
Luego abrí **`http://localhost:5173`** en el navegador.

---

## 🧪 Ejecutar Suites de Pruebas Automatizadas

- **Backend (24 tests en `pytest`):**
  ```bash
  cd backend && ./venv/bin/pytest -v
  ```
- **Frontend (19 tests en `Vitest` + Build TypeScript):**
  ```bash
  cd frontend && npm test -- --run && npm run build
  ```

