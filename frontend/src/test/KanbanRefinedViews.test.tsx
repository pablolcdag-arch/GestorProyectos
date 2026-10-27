import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import App from '../App';
import { setAccessToken } from '../services/api';
import type {
  BoardDetailRead,
  BoardStatusRead,
  TaskItemDetailRead,
  TaskItemRead,
  UserRead,
  WorkspaceRead,
} from '../types';

const MOCK_USERS: UserRead[] = [
  {
    id: 1,
    email: 'lucia@gestor.dev',
    full_name: 'Lucía Fernández',
    avatar_url: null,
    color: '#0073ea',
    auth_provider: 'google',
    provider_subject_id: 'google:lucia@gestor.dev',
    role: 'admin',
    is_active: true,
    created_at: '2026-10-19T12:00:00Z',
  },
  {
    id: 2,
    email: 'diego@gestor.dev',
    full_name: 'Diego Morales',
    avatar_url: null,
    color: '#a25ddc',
    auth_provider: 'microsoft',
    provider_subject_id: 'ms:diego@gestor.dev',
    role: 'member',
    is_active: true,
    created_at: '2026-10-19T12:00:00Z',
  },
];

const DEFAULT_FIVE_STATUSES: BoardStatusRead[] = [
  {
    id: 1,
    board_id: 1,
    key: 'done',
    label: 'Listo',
    color: '#00c875',
    position: 0,
  },
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
    key: 'transferred',
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

function createInitialBoard(): BoardDetailRead {
  return {
    id: 1,
    workspace_id: 1,
    name: 'Tablero Sprint 8 Kanban',
    description: 'Sprint 8: Kanban Refinado y Switcher de Vistas',
    created_at: '2026-10-19T12:00:00Z',
    statuses: DEFAULT_FIVE_STATUSES,
    groups: [
      {
        id: 10,
        board_id: 1,
        title: 'Entregables Q4',
        color: '#579bfc',
        position: 0,
        collapsed: false,
        items: [
          {
            id: 301,
            group_id: 10,
            board_id: 1,
            title: 'Refinar tarjetas Kanban con acento de prioridad',
            status_key: 'in_progress',
            priority: 'critical',
            assignee_id: 1,
            assignee: MOCK_USERS[0],
            start_date: '2026-10-20',
            due_date: '2026-10-25', // vencida
            estimated_hours: 8,
            budget: 900,
            notes: 'Acento vertical border-l-4 y micro-píldora',
            position: 0,
            comments_count: 2,
            checklist_total: 3,
            checklist_completed: 2,
            created_at: '2026-10-20T10:00:00Z',
            updated_at: '2026-10-20T10:00:00Z',
          },
          {
            id: 302,
            group_id: 10,
            board_id: 1,
            title: 'Switcher de vistas superior con botón añadir',
            status_key: 'done',
            priority: 'medium',
            assignee_id: 2,
            assignee: MOCK_USERS[1],
            start_date: '2026-10-21',
            due_date: '2026-11-05',
            estimated_hours: 4,
            budget: 450,
            notes: 'Indicador activo azul 1:1 Monday',
            position: 1,
            comments_count: 0,
            checklist_total: 0,
            checklist_completed: 0,
            created_at: '2026-10-21T10:00:00Z',
            updated_at: '2026-10-21T10:00:00Z',
          },
        ],
      },
    ],
  };
}

function createJsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => data,
  } as Response;
}

