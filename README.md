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

## ✨ Capacidades del MVP (Fase 1 Completada)

1. **Autenticación SSO con Google y Microsoft (OAuth2 / OIDC + JWT):**
   - Soporte dual para credenciales reales (`GOOGLE_CLIENT_ID`, `MICROSOFT_CLIENT_ID`) y modo simulador de desarrollo (`AUTH_DEV_MODE=true`) con cambio rápido de usuario.
2. **Espacios de Trabajo (Workspaces) y Tableros (Boards):**
   - Navegación jerárquica con Sidebar colapsable estilo Monday Work OS y CRUD completo.
3. **Estados Personalizables por Tablero:**
   - 5 estados iniciales por defecto (`Listo` `#00c875`, `En Proceso` `#fdab3d`, `Bloqueado` `#e2445c`, `Traspasado` `#a25ddc`, `Sin Empezar` `#c4c4c4`) más creación/edición/eliminación de estados personalizados por tablero.
4. **Vista Tabla Principal Interactiva (Main Table) y Vista Kanban con Drag & Drop:**
   - Grupos desplegables, edición inline con 1 clic (Título, Notas, Responsable, Estado, Prioridad, Fecha límite con alerta de vencimiento), Optimistic Updates con rollback automático, búsqueda/filtros en vivo y tarjetas Kanban arrastrables entre columnas de estado.
5. **Panel Lateral de Colaboración por Tarea (`ItemDetailDrawer`):**
   - Checklist interno con barra de progreso, comentarios del equipo e historial automático de actividad.

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

- **Backend (19 tests en `pytest`):**
  ```bash
  cd backend && ./venv/bin/pytest -v
  ```
- **Frontend (15 tests en `Vitest` + Build TypeScript):**
  ```bash
  cd frontend && npm test -- --run && npm run build
  ```

