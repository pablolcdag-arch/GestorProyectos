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
