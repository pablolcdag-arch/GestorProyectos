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

---

## [19/10/2026] — Cierre y Aprobación de la Fase 3 Completa (Vista Global "Mi Trabajo", Automatizaciones estilo Monday y Docker) — Producto Terminado
- **Decisión:**
  1. Se aprueba e integra en `backend/` el modelo `BoardAutomation`, el motor de disparo reactivo de automatizaciones (`run_board_automations`) con las 3 recetas oficiales de Monday.com (Checklist 100% → Estado Listo, Estado Listo → Checklist 100%, Estado Bloqueado → Alerta prioritaria), el router de automatizaciones (`/api/boards/{board_id}/automations`) y el endpoint global `GET /api/my-work` con cubetas temporales exactas (`overdue`, `today`, `this_week`, `upcoming`, `completed`).
  2. Se aprueba e integra en `frontend/` la navegación y Vista Global **"Mi Trabajo"** (`MyWorkView.tsx`) con KPIs consolidados y edición inline directa de tareas asignadas al usuario, el modal de automatizaciones (`AutomationsModal.tsx`) con switches interactivos por tablero, y el botón de acceso en el Sidebar con badge dinámico.
  3. Se aprueba e integra la infraestructura de contenedorización productiva con `backend/Dockerfile` (Python 3.11-slim + Uvicorn), `frontend/Dockerfile` (Node 20 build + Nginx Alpine con SPA fallback y proxy `/api/`) y `docker-compose.yml` orquestando PostgreSQL 16, backend y frontend.
- **Razón:** Auditoría independiente de los Verificadores de Backend y Frontend con veredicto **APROBADO ✅** en ambos roles, 50 pruebas automatizadas locales pasando al 100% (**29 en Pytest + 21 en Vitest**) y build de producción de Vite limpio con 0 errores.
- **Impacto:** **Gestor de Proyectos (Estilo Monday.com) Completado al 100% en sus 3 Fases.** Sistema robusto, ultra-rápido, visual y listo para despliegue productivo.

---

## [20/10/2026] — Despliegue en la Nube 100% Gratuito (Render + Supabase + Vercel) y Activación de Google OAuth2 en Producción
- **Decisión:**
  1. **Infraestructura Cloud ($0 Costo):**
     - **Base de Datos:** Se migra la persistencia productiva a PostgreSQL alojado en Supabase (AWS us-east-1) utilizando el pooler Supavisor IPv4 (`aws-0-us-east-1.pooler.supabase.com:5432`) para compatibilidad total con redes IPv4 y evitar bloqueos de red en el Free Tier de Render.
     - **Backend:** Se despliega FastAPI en Render Web Service (`https://gestor-proyectos-api-yek6.onrender.com`), incorporando el driver `psycopg[binary]>=3.1.18` para compatibilidad nativa con SQLAlchemy 2.1 sobre PostgreSQL.
     - **Frontend:** Se despliega la SPA en Vercel (`https://gestor-proyectos-sandy.vercel.app`) configurando rewrites en `vercel.json` y horneando la URL de producción de la API en el bundle con defensas robustas contra respuestas no JSON.
  2. **Google OAuth2 Federado en Producción:**
     - Se crea y publica la pantalla de consentimiento de OAuth en Google Cloud Platform ("En producción", tipo externo, alcances `openid`, `email`, `profile`).
     - Se configuran `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en las variables de entorno de Render, desactivando el modo simulador (`AUTH_DEV_MODE=false`) y la precarga de datos de prueba (`SEED_DEMO_DATA=false`).
     - Se normaliza la URL de redireccionamiento en el frontend (`getNormalizedRedirectUri`) para garantizar correspondencia exacta sin trailing slashes contra los URIs autorizados en Google Cloud Console.
  3. **Onboarding Limpio y Base de Datos Prístina:**
     - Se implementa `ensure_user_default_workspace` para aprovisionar automáticamente un Espacio de Trabajo ("Mi Espacio de Trabajo") y un Tablero ("Tablero Principal") con sus 5 estados y 2 grupos vacíos ante el primer login de un nuevo usuario autenticado por Google.
     - Se purgan todas las cuentas y tareas semilla de prueba (`@gestor.dev`), dejando la base de datos de producción con 0 tareas demo, lista para uso de clientes reales.
- **Razón:** Permitir que clientes e interesados prueben la aplicación online de forma inmediata, segura, sin costos de hosting y con sus cuentas reales de Google, ingresando a un tablero limpio y operativo sin tareas ficticias de ejemplo.
- **Impacto:** Sistema productivo en vivo, accesible en todo el mundo, con ciclo de vida de autenticación real y base de datos relacional PostgreSQL en la nube.

---

## [26/10/2026] — Sprint 1: Integración de Design Tokens Oficiales, Tipografía Figtree y Celdas Pixel-Perfect (Fidelidad 1:1 Monday.com)
- **Decisión:**
  1. **Tipografía Oficial Figtree:**
     - Se integra la tipografía `Figtree` (pesos 300 a 700) desde Google Fonts con preconnect en `frontend/index.html` y se configura en `frontend/src/index.css` y `frontend/tailwind.config.js`.
  2. **Geometría y Styling de Filas y Celdas (36px):**
     - Altura de fila estricta de `36px` (`h-9 min-h-[36px] max-h-[36px] leading-[36px]`).
     - Borde de celda Monday.com exacto: `1px solid #d0d4e4` (`border-[#d0d4e4]`).
     - Hover de fila `#f6f7fb`, foco de celda `#0073ea` sin saltos de layout y texto en `#323338` / `#676879`.
     - Borde de acento de grupo de `4px solid <color_grupo>`.
  3. **Anchos de Columna Específicos:**
     - Checkbox: `w-10 min-w-[40px] max-w-[40px]`.
     - Tarea Sticky: `w-[331px] min-w-[331px] sticky left-10`.
     - Responsable: `w-[98px] min-w-[98px]`.
     - Estado: `w-[134px] min-w-[134px]`.
     - Métricas / Prioridad / Presupuesto: `w-[140px] min-w-[140px]`.
  4. **Blindaje Metodológico SDD (1-Clic y Resumen Conciso):**
     - Se actualiza `.agents/AGENTS.md` formalizando la entrega obligatoria de reportes dentro de un único bloque de código Markdown para copia y transferencia con 1 solo clic.
