# decisions_log.md — Bitácora de Decisiones Técnicas y Estratégicas
> Este archivo documenta de forma cronológica todas las decisiones arquitectónicas, tecnológicas y de negocio tomadas en el proyecto.
> Cada entrada debe especificar: **Decisión**, **Razón** e **Impacto**.
> Solo el **Coordinador** está autorizado a asentar nuevas entradas en este registro tras la aprobación de los verificadores.

---

## [19/10/2026] — Inicio del Proyecto y Adopción de la Metodología Multiagente SDD (Spec-Driven Development)
- **Decisión:**
  1. Se inicia el desarrollo del Gestor de Proyectos (estilo Monday.com) adoptando la metodología multiagente probada en proyectos exitosos anteriores:
     - Conversación 1: **Coordinador** (diseño arquitectónico, planificación de sprints, prompts en bloques de 4 backticks ````, decisiones y commits/deploys exclusivos).
     - Conversaciones 2 y 3: **Implementadores** (Backend y Frontend, código limpio y modular, sin commits ni deploys).
     - Conversaciones 4 y 5: **Verificadores** (Backend y Frontend, auditoría rigurosa, ejecución de tests y veredicto explícito APROBADO ✅ / RECHAZADO ❌).
  2. Se establece [`.agents/AGENTS.md`](.agents/AGENTS.md) como la **fuente única de verdad** técnica y operativa del proyecto.
  3. Se establece el flujo de pruebas automatizadas locales con 100% de aprobación antes de cada integración a la rama principal de Git.
- **Razón:** Garantizar máxima velocidad de desarrollo sin sacrificar robustez técnica, eliminando regresiones, errores de diseño y código desordenado desde el día cero.
- **Impacto:** Arquitectura predecible, desacoplada y con trazabilidad completa de cada avance.

---

## [19/10/2026] — Definición de Stack Tecnológico (Opción A), Estados Personalizables y Login OAuth2 (Google y Microsoft) desde Sprint 1
- **Decisión:**
  1. **Stack Tecnológico Confirmado (Opción A):**
     - **Frontend (`frontend/`):** React 18 + Vite + TypeScript + Tailwind CSS + Lucide Icons + Zustand (con Optimistic Updates) + `@hello-pangea/dnd` / `@dnd-kit` + Vitest / React Testing Library.
     - **Backend (`backend/`):** Python 3.11+ + FastAPI + Pydantic v2 + SQLAlchemy 2.0 + PyJWT + HTTPX + Pytest.
     - **Base de Datos:** SQLite para desarrollo local y testing automatizado en memoria + PostgreSQL listo para producción mediante `DATABASE_URL`.
  2. **Estados por Defecto y Personalización por Tablero:**
     - Se adoptan 5 estados iniciales por defecto en cada tablero nuevo: `Listo` (`#00c875`), `En Proceso` (`#fdab3d`), `Bloqueado` (`#e2445c`), `Traspasado` (`#a25ddc`) y `Sin Empezar` (`#c4c4c4`), con soporte en el modelo de datos y API para personalizar etiquetas y colores por tablero.
  3. **Autenticación Completa desde Sprint 1 (Google & Microsoft OAuth2 / OIDC):**
     - Se implementa desde el Sprint 1 autenticación federada con **Google** (`accounts.google.com`) y **Microsoft / Entra ID** (`login.microsoftonline.com`) emitiendo sesiones firmadas con JWT (`HS256`).
     - Se incorpora el modo híbrido `AUTH_DEV_MODE`: cuando están configuradas las credenciales reales (`GOOGLE_CLIENT_ID`, `MICROSOFT_CLIENT_ID`, etc.) opera contra los proveedores OAuth reales; cuando se ejecuta en local sin credenciales externas aún configuradas o en suites de pruebas automatizadas (`AUTH_DEV_MODE=true`), habilita un flujo simulado determinístico de Google y Microsoft para garantizar testabilidad al 100% y cero bloqueo en desarrollo.
- **Razón:** Separar claramente las responsabilidades entre Frontend (React/TS) y Backend (Python/FastAPI) maximiza la efectividad de los agentes Implementadores y Verificadores independientes, mientras que el soporte OAuth2 dual (Google/Microsoft real + simulador local en dev/test) permite tener seguridad de nivel productivo desde el Sprint 1 sin frenar el flujo de pruebas locales.
- **Impacto:** El Sprint 1 se divide en **Sprint 1A (Backend: Modelos, Auth Google/Microsoft, Workspaces, Boards, StatusConfig y Semilla + Pytest)** y **Sprint 1B (Frontend: Pantalla de Login Google/Microsoft, Layout Monday, Sidebar de Workspaces/Boards + Vitest)**.

---