describe('KanbanRefinedViews — Sprint 8: Vista Kanban Refinada y Switcher de Vistas 1:1 Monday.com', () => {
  let currentBoard: BoardDetailRead;
  let item301Detail: TaskItemDetailRead;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setAccessToken('jwt_sprint8_token');
    currentBoard = createInitialBoard();

    item301Detail = {
      ...currentBoard.groups[0].items[0],
      comments: [
        {
          id: 701,
          item_id: 301,
          author_id: 1,
          author: MOCK_USERS[0],
          content: 'Acento de prioridad aplicado.',
          created_at: '2026-10-21T11:00:00Z',
        },
      ],
      checklist_items: [
        {
          id: 801,
          item_id: 301,
          title: 'Micro-píldora de prioridad',
          is_completed: true,
          position: 0,
          created_at: '2026-10-21T10:30:00Z',
        },
      ],
      activities: [],
    };

    const workspaces: WorkspaceRead[] = [
      {
        id: 1,
        name: 'Espacio Central',
        description: 'Espacio de trabajo Sprint 8',
        icon: 'Layout',
        color: '#0073ea',
        owner_id: 1,
        created_at: '2026-10-19T12:00:00Z',
        boards: [
          {
            id: 1,
            workspace_id: 1,
            name: currentBoard.name,
            description: currentBoard.description,
            created_at: currentBoard.created_at,
          },
        ],
      },
    ];

    fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = (init?.method || 'GET').toUpperCase();

      if (url.includes('/api/auth/me')) {
        return Promise.resolve(createJsonResponse(MOCK_USERS[0]));
      }
      if (url.includes('/api/users')) {
        return Promise.resolve(createJsonResponse(MOCK_USERS));
      }
      if (url.includes('/api/workspaces') && !url.includes('/boards')) {
        return Promise.resolve(createJsonResponse(workspaces));
      }
      if (url.includes('/api/boards/1/export-csv')) {
        return Promise.resolve(new Response('col1,col2\nval1,val2', { status: 200 }));
      }
      if (url.includes('/api/boards/1') && method === 'GET') {
        return Promise.resolve(createJsonResponse(currentBoard));
      }
      if (url.includes('/api/groups/10/items') && method === 'POST') {
        const body = JSON.parse(String(init?.body || '{}'));
        const newItem: TaskItemRead = {
          id: 303,
          group_id: 10,
          board_id: 1,
          title: body.title,
          status_key: body.status_key || 'not_started',
          priority: body.priority || 'medium',
          assignee_id: null,
          assignee: null,
          start_date: null,
          due_date: null,
          estimated_hours: 0,
          budget: 0,
          notes: '',
          position: currentBoard.groups[0].items.length,
          comments_count: 0,
          checklist_total: 0,
          checklist_completed: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        currentBoard.groups[0].items.push(newItem);
        return Promise.resolve(createJsonResponse(newItem, 201));
      }
      if (url.includes('/api/items/301') && method === 'GET') {
        return Promise.resolve(createJsonResponse(item301Detail));
      }
      if (url.includes('/api/items/301') && method === 'PATCH') {
        const body = JSON.parse(String(init?.body || '{}'));
        currentBoard.groups[0].items[0] = {
          ...currentBoard.groups[0].items[0],
          ...body,
        };
        return Promise.resolve(createJsonResponse(currentBoard.groups[0].items[0]));
      }

      return Promise.resolve(createJsonResponse({}));
    });

    vi.stubGlobal('fetch', fetchMock);
  });

  it('1. Switcher de Vistas Superior: pestañas con indicador azul activo, menú 3 puntos y botón + para añadir vista', async () => {
    render(<App />);

    expect(await screen.findByTestId('active-board-title')).toHaveTextContent(
      'Tablero Sprint 8 Kanban',
    );

    // Pestaña Tabla Principal activa inicialmente con borde azul
    const tabTable = screen.getByTestId('view-tab-table');
    expect(tabTable).toHaveClass('border-[#0073ea]');
    expect(tabTable).toHaveClass('text-[#0073ea]');

    // Menú de 3 puntos en la pestaña de tabla
    expect(screen.getByTestId('view-menu-table')).toBeInTheDocument();

    // Contador en la pestaña Kanban
    const kanbanCounter = screen.getByTestId('kanban-tab-counter');
    expect(kanbanCounter).toHaveTextContent('2');

    // Botón + Añadir vista desplegable
    const btnAddView = screen.getByTestId('btn-add-view');
    expect(btnAddView).toBeInTheDocument();
    fireEvent.click(btnAddView);

    // Menú desplegable de vistas disponibles
    expect(screen.getByTestId('add-view-dropdown')).toBeInTheDocument();

    // Conmutar a Vista Kanban vía la pestaña
    const tabKanban = screen.getByTestId('view-tab-kanban');
    fireEvent.click(tabKanban);

    // Validar que la pestaña Kanban ahora tiene el indicador activo azul
    expect(tabKanban).toHaveClass('border-[#0073ea]');
    expect(tabKanban).toHaveClass('text-[#0073ea]');

    // El tablero Kanban se renderiza
    expect(await screen.findByTestId('kanban-board-view')).toBeInTheDocument();
  });

  it('2. Tarjetas Kanban Refinadas: micro-píldora de prioridad, acento vertical border-l-4 y avatar en esquina inferior', async () => {
    render(<App />);
    expect(await screen.findByTestId('active-board-title')).toBeInTheDocument();

    // Ir a Vista Kanban
    fireEvent.click(screen.getByTestId('view-tab-kanban'));
    expect(await screen.findByTestId('kanban-board-view')).toBeInTheDocument();

    // Validar tarjeta 301 en la columna "En Proceso"
    const colInProgress = screen.getByTestId('kanban-column-in_progress');
    const card301 = within(colInProgress).getByTestId('kanban-card-301');
    expect(card301).toBeInTheDocument();

    // Validación de estilos refinados: fondo blanco, rounded-lg y border-l-4
    expect(card301).toHaveClass('bg-white');
    expect(card301).toHaveClass('rounded-lg');
    expect(card301).toHaveClass('border-l-4');

    // Micro-píldora de prioridad crítica
    const priorityPill = within(card301).getByTestId('kanban-card-priority-301');
    expect(priorityPill).toHaveTextContent('Crítica');

    // Píldora de fecha de vencimiento atrasada (alerta visual)
    const dueDateBadge = within(card301).getByTestId('kanban-card-due-date-301');
    expect(dueDateBadge).toHaveTextContent('2026-10-25');
    expect(dueDateBadge).toHaveClass('text-[#e2445c]');

    // Avatar de responsable en la esquina inferior
    const assigneeAvatar = within(card301).getByTestId('kanban-card-assignee-301');
    expect(assigneeAvatar).toBeInTheDocument();
    expect(assigneeAvatar).toHaveTextContent('LF');

    // Clic en el título de la tarjeta abre el drawer lateral
    const cardTitle = within(card301).getByTestId('kanban-card-title-301');
    fireEvent.click(cardTitle);

    const drawer = await screen.findByTestId('item-detail-drawer');
    expect(drawer).toBeInTheDocument();
    expect(within(drawer).getByTestId('drawer-item-title')).toHaveTextContent(
      'Refinar tarjetas Kanban con acento de prioridad',
    );

    // Cerrar el drawer
    fireEvent.click(within(drawer).getByTestId('btn-close-drawer'));
    expect(screen.queryByTestId('item-detail-drawer')).not.toBeInTheDocument();
  });

  it('3. Creación rápida por columna: agrega tarea directamente en el estado de la columna correspondiente', async () => {
    render(<App />);
    expect(await screen.findByTestId('active-board-title')).toBeInTheDocument();

    // Conmutar a Vista Kanban
    fireEvent.click(screen.getByTestId('view-tab-kanban'));
    const colBlocked = await screen.findByTestId('kanban-column-blocked');

    // Escribir en el input de creación rápida al pie de la columna "Bloqueado"
    const quickInput = within(colBlocked).getByTestId('kanban-quick-add-input-blocked');
    fireEvent.change(quickInput, {
      target: { value: 'Nueva tarea rápida en Bloqueado' },
    });

    const submitBtn = within(colBlocked).getByTestId('kanban-quick-add-submit-blocked');
    fireEvent.click(submitBtn);

    // La nueva tarea aparece en la columna Bloqueado
    await waitFor(() => {
      expect(
        within(colBlocked).getByText('Nueva tarea rápida en Bloqueado'),
      ).toBeInTheDocument();
    });

    // Cambiar a la vista Tabla Principal y verificar que la tarea existe con estado Bloqueado
    fireEvent.click(screen.getByTestId('view-tab-table'));
    expect(
      await screen.findByText('Nueva tarea rápida en Bloqueado'),
    ).toBeInTheDocument();
  });
});