- **Razón:** Auditoría técnica independiente del Verificador Frontend con veredicto **APROBADO ✅**, build de producción de Vite exitoso en 1.68s, 24/24 tests en Vitest y 29/29 tests en Pytest pasando al 100% (53 tests en verde sin regresiones).
- **Impacto:** La tabla principal alcanza paridad estética y geométrica inmediata con Monday.com, sentando las bases visuales para los componentes avanzados de los siguientes sprints.

---

## [26/10/2026] — Sprint 2: Componente Status Picker Custom y Modo "Editar Etiquetas" con Paleta Oficial de 40 Colores
- **Decisión:**
  1. **Componente StatusCell y Popover Flotante:**
     - Se reemplaza el select nativo invisible por el componente `StatusCell.tsx`, con píldora visible auténtica de Monday.com (altura `32px`, bordes suaves `rounded-[2px]`, tipografía blanca en negrita).
     - Al hacer clic despliega un popover flotante con la lista de estados, checkmark activo, soporte de click-outside y cierre con tecla Escape.
     - Preserva la accesibilidad y retrocompatibilidad de pruebas mediante un `<select className="sr-only">`.
  2. **Modo "Editar Etiquetas" y Paleta Oficial Completa (40 Colores):**
     - Se expande `MONDAY_COLOR_PALETTE` en `frontend/src/types/index.ts` a la matriz completa de 40 colores (5 columnas x 8 filas) extraída en vivo de Monday.com.
     - El botón "Editar etiquetas" enlaza con `StatusManagerModal.tsx`, permitiendo renombrar inline, cambiar colores desde la matriz interactiva y persistir cambios al backend vía `/api/boards/{board_id}/statuses`.
  3. **Blindaje del Formato Ultra-Compacto SDD:**
     - Se actualiza `.agents/AGENTS.md` limitando los reportes de Implementador y Verificador a un formato sintético de máximo 10-15 líneas en un único bloque de código Markdown.
- **Razón:** Auditoría técnica independiente del Verificador Frontend con veredicto **APROBADO ✅**, build de producción de Vite limpio con 0 errores, 27/27 tests en Vitest y 29/29 tests en Pytest pasando al 100% (56 tests en verde sin regresiones).
- **Impacto:** Experiencia de selección y personalización de estados idéntica a Monday.com, sin callejones sin salida y totalmente testeada.

