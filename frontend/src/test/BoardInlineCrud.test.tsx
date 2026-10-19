import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { setAccessToken } from '../services/api';
import type {
  BoardDetailRead,
  BoardStatusRead,
  TaskGroupRead,
  TaskItemRead,
  UserRead,
  WorkspaceRead,
} from '../types';

const MOCK_USERS: UserRead[] = [
  {
    id: 1,
    email: 'ana@gestor.dev',
    full_name: 'Ana García',
    avatar_url: null,
    color: '#0073ea',
    auth_provider: 'google',
    provider_subject_id: 'google:ana@gestor.dev',
    role: 'admin',
    is_active: true,
    created_at: '2026-10-19T12:00:00Z',
  },
  {
    id: 2,
    email: 'carlos@gestor.dev',
    full_name: 'Carlos Ruiz',
    avatar_url: null,
    color: '#00c875',
    auth_provider: 'microsoft',
    provider_subject_id: 'microsoft:carlos@gestor.dev',
    role: 'admin',
    is_active: true,
    created_at: '2026-10-19T12:00:00Z',
  },
];

const DEFAULT_STATUSES: BoardStatusRead[] = [
  { id: 1, board_id: 1, key: 'done', label: 'Listo', color: '#00c875', position: 0 },
  {
    id: 2,
    board_id: 1,
    key: 'in_progress',
    label: 'En Proceso',
    color: '#fdab3d',
    position: 1,
  },
  {
    id: 3,
    board_id: 1,
    key: 'blocked',
    label: 'Bloqueado',
    color: '#e2445c',
    position: 2,
  },
  {
    id: 4,
    board_id: 1,
    key: 'handed_over',
    label: 'Traspasado',
    color: '#a25ddc',
    position: 3,
  },
  {
    id: 5,
    board_id: 1,
    key: 'not_started',
    label: 'Sin Empezar',
    color: '#c4c4c4',
    position: 4,
  },
];

function buildInitialBoard(): BoardDetailRead {
  return {
    id: 1,
    workspace_id: 1,
    name: 'Roadmap de Producto Q4',
    description: 'Planificación trimestral interactiva.',
    created_at: '2026-10-19T12:00:00Z',
    statuses: DEFAULT_STATUSES,
    groups: [
      {
        id: 10,
        board_id: 1,
        title: 'Esta Semana',
        color: '#579bfc',
        position: 0,
        collapsed: false,
        items: [
          {
            id: 100,
            group_id: 10,
            board_id: 1,
            title: 'Implementar edición inline de celdas',
            status_key: 'in_progress',
            priority: 'high',
            assignee_id: 1,
            assignee: MOCK_USERS[0],
            due_date: '2026-10-25',
            notes: 'Con actualización optimista y rollback.',
            position: 0,
            created_at: '2026-10-19T12:00:00Z',
            updated_at: '2026-10-19T12:00:00Z',
          },
        ],
      },
      {
        id: 11,
        board_id: 1,
        title: 'En Progreso',
        color: '#a25ddc',
        position: 1,
        collapsed: false,
        items: [],
      },
    ],
  };
}

const INITIAL_WORKSPACES: WorkspaceRead[] = [
  {
    id: 1,
    name: 'Espacio Principal',
    description: 'Gestión central',
    icon: 'Briefcase',
    color: '#0073ea',
    owner_id: 1,
    created_at: '2026-10-19T12:00:00Z',
    boards: [
      {
        id: 1,
        workspace_id: 1,
        name: 'Roadmap de Producto Q4',
        description: 'Planificación trimestral interactiva.',
        created_at: '2026-10-19T12:00:00Z',
      },
    ],
  },
];

function createJsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => data,
  } as Response;
}