## [19/10/2026] — Cierre y Aprobación del Sprint 1A (Backend: Cimientos, OAuth2 Google/Microsoft, Workspaces, Boards y Estados Personalizables)
- **Decisión:**
  1. Se aprueba e integra en `backend/` la arquitectura base en **FastAPI + SQLAlchemy 2.0 + Pydantic v2 + PyJWT + HTTPX**.
  2. Se valida el motor dual de autenticación OAuth2 / OIDC para **Google** (`accounts.google.com`) y **Microsoft** (`login.microsoftonline.com`) con emisión de JWT (`HS256`) y simulador local protegido por `AUTH_DEV_MODE`.
  3. Se validan los endpoints protegidos de Workspaces (`/api/workspaces`), Boards (`/api/boards`) y estados personalizables por tablero (`/api/boards/{board_id}/statuses`) con reasignación automática de tareas al eliminar un estado y bloqueo ante eliminación del último estado restante.
- **Razón:** Auditoría del Verificador de Backend con veredicto **APROBADO ✅** y 11/11 tests automatizados en `pytest` pasando al 100% (0 fallos).
- **Impacto:** Backend del Sprint 1 listo y versionado en Git. Se habilita el inicio del **Sprint 1B (Frontend)**.

---

## [19/10/2026] — Cierre y Aprobación del Sprint 1B (Frontend: Login OAuth2 Google/Microsoft, Layout Monday, Workspaces, Boards y Personalizador de Estados)
- **Decisión:**
  1. Se aprueba e integra en `frontend/` la aplicación en **React 18 + Vite + TypeScript + Tailwind CSS + Lucide Icons + Zustand**.
  2. Se valida el flujo de autenticación OAuth2 / OIDC con **Google** y **Microsoft** en `LoginScreen.tsx` y `useAuthStore.ts` (modo OAuth real y modo `dev_simulator` con cambio rápido de usuario en cabecera).
  3. Se valida la navegación jerárquica de Workspaces y Tableros en `Sidebar.tsx`, la vista de tablero en `BoardView.tsx` con los 5 estados iniciales (`Listo`, `En Proceso`, `Bloqueado`, `Traspasado`, `Sin Empezar`) y el modal interactivo `StatusManagerModal.tsx` con actualizaciones optimistas y rollback.
- **Razón:** Auditoría del Verificador de Frontend con veredicto **APROBADO ✅**, 7/7 tests automatizados en `Vitest` pasando al 100% y build de producción (`tsc -b && vite build`) limpio con 0 errores.
- **Impacto:** Sprint 1 completado de punta a punta (Backend + Frontend). Se inicia el **Sprint 2 (Motor CRUD e Interactividad Inline de Grupos e Items)**.

---

## [19/10/2026] — Cierre y Aprobación del Sprint 2A (Backend: CRUD de Grupos, Items y Edición Inline de Celdas)
- **Decisión:**
  1. Se aprueba e integra en `backend/app/routers/groups_items_router.py` y `backend/app/schemas.py` el conjunto completo de endpoints CRUD para Grupos (`POST /api/boards/{board_id}/groups`, `PATCH /api/groups/{group_id}`, `DELETE /api/groups/{group_id}`) e Items (`POST /api/groups/{group_id}/items`, `PATCH /api/items/{item_id}`, `DELETE /api/items/{item_id}`).
  2. Se adopta el uso de `payload.model_fields_set` en Pydantic v2 dentro de `PATCH /api/items/{item_id}` para soportar edición inline parcial por celda y diferenciar campos omitidos vs. desasignación explícita (`"assignee_id": null`) o limpieza de fecha límite (`"due_date": null` / `""`).
- **Razón:** Auditoría del Verificador de Backend con veredicto **APROBADO ✅** y 15/15 tests automatizados en `pytest` pasando al 100% (0 fallos).
- **Impacto:** Backend del Sprint 2 completado. Se habilita el **Sprint 2B (Frontend: Vista Tabla Principal Interactiva con Edición Inline y Optimistic Updates)**.

---

## [19/10/2026] — Cierre y Aprobación del Sprint 2B (Frontend: Vista Tabla Principal Interactiva, CRUD de Grupos/Items y Edición Inline con Optimistic Updates)
- **Decisión:**
  1. Se aprueba e integra en `frontend/` la Vista Tabla Principal interactiva (`BoardView.tsx`) conectada a `useWorkspaceStore.ts` con clonación defensiva (`cloneBoard`), **Optimistic Updates** inmediatos y **rollback automático** ante errores de red/API.
  2. Se valida el CRUD completo de Grupos (`+ Nuevo Grupo`, edición inline de nombre/color y eliminación), la fila rápida `+ Agregar tarea...` al pie de cada grupo y la edición inline con 1 clic de todas las celdas (Título, Notas, Responsable con opción `"Sin asignar"`, Estado dinámico, Prioridad, Fecha límite con alerta `"Vencida"`, movimiento entre grupos y eliminación de tarea).
  3. Se añade `*.tsbuildinfo` a `.gitignore` para excluir cachés incrementales de TypeScript del control de versiones.