---

## [26/10/2026] — Sprint 3: Barra de Resumen en Pie de Grupo (Battery Summary) y Acumuladores 1:1 Monday.com
- **Decisión:**
  1. **Alineación Celda por Celda en `tfoot`:**
     - Se elimina el uso de `colSpan` desfasados en el pie de tabla de cada grupo, alineando estrictamente cada columna a 36px de altura (`h-9 min-h-[36px] max-h-[36px]`) y bordes `#d0d4e4`.
  2. **Componente GroupFooterSummary y Baterías de Estado y Prioridad:**
     - Se crea `frontend/src/components/board/GroupFooterSummary.tsx` implementando barras de batería segmentadas continuas con esquinas redondeadas (`rounded-[3px]`), proporciones exactas por estado/prioridad y tooltips informativos con conteos y porcentajes al posar el cursor.
  3. **Píldora de Rango Acumulado y Sumatorias Numéricas:**
     - Se incorpora el cálculo automático de rango de fechas (`min - max`, ej: `oct. 25 - 27`) presentado como píldora centrada azul `#0073ea`.
     - Se estandarizan las sumatorias de horas y presupuestos con sufijo "Total" preservando los identificadores `group-sum-hours-*` y `group-sum-budget-*`.
- **Razón:** Auditoría técnica independiente del Verificador Frontend con veredicto **APROBADO ✅**, build de producción de Vite exitoso en 1.12s, 30/30 tests en Vitest y 29/29 tests en Pytest pasando al 100% (59 tests en verde sin regresiones).
- **Impacto:** Resumen visual continuo y métricas instantáneas por grupo idénticas a Monday.com con modularidad desacoplada.

---

## [26/10/2026] — Sprint 4: Gestión de Grupos, Colapso y Paleta Oficial de 18 Colores 1:1 Monday.com
- **Decisión:**
  1. **Paleta Oficial de 18 Colores para Grupos:**
     - Se integra en `frontend/src/types/index.ts` la matriz oficial `GROUP_COLOR_PALETTE` de 18 tonalidades Monday.com y se implementa su selector flotante en cuadrícula con persistencia optimista en `useWorkspaceStore`.
  2. **Componente Modular GroupHeader y Menú de 3 Puntos:**
     - Se extrae la cabecera a `frontend/src/components/board/GroupHeader.tsx` incorporando el botón de menú contextual (`...`) con opciones de contraer/expandir, renombrado inline, cambio de color y eliminación defensiva.
  3. **Colapso Individual y Masivo con Vista Compacta 1:1:**
     - Se añade la función `collapseAllGroups` al store para colapsar o expandir todos los grupos con un clic.
     - En estado contraído, se renderiza una fila compacta de 36px con borde perimetral, acento izquierdo de 4px, chevron `>`, contador de tareas y mini-batería de estados de 18px.
- **Razón:** Auditoría técnica independiente del Verificador Frontend con veredicto **APROBADO ✅**, build de producción de Vite exitoso en 1.15s, 34/34 tests en Vitest y 29/29 tests en Pytest pasando al 100% (63 tests en verde sin regresiones).
- **Impacto:** Arquitectura de grupos robusta, altamente interactiva y visualmente fiel a Monday.com.

---

## [26/10/2026] — Sprint 5: Barra Flotante de Acciones en Lote (Floating Batch Action Bar) 1:1 Monday.com
- **Decisión:**
  1. **Selección Múltiple Reactiva y Resaltado Visual:**
     - Se integran checkboxes interactivos por fila y en la cabecera de grupo con estado `selectedItemIds: Set<number>`.
     - Las filas seleccionadas se tiñen reactivamente con fondo azul suave Monday `#edf5ff` (`bg-[#edf5ff]`).
  2. **Componente Modular BatchActionBar:**
     - Se crea `frontend/src/components/board/BatchActionBar.tsx`, renderizando una cápsula fija centrada en la parte inferior de la ventana cuando hay tareas seleccionadas.
     - Incluye insignia azul `#0073ea` con contador de elementos (`X Elementos seleccionados`), botón de cierre `X` y operaciones en lote: duplicar, eliminar con confirmación defensiva, mover a otro grupo mediante selector rápido y exportar selección a CSV.
