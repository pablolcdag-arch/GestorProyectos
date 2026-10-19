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
   - **Estado (Status):** Píldoras con colores personalizables (ej: Listo [Verde], En Proceso [Naranja], Bloqueado [Rojo], Sin Empezar [Gris]).
   - **Responsable (People):** Asignación de miembros del equipo con avatar.
   - **Fecha / Cronograma (Date / Timeline):** Fechas límite o rangos de tiempo con alertas de vencimiento.
   - **Prioridad:** Alta, Media, Baja con código visual.
   - **Texto y Números:** Notas rápidas, presupuestos o estimaciones de tiempo.
4. **Vistas Múltiples:**
   - **Vista Tabla (Main Table):** Vista principal tipo hoja de cálculo interactiva con edición en vivo.
   - **Vista Kanban:** Tarjetas arrastrables organizadas por columna de estado.
5. **Actividad y Colaboración:**
   - Panel lateral de detalle por tarea con historial de cambios, comentarios y checklist interno.

---

## 👥 Metodología de Trabajo Multiagente (SDD - Spec-Driven Development)

Para garantizar la máxima calidad técnica, mantenibilidad y cero errores, el desarrollo se divide estrictamente en roles separados que operan en diferentes conversaciones de IA:

### 1. El Coordinador (Conversación Principal / Orchestrator)
- **Responsabilidad:** Diseñar la arquitectura general, dialogar con el usuario, descomponer funcionalidades en sprints/etapas manejables y redactar especificaciones técnicas completas y autocontenidas.
- **Formato Obligatorio:** Todos los prompts dirigidos al Implementador o al Verificador **DEBEN estar dentro de un único bloque de código de 4 backticks (` ```` `)** para que el usuario pueda copiarlos y pegarlos con 1 solo clic.
- **Seguridad Operativa:** Es el **ÚNICO rol autorizado** a registrar entradas en `decisions_log.md`, realizar `git commit`, `git push` o despliegues a servidores. Nunca delega la auto-verificación en el implementador.

### 2. El Implementador (Frontend / Backend)
- **Responsabilidad:** Recibir la especificación técnica del Coordinador, programar el código de forma limpia, defensiva y modular, y crear/actualizar las pruebas unitarias e integrales asociadas.
- **Prohibición Estricta:** NUNCA ejecuta `git commit`, `git push` ni despliegues. Al finalizar, reporta los archivos modificados, el resumen de lo realizado y la salida de los tests locales.

### 3. El Verificador (Frontend / Backend / QA)
- **Responsabilidad:** Actuar como auditor técnico independiente. Revisa el código implementado contra los principios de arquitectura, verifica que no existan callejones sin salida (dead-ends), fallos de responsive ni regresiones, y corre la suite completa de pruebas.
- **Veredicto Obligatorio:** Emite un informe estructurado con veredicto explícito:
  - **APROBADO ✅:** Autoriza al Coordinador a proceder con el commit y eventual despliegue.
  - **RECHAZADO ❌:** Detalla los fallos encontrados para que el Coordinador los derive al Implementador.

---

## 💻 Stack Tecnológico (A confirmar en Sesión 1 con Coordinador)

*El Coordinador propondrá y acordará con el usuario el stack óptimo en la primera sesión de planificación según los requerimientos de performance, facilidad de despliegue y UX.*

- **Frontend sugerido:** React / Next.js / Vue / Vite + Tailwind CSS + Lucide Icons + drag-and-drop accesible (ej: `@hello-pangea/dnd` o dnd-kit).
- **Backend sugerido:** Python (FastAPI / Flask) o Node.js / TypeScript (Express / Fastify / Next API).
- **Base de Datos sugerida:** PostgreSQL (Supabase o Postgres local/Docker) + SQLite para testing rápido / soporte local.
- **Control de Versiones:** Git (GitHub/GitLab).

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