- **Razón:** Auditoría del Verificador de Frontend con veredicto **APROBADO ✅**, 12/12 tests automatizados en `Vitest` (3 suites) pasando al 100% y build de producción limpio con 0 errores.
- **Impacto:** Sprint 2 completado de punta a punta. Se inicia el **Sprint 3 (Actividad/Comentarios, Checklist por Tarea, Vista Kanban con Drag & Drop, Filtros en Vivo y Panel Lateral de Detalle / Item Drawer)**.

---

## [19/10/2026] — Cierre y Aprobación del Sprint 3A (Backend: Comentarios, Checklist Interno e Historial de Actividad por Tarea)
- **Decisión:**
  1. Se aprueba e integra en `backend/app/models.py`, `backend/app/schemas.py` y `backend/app/routers/item_collaboration_router.py` el modelo de colaboración por tarea (`TaskComment`, `TaskChecklistItem`, `TaskActivityLog`) con borrado en cascada (`all, delete-orphan`).
  2. Se exponen los contadores `comments_count`, `checklist_total` y `checklist_completed` en `TaskItemRead` y se habilita la auditoría automática en `TaskActivityLog` ante la creación de tareas, cambios efectivos de celda en `PATCH /api/items/{item_id}`, comentarios y checklist.
  3. Se actualiza `seed.py` con bloque defensivo para poblar datos iniciales de colaboración incluso sobre bases SQLite preexistentes.
- **Razón:** Auditoría del Verificador de Backend con veredicto **APROBADO ✅** y 19/19 tests automatizados en `pytest` pasando al 100% (0 fallos).
- **Impacto:** Backend del MVP Fase 1 completado al 100%. Se habilita el **Sprint 3B (Frontend: Vista Kanban con Drag & Drop, Barra de Búsqueda/Filtros en Vivo y Panel Lateral `ItemDetailDrawer`)**.

---

## [19/10/2026] — Cierre y Aprobación del Sprint 3B (Frontend: Vista Kanban con Drag & Drop, Búsqueda/Filtros en Vivo y Panel Lateral `ItemDetailDrawer`) — MVP Fase 1 Completado
- **Decisión:**
  1. Se aprueba e integra en `frontend/` la Vista Kanban interactiva (`KanbanView.tsx`) con columnas dinámicas por estado del tablero, Drag & Drop de tarjetas entre columnas con **Optimistic Update** sincronizado en tiempo real con la Vista Tabla Principal, y creación rápida de tarjetas por columna.
  2. Se integra la barra de búsqueda y filtros en vivo en `BoardView.tsx` (por texto, persona asignada, estado y prioridad), aplicable simultáneamente a la Vista Tabla y a la Vista Kanban.
  3. Se integra el Panel Lateral de Detalle y Colaboración (`ItemDetailDrawer.tsx`) con pestañas de **Checklist Interno** (con barra de progreso porcentual), **Comentarios** e **Historial de Actividad**, manteniendo sincronizados en vivo los contadores `comments_count`, `checklist_total` y `checklist_completed` en las filas y tarjetas del tablero.
- **Razón:** Auditoría del Verificador de Frontend con veredicto **APROBADO ✅**, 15/15 tests automatizados en `Vitest` (4 suites) pasando al 100% y build de producción limpio con 0 errores.
- **Impacto:** **MVP Fase 1 completado al 100%** con 34 pruebas automatizadas totales en verde (**19 en Backend `pytest` + 15 en Frontend `Vitest`**).

---

## [19/10/2026] — Cierre y Aprobación de la Fase 2 Completa (Analítica Ejecutiva, Columnas de Presupuesto/Horas, Cronograma, Duplicación y CSV)
- **Decisión:**
  1. Se aprueba e integra en `backend/` la ampliación de `TaskItem` (`start_date`, `estimated_hours`, `budget`) con validación de no negatividad (`validate_non_negative_float`), migración defensiva e idempotente de esquema SQLite (`ensure_phase2_schema`), endpoints de duplicación de tareas (`POST /api/items/{item_id}/duplicate`), motor de analítica de tablero (`GET /api/boards/{board_id}/analytics`) y exportación a CSV (`GET /api/boards/{board_id}/export.csv`).
  2. Se aprueba e integra en `frontend/` la Vista Tabla con inputs inline de horas y presupuesto, sumatorias automáticas en el pie de grupo (`tfoot`), botón de duplicación por fila, botón de exportación CSV en cabecera, la nueva Vista Cronograma / Calendario (`TimelineCalendarView.tsx`) con rango de fechas y duración en días, y la nueva Vista Dashboard Ejecutivo (`DashboardView.tsx`) con KPIs en vivo y desgloses por estado, prioridad, responsable y grupo.
- **Razón:** Auditoría independiente de los Verificadores de Backend y Frontend con veredicto **APROBADO ✅** en ambos roles, 43 pruebas automatizadas locales pasando al 100% (**24 en Pytest + 19 en Vitest**) y compilación limpia de producción.
- **Impacto:** Fase 2 completada al 100% sin regresiones. Se habilita la planificación e implementación de la **Fase 3 (Vista Global 'Mi Trabajo', Automatizaciones estilo Monday y Empaquetado Productivo Docker)**.