- **Razón:** Auditoría técnica independiente del Verificador Frontend con veredicto **APROBADO ✅**, build de producción de Vite exitoso en 1.14s, 38/38 tests en Vitest y 29/29 tests en Pytest pasando al 100% (67 tests en verde sin regresiones).
- **Impacto:** Operaciones masivas fluidas e intuitivas con experiencia visual idéntica a Monday.com.

---

## [26/10/2026] — Sprint 6: Barra de Herramientas y Popovers Avanzados 1:1 Monday.com
- **Decisión:**
  1. **Componente Modular BoardToolbar:**
     - Se crea `frontend/src/components/board/BoardToolbar.tsx` reuniendo las acciones principales de la toolbar de Monday.com: búsqueda con lupa, botón de filtros rápidos (`Filtrar v`), constructor de ordenamiento (`Ordenar`) y selector de visibilidad de columnas (`Ocultar`).
  2. **Popovers Flotantes de Filtrado, Ordenamiento y Ocultamiento:**
     - **Filtros Rápidos:** Tarjetas horizontales scrollables por columna con cálculo reactivo de tareas coincidentes y botón "Borrar todo".
     - **Ocultar Columnas:** Selector de visibilidad con checkboxes temáticos persistido en `localStorage` y sincronizado tanto en el cuerpo de la tabla como en `GroupFooterSummary`.
     - **Ordenar:** Constructor ascendente y descendente que reordena las tareas en vivo dentro de cada grupo.
- **Razón:** Auditoría técnica independiente del Verificador Frontend con veredicto **APROBADO ✅**, build de producción de Vite exitoso en 1.15s, 41/41 tests en Vitest y 29/29 tests en Pytest pasando al 100% (70 tests en verde sin regresiones).
- **Impacto:** Herramientas de exploración, ordenamiento y personalización de vista ultra-rápidas con diseño Monday.com.

---

## [26/10/2026] — Sprint 7: Panel Lateral de Detalle (Item Drawer 668px con WYSIWYG y Actividad) 1:1 Monday.com
- **Decisión:**
  1. **Rediseño Dimensional y Estilístico (668px):**
     - Se ajusta `ItemDetailDrawer.tsx` al ancho exacto de Monday.com (`w-[668px] max-w-[90vw]`) con sombra perimetral suave `shadow-[-8px_0_30px_rgba(0,0,0,0.15)]` y título editable de 24px.
  2. **Navegación por Pestañas con Indicador Azul:**
     - Se organizan las secciones en tabs estilizadas: `Actualizaciones`, `Actividad` y `Checklist` con borde inferior azul `#0073ea` en la pestaña activa.
  3. **Editor WYSIWYG Expandible y Timeline Inmutable:**
     - En `Actualizaciones`, se implementa el editor expandible al hacer foco con barra de herramientas de formato (negrita, cursiva, subrayado, listas y menciones `@`), botón "Publicar" y feed cronológico con timestamps relativos.
     - En `Actividad`, se muestra la línea de tiempo inmutable con avatares e historial de eventos.
- **Razón:** Auditoría técnica independiente del Verificador Frontend con veredicto **APROBADO ✅**, build de producción de Vite exitoso en 1.15s, 44/44 tests en Vitest y 29/29 tests en Pytest pasando al 100% (73 tests en verde sin regresiones).
- **Impacto:** Experiencia colaborativa profunda por tarea idéntica a Monday.com.

---

## [26/10/2026] — Sprint 8: Vista Kanban Refinada y Switcher de Vistas 1:1 Monday.com (Culminación del Roadmap)
- **Decisión:**
  1. **Switcher de Vistas Superior Estilo Monday.com:**
     - En `BoardView.tsx`, se integran las pestañas superiores con indicador activo azul `#0073ea` (`border-b-2`), contador reactivo, menú contextual de vista (`...`) y botón desplegable `+` ("Añadir vista") con soporte para cambiar dinámicamente entre Tabla, Kanban, Cronograma y Dashboard.
  2. **Tarjetas Kanban Refinadas y Creación Rápida:**
     - En `KanbanView.tsx`, se estilizan las tarjetas con bordes redondeados (`rounded-lg`), sombra suave interactiva y acento visual vertical `border-l-4` según el color de la prioridad de la tarea.
     - Se integran avatares circulares de asignación, alertas visuales de fecha límite y creación rápida inline al pie de cada columna de estado.
  3. **Culminación Exitosa de la Réplica 1:1 de Monday.com:**
     - Con la finalización y aprobación del Sprint 8, se alcanzan al 100% todos los objetivos planteados en el informe de ingeniería inversa de Monday.com.
