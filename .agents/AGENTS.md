# AGENTS.md — Gestor de Proyectos (Estilo Monday.com)
> **Documento Maestro de Contexto para Agentes de IA**
> Versión: 1.0 | Fecha de inicio: 19/10/2026
> **Este archivo es la fuente única de verdad para cualquier agente que trabaje en este proyecto.**
> Antes de escribir una sola línea de código, leer este archivo completo.

---

## 📌 REGLA NÚMERO UNO

> **LEE TODO ESTE ARCHIVO ANTES DE HACER CUALQUIER COSA.**
> Si una directiva aquí contradice algo que el usuario dice en el chat, **este archivo tiene prioridad** y debes señalarlo antes de proceder.

> [!IMPORTANT]
> **Metodología de Trabajo Rigurosa:** Cambios chicos, verificables, modulares y reversibles. Ante cualquier duda de diseño o arquitectura, **preguntar al usuario** antes de actuar.
> Ningún código se da por terminado sin pasar por auditoría independiente y pruebas automatizadas locales con 100% de éxito.

---

## 🏢 Contexto del Negocio y Visión del Producto

**Producto:** Gestor de Proyectos y Tareas Visual y Colaborativo (Inspirado en [Monday.com](https://monday.com/lang/es)).
**Propuesta de valor:** Permitir a equipos y profesionales gestionar flujos de trabajo, tareas y proyectos de manera visual, ultra-rápida y altamente intuitiva, combinando la flexibilidad de una planilla de cálculo con la potencia de un sistema de base de datos relacional.

### 🎯 Capacidades Esenciales del Sistema (Inspiración Monday.com)
1. **Espacios de Trabajo (Workspaces) y Tableros (Boards):**
   - Organización jerárquica: Espacio de Trabajo → Tablero → Grupos de Tareas → Filas (Items).
2. **Grupos e Items (Filas de Tareas):**
   - Cada tablero contiene uno o más grupos desplegables (ej: "Esta Semana", "En Progreso", "Completadas").
   - Cada grupo contiene múltiples items (tareas) que pueden crearse, editarse inline y reordenarse.
3. **Columnas Dinámicas y Tipadas:**
   - **Estado (Status):** Píldoras con colores personalizables por tablero. Estados iniciales por defecto:
     - `Listo` (Verde `#00c875`)
     - `En Proceso` (Naranja `#fdab3d`)
     - `Bloqueado` (Rojo `#e2445c`)
     - `Traspasado` (Violeta `#a25ddc`)
     - `Sin Empezar` (Gris `#c4c4c4`)
   - **Responsable (People):** Asignación de miembros del equipo con avatar.
   - **Fecha / Cronograma (Date / Timeline):** Fechas límite o rangos de tiempo con alertas de vencimiento.
   - **Prioridad:** Crítica, Alta, Media, Baja con código visual.
   - **Texto y Números:** Notas rápidas, presupuestos o estimaciones de tiempo.
4. **Vistas Múltiples:**
   - **Vista Tabla (Main Table):** Vista principal tipo hoja de cálculo interactiva con edición en vivo.
   - **Vista Kanban:** Tarjetas arrastrables organizadas por columna de estado.
5. **Actividad y Colaboración:**
   - Panel lateral de detalle por tarea con historial de cambios, comentarios y checklist interno.
6. **Autenticación y Seguridad (Desde Sprint 1):**
   - **Login SSO con Google y Microsoft (OAuth2 / OIDC):** Autenticación federada con cuentas de Google (`accounts.google.com`) y Microsoft / Entra ID (`login.microsoftonline.com`), con emisión de sesiones JWT firmadas.
   - **Soporte Dual Producción + Desarrollo Local (`AUTH_DEV_MODE`):** Funciona con credenciales reales de Google Cloud / Azure Portal vía variables de entorno y provee un simulador OAuth local determinístico cuando `AUTH_DEV_MODE=true` para desarrollo local sin bloqueo y pruebas automatizadas al 100%.

---

## 👥 Metodología de Trabajo Multiagente (SDD - Spec-Driven Development)

Para garantizar la máxima calidad técnica, mantenibilidad y cero errores, el desarrollo se divide estrictamente en roles separados que operan en diferentes conversaciones de IA:

### 1. El Coordinador (Conversación Principal / Orchestrator)
- **Responsabilidad:** Diseñar la arquitectura general, dialogar con el usuario, descomponer funcionalidades en sprints/etapas manejables y redactar especificaciones técnicas completas y autocontenidas.
- **Formato Obligatorio:** Todos los prompts dirigidos al Implementador o al Verificador **DEBEN estar dentro de un único bloque de código de 4 backticks (` ```` `)** para que el usuario pueda copiarlos y pegarlos con 1 solo clic.
- **Seguridad Operativa:** Es el **ÚNICO rol autorizado** a registrar entradas en `decisions_log.md`, realizar `git commit`, `git push` o despliegues a servidores. Nunca delega la auto-verificación en el implementador.

### 2. El Implementador (Frontend / Backend)
- **Responsabilidad:** Recibir la especificación técnica del Coordinador, programar el código de forma limpia, defensiva y modular, y crear/actualizar las pruebas unitarias e integrales asociadas.
- **Prohibición Estricta:** NUNCA ejecuta `git commit`, `git push` ni despliegues.
- **Entrega Obligatoria al Coordinador (Formato 1-Clic Ultra-Compacto):** Al finalizar, DEBE entregar su reporte **dentro de un único bloque de código Markdown (```markdown ... ```)** con formato ultracompacto (máximo 15-20 líneas, prohibido listar código en bruto, listas de colores hexadecimales o nombres de tests individuales). Estructura fija:
  1. **Qué se hizo:** 2-3 viñetas breves con los cambios esenciales de alto nivel.
  2. **Archivos:** Rutas relativas simples (Modificados / Creados).
  3. **Pruebas:** 1 línea con el resultado global (`Vitest: X/X ✅ | Build: OK ✅ | Pytest: X/X ✅`).
  4. **Puntos para Verificación:** 2 viñetas con los aspectos críticos a auditar.

### 3. El Verificador (Frontend / Backend / QA)
- **Responsabilidad:** Actuar como auditor técnico independiente en su propia conversación separada. Revisa el código implementado contra los principios de arquitectura, verifica que no existan callejones sin salida (dead-ends), fallos de responsive ni regresiones, y corre la suite completa de pruebas del proyecto.
- **Entrega Obligatoria al Coordinador (Formato 1-Clic Ultra-Corto):** Emite su veredicto final **dentro de un único bloque de código Markdown (```markdown ... ```)** en formato ultra-sintético (máximo 10-15 líneas):
  1. **Veredicto:** `APROBADO ✅` o `RECHAZADO ❌`.
  2. **Síntesis:** 1 solo párrafo breve evaluando arquitectura, responsive y calidad.
  3. **Pruebas:** 1 línea con evidencia de ejecución (`Vitest: X/X ✅ | Build: OK ✅ | Pytest: X/X ✅`).
  4. **Conclusión:** 1 frase autorizando el commit del Coordinador o detallando las fallas encontradas.

---

## 💻 Stack Tecnológico Confirmado (Opción A)

- **Frontend (`frontend/`):**
  - **Core:** React 18 + Vite + TypeScript.
  - **Estilos e Iconografía:** Tailwind CSS + Lucide Icons.
  - **Estado y Sincronización:** Zustand (con Optimistic Updates y rollback automático ante errores de red).
  - **Drag & Drop:** `@hello-pangea/dnd` / `@dnd-kit`.
  - **Testing Frontend:** Vitest + React Testing Library + jsdom.
- **Backend (`backend/`):**
  - **Core:** Python 3.11+ + FastAPI + Pydantic v2.
  - **ORM y Persistencia:** SQLAlchemy 2.0 (SQLite local y en memoria para tests rápidos + PostgreSQL para producción vía `DATABASE_URL`).
  - **Autenticación:** OAuth2 / OIDC (Google & Microsoft) con `httpx` + `PyJWT`.
  - **Testing Backend:** Pytest + FastAPI `TestClient`.
- **Control de Versiones:** Git.

---

## 🏗️ Convenciones de Código y Buenas Prácticas

1. **Modularidad:**
   - Separación estricta entre capa de presentación (UI components), lógica de negocio / estado, y capa de acceso a datos (APIs / endpoints / queries).
2. **Edición Inline y Reactividad:**
   - Al tratarse de una experiencia estilo Monday, los cambios en las celdas de las tablas deben reflejarse inmediatamente con persistencia defensiva (optimistic updates con rollback ante fallos de red).
3. **Manejo de Errores Defensivo:**
   - Validaciones estrictas tanto en el frontend como en el backend. Mensajes de error amigables para el usuario final y logs estructurados para diagnóstico.
4. **Documentación de Decisiones:**
   - Cada cambio de arquitectura, adición de biblioteca o decisión de base de datos debe asentarse en [`decisions_log.md`](../decisions_log.md).

---

## 🧪 Estrategia de Testing (Cero Regresiones)

- Cada feature nueva debe nacer acompañada de su script de prueba automatizado en `tests/` o `scripts/utils/`.
- Antes de que el Verificador apruebe cualquier entrega, **todas las suites de pruebas del proyecto deben pasar con 100% de éxito (0 fallos)**.

---

## 🤝 Flujo de Trabajo Colaborativo (Equipo Humano y Ramas de Git)

Para que múltiples desarrolladores o socios colaboren en el proyecto sin romper el entorno productivo:

1. **Protección de la Rama Principal (`main`):**
   - La rama `main` refleja el código productivo desplegado en Vercel y Render.
   - **Prohibido hacer push directo a `main` en desarrollo:** Toda nueva funcionalidad o corrección debe nacer en una rama propia (ej: `feature/notificaciones`, `fix/calendario-responsive`).
   - La integración a `main` se realiza mediante Pull Request (PR) únicamente tras haber completado el bucle SDD y verificado que el 100% de los tests pasan en verde.
2. **Aislamiento de Entornos Locales:**
   - En local, cada socio trabaja con su copia del repositorio, SQLite por defecto (`gestor.db`) y `AUTH_DEV_MODE=true`.
   - **Nunca usar la cadena de conexión de producción (Supabase) en desarrollo local cotidiano**, para evitar que pruebas locales borren o modifiquen datos reales de clientes.
3. **Uso Obligatorio de la Metodología SDD por Todos los Socios:**
   - Si el socio programa asistido por IA, debe respetar estrictamente la separación de roles (Coordinador formula especificaciones, Implementador programa y testea, Verificador audita de forma independiente).
   - Ningún agente en ninguna máquina tiene autorización para saltearse el bucle de verificación ni realizar commits sin auditoría previa.