describe('BoardInlineCrud — Sprint 2B: CRUD de Grupos/Items, Edición Inline y Optimistic Rollback', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setAccessToken('sprint2b_valid_jwt');
  });

  it('1. CRUD de Grupos: permite crear un nuevo grupo, renombrar un grupo existente y eliminar un grupo', async () => {
    const boardState = buildInitialBoard();

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url.includes('/api/auth/providers')) return createJsonResponse([]);
      if (url.includes('/api/auth/me')) return createJsonResponse(MOCK_USERS[0]);
      if (url.includes('/api/users')) return createJsonResponse(MOCK_USERS);
      if (url.includes('/api/workspaces'))
        return createJsonResponse(INITIAL_WORKSPACES);

      if (url.includes('/api/boards/1/groups') && init?.method === 'POST') {
        const body = JSON.parse(String(init.body));
        const createdGroup: TaskGroupRead = {
          id: 25,
          board_id: 1,
          title: body.title,
          color: body.color || '#579bfc',
          position: 2,
          collapsed: false,
          items: [],
        };
        return createJsonResponse(createdGroup, 201);
      }

      if (url.includes('/api/groups/10') && init?.method === 'PATCH') {
        const body = JSON.parse(String(init.body));
        return createJsonResponse({
          id: 10,
          board_id: 1,
          title: body.title ?? 'Esta Semana',
          color: body.color ?? '#579bfc',
          position: 0,
          collapsed: false,
          items: boardState.groups[0].items,
        });
      }

      if (url.includes('/api/groups/11') && init?.method === 'DELETE') {
        return createJsonResponse({ deleted: true, id: 11 });
      }

      if (url.includes('/api/boards/1')) {
        return createJsonResponse(boardState);
      }

      return createJsonResponse({});
    });

    render(<App />);
    expect(await screen.findByTestId('active-board-title')).toHaveTextContent(
      'Roadmap de Producto Q4',
    );

    // A) Crear un nuevo grupo
    fireEvent.click(screen.getByTestId('btn-new-group'));
    const newGroupInput = screen.getByTestId('input-new-group-title');
    fireEvent.change(newGroupInput, { target: { value: 'Backlog Q4' } });
    fireEvent.click(screen.getByTestId('btn-submit-new-group'));

    expect(await screen.findByTestId('task-group-25')).toBeInTheDocument();
    expect(screen.getByTestId('task-group-25')).toHaveTextContent('Backlog Q4');

    // B) Renombrar el grupo 10 ("Esta Semana" -> "Prioridades de Hoy")
    fireEvent.click(screen.getByTestId('btn-edit-group-10'));
    const editGroupInput = screen.getByTestId('input-edit-group-title-10');
    fireEvent.change(editGroupInput, {
      target: { value: 'Prioridades de Hoy' },
    });
    fireEvent.click(screen.getByTestId('btn-save-group-10'));

    await waitFor(() => {
      expect(screen.getByTestId('task-group-10')).toHaveTextContent(
        'Prioridades de Hoy',
      );
    });

    // C) Eliminar el grupo 11 ("En Progreso")
    fireEvent.click(screen.getByTestId('btn-delete-group-11'));
    await waitFor(() => {
      expect(screen.queryByTestId('task-group-11')).not.toBeInTheDocument();
    });
  });

  it('2. Creación Rápida Inline de Tareas: escribe en quick-add-item-input y agrega la fila al grupo', async () => {
    const boardState = buildInitialBoard();
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.includes('/api/auth/providers')) return createJsonResponse([]);
        if (url.includes('/api/auth/me'))
          return createJsonResponse(MOCK_USERS[0]);
        if (url.includes('/api/users')) return createJsonResponse(MOCK_USERS);
        if (url.includes('/api/workspaces'))
          return createJsonResponse(INITIAL_WORKSPACES);

        if (url.includes('/api/groups/10/items') && init?.method === 'POST') {
          const body = JSON.parse(String(init.body));
          const createdItem: TaskItemRead = {
            id: 501,
            group_id: 10,
            board_id: 1,
            title: body.title,
            status_key: 'not_started',
            priority: 'medium',
            assignee_id: null,
            assignee: null,
            due_date: null,
            notes: '',
            position: 1,
            created_at: '2026-10-19T14:00:00Z',
            updated_at: '2026-10-19T14:00:00Z',
          };
          return createJsonResponse(createdItem, 201);
        }

        if (url.includes('/api/boards/1')) {
          return createJsonResponse(boardState);
        }
        return createJsonResponse({});
      });

    render(<App />);
    await screen.findByTestId('active-board-title');

    const quickInput = screen.getByTestId('quick-add-item-input-10');
    fireEvent.change(quickInput, {
      target: { value: 'Configurar pipeline CI/CD automatizado' },
    });
    fireEvent.click(screen.getByTestId('quick-add-item-submit-10'));

    expect(await screen.findByTestId('task-row-501')).toBeInTheDocument();
    expect(screen.getByTestId('task-title-display-501')).toHaveTextContent(
      'Configurar pipeline CI/CD automatizado',
    );
    expect(screen.getByTestId('task-status-badge-501')).toHaveTextContent(
      'Sin Empezar',
    );

    const postCall = fetchSpy.mock.calls.find(
      ([url, init]) =>
        String(url).includes('/api/groups/10/items') &&
        init?.method === 'POST',
    );
    expect(postCall).toBeDefined();
  });

  it('3. Edición Inline de Celdas: actualiza Estado, Prioridad, Responsable (incluyendo Sin asignar), Fecha límite y Título', async () => {
    const boardState = buildInitialBoard();
    let currentItemState: TaskItemRead = {
      ...boardState.groups[0].items[0],
    };

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.includes('/api/auth/providers')) return createJsonResponse([]);
        if (url.includes('/api/auth/me'))
          return createJsonResponse(MOCK_USERS[0]);
        if (url.includes('/api/users')) return createJsonResponse(MOCK_USERS);
        if (url.includes('/api/workspaces'))
          return createJsonResponse(INITIAL_WORKSPACES);

        if (url.includes('/api/items/100') && init?.method === 'PATCH') {
          const body = JSON.parse(String(init.body));
          const hasAssignee = Object.prototype.hasOwnProperty.call(
            body,
            'assignee_id',
          );
          const hasDueDate = Object.prototype.hasOwnProperty.call(
            body,
            'due_date',
          );

          const nextAssigneeId = hasAssignee
            ? body.assignee_id
            : currentItemState.assignee_id;
          const nextAssignee =
            nextAssigneeId === null || nextAssigneeId === undefined
              ? null
              : (MOCK_USERS.find((u) => u.id === nextAssigneeId) ?? null);

          currentItemState = {
            ...currentItemState,
            title: body.title ?? currentItemState.title,
            notes: body.notes ?? currentItemState.notes,
            status_key: body.status_key ?? currentItemState.status_key,
            priority: body.priority ?? currentItemState.priority,
            assignee_id: nextAssigneeId,
            assignee: nextAssignee,
            due_date: hasDueDate ? body.due_date : currentItemState.due_date,
          };
          return createJsonResponse(currentItemState);
        }

        if (url.includes('/api/boards/1')) {
          return createJsonResponse(boardState);
        }
        return createJsonResponse({});
      });

    render(<App />);
    await screen.findByTestId('active-board-title');

    // A) Cambiar Estado de "in_progress" ("En Proceso") a "done" ("Listo")
    fireEvent.change(screen.getByTestId('task-status-select-100'), {
      target: { value: 'done' },
    });

    await waitFor(() => {
      expect(screen.getByTestId('task-status-badge-100')).toHaveTextContent(
        'Listo',
      );
      expect(screen.getByTestId('board-status-pill-done')).toHaveTextContent(
        'Listo1',
      );
    });

    // B) Cambiar Prioridad a "critical" ("Crítica")
    fireEvent.change(screen.getByTestId('task-priority-select-100'), {
      target: { value: 'critical' },
    });

    await waitFor(() => {
      expect(screen.getByTestId('task-priority-badge-100')).toHaveTextContent(
        'Crítica',
      );
    });

    // C) Cambiar Responsable a Carlos Ruiz (id: 2) y luego a "Sin asignar" ("")
    const assigneeSelect = screen.getByTestId(
      'task-assignee-select-100',
    ) as HTMLSelectElement;
    fireEvent.change(assigneeSelect, { target: { value: '2' } });

    await waitFor(() => {
      expect(assigneeSelect.value).toBe('2');
    });

    fireEvent.change(assigneeSelect, { target: { value: '' } });

    await waitFor(() => {
      expect(assigneeSelect.value).toBe('');
    });

    // D) Cambiar Fecha límite a "2026-11-15"
    const dueDateInput = screen.getByTestId(
      'task-duedate-input-100',
    ) as HTMLInputElement;
    fireEvent.change(dueDateInput, { target: { value: '2026-11-15' } });

    await waitFor(() => {
      expect(dueDateInput.value).toBe('2026-11-15');
    });

    // E) Editar Título inline
    fireEvent.click(screen.getByTestId('task-title-display-100'));
    const titleInput = screen.getByTestId('task-title-input-100');
    fireEvent.change(titleInput, {
      target: { value: 'Título actualizado inline' },
    });
    fireEvent.click(screen.getByTestId('task-title-save-100'));

    await waitFor(() => {
      expect(screen.getByTestId('task-title-display-100')).toHaveTextContent(
        'Título actualizado inline',
      );
    });

    const patchCalls = fetchSpy.mock.calls.filter(
      ([url, init]) =>
        String(url).includes('/api/items/100') && init?.method === 'PATCH',
    );
    expect(patchCalls.length).toBeGreaterThanOrEqual(5);
  });

  it('4. Optimistic Update y Rollback: revierte automáticamente el estado ante un error 500 y muestra board-error-banner', async () => {
    const boardState = buildInitialBoard();

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url.includes('/api/auth/providers')) return createJsonResponse([]);
      if (url.includes('/api/auth/me')) return createJsonResponse(MOCK_USERS[0]);
      if (url.includes('/api/users')) return createJsonResponse(MOCK_USERS);
      if (url.includes('/api/workspaces'))
        return createJsonResponse(INITIAL_WORKSPACES);

      if (url.includes('/api/items/100') && init?.method === 'PATCH') {
        return createJsonResponse(
          {
            detail:
              'Error interno simulado en el servidor al guardar la celda.',
          },
          500,
        );
      }

      if (url.includes('/api/boards/1')) {
        return createJsonResponse(boardState);
      }
      return createJsonResponse({});
    });

    render(<App />);
    await screen.findByTestId('active-board-title');

    // Estado inicial de la tarea 100 es "En Proceso"
    expect(screen.getByTestId('task-status-badge-100')).toHaveTextContent(
      'En Proceso',
    );

    // Intentar cambiar a "Bloqueado" -> el servidor responde 500
    fireEvent.change(screen.getByTestId('task-status-select-100'), {
      target: { value: 'blocked' },
    });

    // Verificar que aparece el banner de error y que la celda hizo rollback a "En Proceso"
    const errorBanner = await screen.findByTestId('board-error-banner');
    expect(errorBanner).toHaveTextContent(
      'Error interno simulado en el servidor al guardar la celda.',
    );
    expect(screen.getByTestId('task-status-badge-100')).toHaveTextContent(
      'En Proceso',
    );
  });

  it('5. Eliminación de Tarea: invoca DELETE /api/items/{item_id} y remueve la fila del DOM', async () => {
    const boardState = buildInitialBoard();
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.includes('/api/auth/providers')) return createJsonResponse([]);
        if (url.includes('/api/auth/me'))
          return createJsonResponse(MOCK_USERS[0]);
        if (url.includes('/api/users')) return createJsonResponse(MOCK_USERS);
        if (url.includes('/api/workspaces'))
          return createJsonResponse(INITIAL_WORKSPACES);

        if (url.includes('/api/items/100') && init?.method === 'DELETE') {
          return createJsonResponse({ deleted: true, id: 100 });
        }

        if (url.includes('/api/boards/1')) {
          return createJsonResponse(boardState);
        }
        return createJsonResponse({});
      });

    render(<App />);
    expect(await screen.findByTestId('task-row-100')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('btn-delete-task-100'));

    await waitFor(() => {
      expect(screen.queryByTestId('task-row-100')).not.toBeInTheDocument();
    });

    const deleteCall = fetchSpy.mock.calls.find(
      ([url, init]) =>
        String(url).includes('/api/items/100') && init?.method === 'DELETE',
    );
    expect(deleteCall).toBeDefined();
  });
});