- **Razón:** Auditoría técnica independiente del Verificador Frontend con veredicto **APROBADO ✅**, build de producción de Vite exitoso en 1.15s, 47/47 tests en Vitest y 29/29 tests en Pytest pasando al 100% (**76 tests automatizados en verde con 0 fallos ni regresiones**).
- **Impacto:** Gestor de Proyectos cuenta con paridad estética, de componentes, diseño atómico y flujo interactivo idéntico a Monday.com, respaldado por una suite integral de tests automatizados y arquitectura modular desacoplada.

---

## [27/10/2026] — Sprint Onboarding Automático 1:1 Monday.com y Despliegue en Producción Vercel
- **Decisión:**
  1. **Aprovisionamiento Automático de Onboarding por Usuario:**
     - En `backend/app/auth.py`, se refactoriza `ensure_user_default_workspace` para verificar la existencia de espacios por `owner_id == user.id` (en lugar de una cuenta global de workspaces en base de datos).
     - Si el usuario no tiene workspace ni tableros, el backend crea de forma aislada e idempotente:
       - Espacio de trabajo: `"Mi Espacio de Trabajo"`.
       - Tablero oficial de bienvenida: `"Primer proyecto"` con sus 5 estados estándar de Monday.
       - Grupos oficiales de Monday: `"Pendientes"` (`#579bfc`) y `"Completado"` (`#00c875`).
       - 3 tareas de bienvenida en `"Pendientes"` con la plantilla idéntica a Monday.com:
         - **Tarea 1:** Asignada al usuario actual, Estado `in_progress`, Prioridad `low`, Presupuesto `$100.0`.
         - **Tarea 2:** Sin asignar, Estado `done`, Prioridad `high`, Presupuesto `$1,000.0`.
         - **Tarea 3:** Sin asignar, Estado `blocked`, Prioridad `medium`, Presupuesto `$500.0`.
         - Presupuesto acumulado del grupo: exactamente `$1,600.0` (idéntico a Monday).
       - 3 reglas reactivas de automatización por defecto.
  2. **Garantía de Onboarding en `GET /api/workspaces`:**
     - En `backend/app/routers/workspaces_router.py`, se ejecuta defensivamente `ensure_user_default_workspace(db, current_user)` en `list_workspaces`, asegurando que incluso usuarios preexistentes con 0 tableros reciban de inmediato el tablero de bienvenida.
  3. **Auto-selección Reactiva y Blindaje Anti-Parpadeo en Frontend:**
     - En `useWorkspaceStore.ts`, se activa de forma síncrona `isLoadingBoard: true` y se ancla la bandera `hasLoadedInitialWorkspaces` al obtener espacios, auto-seleccionando `targetWs.boards[0]` y su detalle reactivo.
     - En `BoardView.tsx`, se introducen guardas defensivas para evitar cualquier parpadeo de "No hay ningún tablero seleccionado" mientras los datos iniciales viajan por la red.
     - En `OnboardingAutoSelect.test.tsx`, se verifica que el tablero "Primer proyecto" se auto-selecciona inmediatamente, renderizando las 3 tareas y la sumatoria acumulada de $1,600.0.
  4. **Despliegue a Producción Vercel:**
     - Se actualiza y despliega la SPA en Vercel (`gestor-proyectos-sandy.vercel.app`) reflejando la totalidad de los 8 Sprints de paridad visual de Monday.com y el flujo de auto-selección de onboarding.
- **Razón:** Garantizar que cualquier usuario nuevo o potencial cliente que ingrese con Google OAuth experimente de inmediato la interfaz completa de Monday.com precargada sin fricción, sin parpadeos ni estados vacíos.
- **Impacto:** Auditoría técnica independiente de los Verificadores Backend y Frontend con veredicto **APROBADO ✅** en ambos roles, **81 pruebas automatizadas pasando al 100%** (**31 en Pytest + 50 en Vitest**) y compilación de producción limpia.












