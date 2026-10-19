import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { setAccessToken } from '../services/api';
import type {
  BoardDetailRead,
  BoardStatusRead,
  UserRead,
  WorkspaceRead,
} from '../types';

const MOCK_USER: UserRead = {
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
};

const DEFAULT_FIVE_STATUSES: BoardStatusRead[] = [
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

const INITIAL_BOARD_DETAIL: BoardDetailRead = {
  id: 1,
  workspace_id: 1,
  name: 'Roadmap de Producto Q4',
  description: 'Planificación y seguimiento de funcionalidades clave del trimestre.',
  created_at: '2026-10-19T12:00:00Z',
  statuses: DEFAULT_FIVE_STATUSES,
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
          title: 'Implementar autenticación SSO con Google y Microsoft',
          status_key: 'in_progress',
          priority: 'critical',
          assignee_id: 1,
          assignee: MOCK_USER,
          due_date: '2026-10-25',
          notes: 'Soportar OAuth2 real y simulador.',
          position: 0,
          created_at: '2026-10-19T12:00:00Z',
          updated_at: '2026-10-19T12:00:00Z',
        },
        {
          id: 101,
          group_id: 10,
          board_id: 1,
          title: 'Diseñar modelo relacional de Workspaces',
          status_key: 'done',
          priority: 'high',
          assignee_id: 1,
          assignee: MOCK_USER,
          due_date: '2026-10-22',
          notes: 'Estados personalizables.',
          position: 1,
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
      items: [
        {
          id: 102,
          group_id: 11,
          board_id: 1,
          title: 'Integración de pasarela de notificaciones',
          status_key: 'blocked',
          priority: 'medium',
          assignee_id: null,
          assignee: null,
          due_date: '2026-11-02',
          notes: 'Pendiente.',
          position: 0,
          created_at: '2026-10-19T12:00:00Z',
          updated_at: '2026-10-19T12:00:00Z',
        },
      ],
    },
  ],
};

