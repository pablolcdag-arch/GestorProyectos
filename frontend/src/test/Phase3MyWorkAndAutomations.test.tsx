import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import App from '../App';
import { setAccessToken } from '../services/api';
import type {
  BoardAutomationRead,
  BoardDetailRead,
  BoardStatusRead,
  MyWorkResponse,
  TaskItemDetailRead,
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
];

const DEFAULT_STATUSES: BoardStatusRead[] = [
  { id: 1, board_id: 1, key: 'done', label: 'Listo', color: '#00c875', position: 0 },
  { id: 2, board_id: 1, key: 'working', label: 'En Proceso', color: '#fdab3d', position: 1 },
  { id: 3, board_id: 1, key: 'blocked', label: 'Bloqueado', color: '#e2445c', position: 2 },
  { id: 4, board_id: 1, key: 'transferred', label: 'Traspasado', color: '#a25ddc', position: 3 },
  { id: 5, board_id: 1, key: 'not_started', label: 'Sin Empezar', color: '#c4c4c4', position: 4 },
];

function createMockBoard(): BoardDetailRead {
  return {
    id: 1,
    workspace_id: 1,
    name: 'Tablero Operaciones',
    description: 'Gestión de operaciones del equipo',
    created_at: '2026-10-19T12:00:00Z',
    statuses: DEFAULT_STATUSES,
    groups: [
      {
        id: 10,
        board_id: 1,
        title: 'Tareas Clave',
        color: '#579bfc',
        position: 0,
        collapsed: false,
        items: [
          {
            id: 101,
            group_id: 10,
            board_id: 1,
            title: 'Reporte Financiero',
            status_key: 'working',
            priority: 'high',
            assignee_id: 1,
            assignee: MOCK_USERS[0],
            start_date: '2026-10-01',
            due_date: '2026-10-05',
            estimated_hours: 10,
            budget: 500,
            notes: 'Revisión con auditor',
            position: 0,
            comments_count: 2,
            checklist_total: 2,
            checklist_completed: 1,
            created_at: '2026-10-19T12:00:00Z',
            updated_at: '2026-10-19T12:00:00Z',
          },
        ],
      },
    ],
  };
}

function createMockMyWorkResponse(): MyWorkResponse {
  return {
    summary: {
      total_assigned: 3,
      overdue_count: 1,
      today_count: 1,
      this_week_count: 0,
      upcoming_count: 0,
      completed_count: 1,
    },
    overdue: [
      {
        id: 101,
        group_id: 10,
        board_id: 1,
        title: 'Auditoría de Seguridad Vencida',
        status_key: 'working',
        priority: 'critical',
        assignee_id: 1,
        assignee: MOCK_USERS[0],
        start_date: '2026-10-01',
        due_date: '2026-10-10',
        estimated_hours: 15,
        budget: 1200,
        notes: 'Urgente',
        position: 0,
        comments_count: 3,
        checklist_total: 4,
        checklist_completed: 2,
        created_at: '2026-10-19T12:00:00Z',
        updated_at: '2026-10-19T12:00:00Z',
        board_name: 'Tablero Operaciones',
        workspace_id: 1,
        workspace_name: 'Espacio Principal',
        group_title: 'Seguridad',
        group_color: '#e2445c',
      },
    ],
    today: [
      {
        id: 102,
        group_id: 10,
        board_id: 1,
        title: 'Presentación para Clientes Hoy',
        status_key: 'working',
        priority: 'high',
        assignee_id: 1,
        assignee: MOCK_USERS[0],
        start_date: '2026-10-19',
        due_date: '2026-10-19',
        estimated_hours: 4,
        budget: 300,
        notes: 'En sala de juntas',
        position: 1,
        comments_count: 1,
        checklist_total: 2,
        checklist_completed: 1,
        created_at: '2026-10-19T12:00:00Z',
        updated_at: '2026-10-19T12:00:00Z',
        board_name: 'Tablero Operaciones',
        workspace_id: 1,
        workspace_name: 'Espacio Principal',
        group_title: 'Tareas Clave',
        group_color: '#579bfc',
      },
    ],
    this_week: [],
    upcoming_or_no_date: [],
    completed: [
      {
        id: 103,
        group_id: 10,
        board_id: 1,
        title: 'Capacitación del Equipo',
        status_key: 'done',
        priority: 'medium',
        assignee_id: 1,
        assignee: MOCK_USERS[0],
        start_date: '2026-10-12',
        due_date: '2026-10-15',
        estimated_hours: 8,
        budget: 600,
        notes: 'Finalizada con éxito',
        position: 2,
        comments_count: 0,
        checklist_total: 2,
        checklist_completed: 2,
        created_at: '2026-10-19T12:00:00Z',
        updated_at: '2026-10-19T12:00:00Z',
        board_name: 'Tablero Operaciones',
        workspace_id: 1,
        workspace_name: 'Espacio Principal',
        group_title: 'Tareas Clave',
        group_color: '#579bfc',
      },
    ],
  };
}

function createJsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response;
}

describe('Phase3MyWorkAndAutomations — Fase 3: Mi Trabajo, Automatizaciones y Docker', () => {
  let currentBoard: BoardDetailRead;
  let currentMyWork: MyWorkResponse;
  let currentAutomations: BoardAutomationRead[];
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setAccessToken('jwt_valid_phase3_token');
    currentBoard = createMockBoard();
    currentMyWork = createMockMyWorkResponse();
    currentAutomations = [];

    const workspaces: WorkspaceRead[] = [
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
            name: currentBoard.name,
            description: currentBoard.description,
            created_at: currentBoard.created_at,
          },
        ],
      },
    ];

    fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = (init?.method || 'GET').toUpperCase();

      if (url.endsWith('/api/auth/me') && method === 'GET') {
        return createJsonResponse(MOCK_USERS[0]);
      }
      if (url.endsWith('/api/auth/providers') && method === 'GET') {
        return createJsonResponse([]);
      }
      if (url.endsWith('/api/users') && method === 'GET') {
        return createJsonResponse(MOCK_USERS);
      }
      if (url.endsWith('/api/workspaces') && method === 'GET') {
        return createJsonResponse(workspaces);
      }
      if (url.endsWith('/api/boards/1') && method === 'GET') {
        return createJsonResponse(currentBoard);
      }

      // GET /api/my-work
      if (url.endsWith('/api/my-work') && method === 'GET') {
        return createJsonResponse(currentMyWork);
      }

      // GET /api/boards/1/automations
      if (url.endsWith('/api/boards/1/automations') && method === 'GET') {
        return createJsonResponse(currentAutomations);
      }

      // POST /api/boards/1/automations
      if (url.endsWith('/api/boards/1/automations') && method === 'POST') {
        const body = JSON.parse(String(init?.body));
        const newRule: BoardAutomationRead = {
          id: currentAutomations.length + 1,
          board_id: 1,
          rule_type: body.rule_type,
          target_status_key: body.target_status_key ?? 'done',
          is_active: body.is_active ?? true,
          created_at: '2026-10-19T12:00:00Z',
        };
        currentAutomations = [...currentAutomations, newRule];
        return createJsonResponse(newRule, 201);
      }

      // PATCH /api/automations/:id
      if (url.match(/\/api\/automations\/\d+$/) && method === 'PATCH') {
        const ruleId = Number(url.split('/').pop());
        const body = JSON.parse(String(init?.body));
        const rule = currentAutomations.find((r) => r.id === ruleId);
        if (rule) {
          if (body.is_active !== undefined) rule.is_active = body.is_active;
          if (body.target_status_key !== undefined)
            rule.target_status_key = body.target_status_key;
        }
        return createJsonResponse(rule ?? currentAutomations[0]);
      }

      // PATCH /api/items/:id
      if (url.match(/\/api\/items\/\d+$/) && method === 'PATCH') {
        const itemId = Number(url.split('/').pop());
        const body = JSON.parse(String(init?.body));

        // Actualizar en currentBoard si existe
        for (const g of currentBoard.groups) {
          const itm = g.items.find((i) => i.id === itemId);
          if (itm) {
            Object.assign(itm, body);
            return createJsonResponse({ ...itm });
          }
        }

        // Actualizar en currentMyWork si existe
        const allMyWorkLists = [
          currentMyWork.overdue,
          currentMyWork.today,
          currentMyWork.this_week,
          currentMyWork.upcoming_or_no_date,
          currentMyWork.completed,
        ];
        for (const list of allMyWorkLists) {
          const itm = list.find((i) => i.id === itemId);
          if (itm) {
            Object.assign(itm, body);
            return createJsonResponse({ ...itm });
          }
        }

        return createJsonResponse({ id: itemId, ...body });
      }

      // GET /api/items/:id/detail
      if (url.match(/\/api\/items\/\d+\/detail$/) && method === 'GET') {
        const itemId = Number(url.split('/')[4]);
        const detail: TaskItemDetailRead = {
          id: itemId,
          group_id: 10,
          board_id: 1,
          title: 'Detalle de Tarea ' + itemId,
          status_key: 'working',
          priority: 'high',
          assignee_id: 1,
          assignee: MOCK_USERS[0],
          notes: 'Notas de detalle',
          position: 0,
          comments_count: 0,
          checklist_total: 0,
          checklist_completed: 0,
          created_at: '2026-10-19T12:00:00Z',
          updated_at: '2026-10-19T12:00:00Z',
          comments: [],
          checklist_items: [],
          activities: [],
        };
        return createJsonResponse(detail);
      }

      return createJsonResponse({ detail: `Unhandled ${method} ${url}` }, 404);
    });

    vi.stubGlobal('fetch', fetchMock);
  });

  it('1. Vista Global Mi Trabajo: navega vía Sidebar, renderiza secciones y KPIs, y permite editar inline el estado', async () => {
    render(<App />);

    // Esperar a que cargue el tablero inicial
    await waitFor(() => {
      expect(screen.getByTestId('active-board-title')).toBeInTheDocument();
    });

    // Hacer clic en "Mi Trabajo" en la barra lateral
    const myWorkBtn = screen.getByTestId('nav-my-work');
    expect(myWorkBtn).toBeInTheDocument();
    fireEvent.click(myWorkBtn);

    // Verificar que se haya llamado a /api/my-work
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/my-work$/),
        expect.anything(),
      );
    });

    // Verificar que se renderice el contenedor principal de Mi Trabajo
    expect(await screen.findByTestId('my-work-view')).toBeInTheDocument();

    // Verificar que las 5 secciones temporales estén presentes
    expect(screen.getByTestId('mywork-section-overdue')).toBeInTheDocument();
    expect(screen.getByTestId('mywork-section-today')).toBeInTheDocument();
    expect(screen.getByTestId('mywork-section-this-week')).toBeInTheDocument();
    expect(screen.getByTestId('mywork-section-upcoming')).toBeInTheDocument();
    expect(screen.getByTestId('mywork-section-completed')).toBeInTheDocument();

    // Verificar las filas de las tareas
    expect(screen.getByTestId('mywork-row-101')).toBeInTheDocument();
    expect(screen.getByTestId('mywork-row-102')).toBeInTheDocument();
    expect(screen.getByTestId('mywork-row-103')).toBeInTheDocument();

    // Verificar tags de contexto
    expect(screen.getByText('Auditoría de Seguridad Vencida')).toBeInTheDocument();
    expect(screen.getByText('Presentación para Clientes Hoy')).toBeInTheDocument();

    // Editar inline el estado de la tarea 101 a 'done'
    const statusSelect = screen.getByTestId('task-status-select-101');
    fireEvent.change(statusSelect, { target: { value: 'done' } });

    // Verificar que se invoque PATCH /api/items/101 con status_key: done
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/items\/101$/),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status_key: 'done' }),
        }),
      );
    });

    // Abrir el drawer de detalle desde Mi Trabajo
    const drawerBtn = screen.getByTestId('btn-open-drawer-101');
    fireEvent.click(drawerBtn);

    // Verificar que abra el drawer de detalle
    await waitFor(() => {
      expect(screen.getByTestId('item-detail-drawer')).toBeInTheDocument();
    });
  });

  it('2. Modal de Automatizaciones de Tablero: abre el modal, lista las 3 recetas y permite activar una regla', async () => {
    render(<App />);

    // Esperar a que cargue el tablero
    await waitFor(() => {
      expect(screen.getByTestId('active-board-title')).toBeInTheDocument();
    });

    // Botón para abrir el modal de automatizaciones
    const automationsBtn = screen.getByTestId('btn-open-automations-modal');
    expect(automationsBtn).toBeInTheDocument();
    fireEvent.click(automationsBtn);

    // Verificar que se abra el modal
    await waitFor(() => {
      expect(screen.getByTestId('automations-modal')).toBeInTheDocument();
    });

    // Verificar llamada a GET /api/boards/1/automations
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/boards\/1\/automations$/),
      expect.anything(),
    );

    // Verificar la presencia de las 3 recetas
    const toggleChecklist = screen.getByTestId(
      'automation-toggle-when_checklist_complete_set_status',
    );
    const toggleStatusDone = screen.getByTestId(
      'automation-toggle-when_status_done_complete_checklist',
    );
    const toggleBlocked = screen.getByTestId(
      'automation-toggle-when_status_blocked_log_alert',
    );

    expect(toggleChecklist).toBeInTheDocument();
    expect(toggleStatusDone).toBeInTheDocument();
    expect(toggleBlocked).toBeInTheDocument();

    // Activar la regla 'when_checklist_complete_set_status'
    fireEvent.click(toggleChecklist);

    // Verificar que se envíe POST /api/boards/1/automations
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/boards\/1\/automations$/),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            rule_type: 'when_checklist_complete_set_status',
            is_active: true,
          }),
        }),
      );
    });

    // Verificar que el switch muestre que está Activa
    await waitFor(() => {
      expect(toggleChecklist).toHaveAttribute('aria-pressed', 'true');
    });

    // Cerrar el modal
    const closeBtn = screen.getByTestId('btn-close-automations');
    fireEvent.click(closeBtn);

    // Verificar que el modal se haya cerrado
    await waitFor(() => {
      expect(screen.queryByTestId('automations-modal')).not.toBeInTheDocument();
    });
  });
});