const INITIAL_WORKSPACES: WorkspaceRead[] = [
  {
    id: 1,
    name: 'Espacio Principal',
    description: 'Gestión central de producto',
    icon: 'Briefcase',
    color: '#0073ea',
    owner_id: 1,
    created_at: '2026-10-19T12:00:00Z',
    boards: [
      {
        id: 1,
        workspace_id: 1,
        name: 'Roadmap de Producto Q4',
        description: 'Planificación y seguimiento de funcionalidades clave del trimestre.',
        created_at: '2026-10-19T12:00:00Z',
      },
    ],
  },
  {
    id: 2,
    name: 'Marketing & Crecimiento',
    description: 'Campañas de adquisición',
    icon: 'Rocket',
    color: '#00c875',
    owner_id: 1,
    created_at: '2026-10-19T12:00:00Z',
    boards: [],
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

describe('AppWorkspaceBoard — Workspaces, Boards y Personalizador de Estados', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setAccessToken('valid_test_jwt_token');
  });

  it('carga los Workspaces, el Tablero inicial con grupos, tareas y los 5 estados por defecto', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/auth/providers')) {
        return createJsonResponse([]);
      }
      if (url.includes('/api/auth/me')) {
        return createJsonResponse(MOCK_USER);
      }
      if (url.includes('/api/users')) {
        return createJsonResponse([MOCK_USER]);
      }
      if (url.includes('/api/workspaces')) {
        return createJsonResponse(INITIAL_WORKSPACES);
      }
      if (url.includes('/api/boards/1')) {
        return createJsonResponse(INITIAL_BOARD_DETAIL);
      }
      return createJsonResponse({});
    });

    render(<App />);

    // Verificar título del tablero inicial
    expect(await screen.findByTestId('active-board-title')).toHaveTextContent(
      'Roadmap de Producto Q4',
    );

    // Verificar que los Workspaces estén en el Sidebar
    expect(screen.getByTestId('workspace-item-1')).toHaveTextContent(
      'Espacio Principal',
    );
    expect(screen.getByTestId('workspace-item-2')).toHaveTextContent(
      'Marketing & Crecimiento',
    );

    // Verificar los 5 estados por defecto en la cabecera del tablero
    expect(screen.getByTestId('board-status-pill-done')).toHaveTextContent(
      'Listo',
    );
    expect(
      screen.getByTestId('board-status-pill-in_progress'),
    ).toHaveTextContent('En Proceso');
    expect(screen.getByTestId('board-status-pill-blocked')).toHaveTextContent(
      'Bloqueado',
    );
    expect(
      screen.getByTestId('board-status-pill-handed_over'),
    ).toHaveTextContent('Traspasado');
    expect(
      screen.getByTestId('board-status-pill-not_started'),
    ).toHaveTextContent('Sin Empezar');

    // Verificar grupos y tareas
    expect(screen.getByText('Esta Semana')).toBeInTheDocument();
    expect(
      screen.getByText('Implementar autenticación SSO con Google y Microsoft'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Diseñar modelo relacional de Workspaces'),
    ).toBeInTheDocument();
  });

  it('permite crear un nuevo tablero desde el Sidebar y seleccionarlo automáticamente', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/auth/providers')) {
        return createJsonResponse([]);
      }
      if (url.includes('/api/auth/me')) {
        return createJsonResponse(MOCK_USER);
      }
      if (url.includes('/api/users')) {
        return createJsonResponse([MOCK_USER]);
      }
      if (url.includes('/api/workspaces')) {
        return createJsonResponse(INITIAL_WORKSPACES);
      }
      if (url.endsWith('/api/boards') && init?.method === 'POST') {
        const body = JSON.parse(String(init.body));
        const createdBoard: BoardDetailRead = {
          id: 99,
          workspace_id: body.workspace_id,
          name: body.name,
          description: body.description || '',
          created_at: '2026-10-19T15:00:00Z',
          statuses: DEFAULT_FIVE_STATUSES.map((s) => ({ ...s, board_id: 99 })),
          groups: [
            {
              id: 50,
              board_id: 99,
              title: 'Esta Semana',
              color: '#579bfc',
              position: 0,
              collapsed: false,
              items: [],
            },
          ],
        };
        return createJsonResponse(createdBoard, 201);
      }
      if (url.includes('/api/boards/1')) {
        return createJsonResponse(INITIAL_BOARD_DETAIL);
      }
      return createJsonResponse({});
    });

    render(<App />);

    expect(await screen.findByTestId('active-board-title')).toHaveTextContent(
      'Roadmap de Producto Q4',
    );

    // Abrir el formulario "+ Nuevo Tablero" en el Sidebar
    const newBoardBtn = screen.getByTestId('btn-new-board');
    fireEvent.click(newBoardBtn);

    const nameInput = screen.getByLabelText('Nombre del nuevo tablero');
    fireEvent.change(nameInput, {
      target: { value: 'Sprint 2 Arquitectura' },
    });

    const submitBtn = screen.getByTestId('btn-submit-new-board');
    fireEvent.click(submitBtn);

    // Verificar que el tablero recién creado pasa a ser el tablero activo y figura en el Sidebar
    await waitFor(() => {
      expect(screen.getByTestId('active-board-title')).toHaveTextContent(
        'Sprint 2 Arquitectura',
      );
    });
    expect(screen.getByTestId('board-item-99')).toHaveTextContent(
      'Sprint 2 Arquitectura',
    );
  });

  it('abre el modal "Personalizar Estados", crea un nuevo estado personalizado, edita nombre/color de uno existente y elimina un estado reasignando tareas', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/auth/providers')) {
        return createJsonResponse([]);
      }
      if (url.includes('/api/auth/me')) {
        return createJsonResponse(MOCK_USER);
      }
      if (url.includes('/api/users')) {
        return createJsonResponse([MOCK_USER]);
      }
      if (url.includes('/api/workspaces')) {
        return createJsonResponse(INITIAL_WORKSPACES);
      }
      if (
        url.includes('/api/boards/1/statuses') &&
        init?.method === 'POST'
      ) {
        const body = JSON.parse(String(init.body));
        const newStatus: BoardStatusRead = {
          id: 6,
          board_id: 1,
          key: 'en_revision_qa',
          label: body.label,
          color: body.color,
          position: 5,
        };
        return createJsonResponse(newStatus, 201);
      }
      if (
        url.includes('/api/boards/1/statuses/2') &&
        init?.method === 'PATCH'
      ) {
        const body = JSON.parse(String(init.body));
        const updatedStatus: BoardStatusRead = {
          id: 2,
          board_id: 1,
          key: 'in_progress',
          label: body.label ?? 'En Proceso',
          color: body.color ?? '#fdab3d',
          position: 1,
        };
        return createJsonResponse(updatedStatus, 200);
      }
      if (
        url.includes('/api/boards/1/statuses/3') &&
        init?.method === 'DELETE'
      ) {
        return createJsonResponse({
          deleted: true,
          id: 3,
          reassigned_to_key: 'done',
          reassigned_items_count: 1,
        });
      }
      if (url.includes('/api/boards/1')) {
        return createJsonResponse(INITIAL_BOARD_DETAIL);
      }
      return createJsonResponse({});
    });

    render(<App />);

    expect(await screen.findByTestId('active-board-title')).toHaveTextContent(
      'Roadmap de Producto Q4',
    );

    // Abrir el modal Personalizar Estados
    fireEvent.click(screen.getByTestId('btn-open-status-modal'));
    expect(
      await screen.findByTestId('status-manager-modal'),
    ).toBeInTheDocument();

    // 1. Crear un nuevo estado personalizado ("En Revisión QA", "#784bd1")
    const newLabelInput = screen.getByTestId('input-new-status-label');
    const newColorInput = screen.getByTestId('input-new-status-color');

    fireEvent.change(newLabelInput, { target: { value: 'En Revisión QA' } });
    fireEvent.change(newColorInput, { target: { value: '#784bd1' } });
    fireEvent.click(screen.getByTestId('btn-add-status'));

    // Verificar que el nuevo estado se agregó al tablero
    expect(
      await screen.findByTestId('board-status-pill-en_revision_qa'),
    ).toHaveTextContent('En Revisión QA');

    // 2. Editar el estado existente "En Proceso" (key: in_progress, id: 2) -> "En Desarrollo Activo" con color "#0073ea"
    const inProgressLabelInput = screen.getByTestId(
      'status-label-input-in_progress',
    );
    const inProgressColorInput = screen.getByTestId(
      'status-color-input-in_progress',
    );

    fireEvent.change(inProgressLabelInput, {
      target: { value: 'En Desarrollo Activo' },
    });
    fireEvent.change(inProgressColorInput, {
      target: { value: '#0073ea' },
    });

    fireEvent.click(screen.getByTestId('btn-save-status-in_progress'));

    // Verificar que tanto la píldora de cabecera como la celda de la tarea 100 se actualizan en el tablero
    await waitFor(() => {
      expect(
        screen.getByTestId('board-status-pill-in_progress'),
      ).toHaveTextContent('En Desarrollo Activo');
      expect(screen.getByTestId('task-status-badge-100')).toHaveTextContent(
        'En Desarrollo Activo',
      );
    });

    // 3. Eliminar el estado "Bloqueado" (id: 3, key: blocked) y verificar que la tarea 102 se reasigna a "Listo"
    fireEvent.click(screen.getByTestId('btn-delete-status-blocked'));

    await waitFor(() => {
      expect(
        screen.queryByTestId('board-status-pill-blocked'),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('task-status-badge-102')).toHaveTextContent(
        'Listo',
      );
    });
  });
});

