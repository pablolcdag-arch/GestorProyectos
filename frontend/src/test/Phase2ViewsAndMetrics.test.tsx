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
  BoardAnalyticsRead,
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
    provider_subject_id: 'ms:carlos@gestor.dev',
    role: 'admin',
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

function createPhase2Board(): BoardDetailRead {
  return {
    id: 1,
    workspace_id: 1,
    name: 'Roadmap de Producto Q4',
    description: 'Tablero ejecutivo con métricas de horas, presupuesto y cronograma.',
    created_at: '2026-10-19T12:00:00Z',
    statuses: DEFAULT_FIVE_STATUSES.map((s) => ({ ...s })),
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
            assignee: MOCK_USERS[0],
            start_date: '2026-11-10',
            due_date: '2026-11-15',
            estimated_hours: 16,
            budget: 2400,
            notes: 'OAuth2 + JWT firmado',
            position: 0,
            comments_count: 1,
            checklist_total: 3,
            checklist_completed: 2,
            created_at: '2026-10-19T12:00:00Z',
            updated_at: '2026-10-19T12:00:00Z',
          },
          {
            id: 101,
            group_id: 10,
            board_id: 1,
            title: 'Diseñar vista Kanban interactiva',
            status_key: 'done',
            priority: 'high',
            assignee_id: 2,
            assignee: MOCK_USERS[1],
            start_date: '2026-11-12',
            due_date: '2026-11-18',
            estimated_hours: 14,
            budget: 2100,
            notes: 'Tarjetas arrastrables por columna',
            position: 1,
            comments_count: 0,
            checklist_total: 0,
            checklist_completed: 0,
            created_at: '2026-10-19T12:00:00Z',
            updated_at: '2026-10-19T12:00:00Z',
          },
        ],
      },
      {
        id: 11,
        board_id: 1,
        title: 'Próximo Sprint',
        color: '#a25ddc',
        position: 1,
        collapsed: false,
        items: [
          {
            id: 102,
            group_id: 11,
            board_id: 1,
            title: 'Documentar API de colaboración',
            status_key: 'not_started',
            priority: 'low',
            assignee_id: 1,
            assignee: MOCK_USERS[0],
            start_date: '2026-11-20',
            due_date: '2026-11-25',
            estimated_hours: 10,
            budget: 1500,
            notes: 'Swagger y ejemplos OpenAPI',
            position: 0,
            comments_count: 0,
            checklist_total: 0,
            checklist_completed: 0,
            created_at: '2026-10-19T12:00:00Z',
            updated_at: '2026-10-19T12:00:00Z',
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
    text: async () => (typeof data === 'string' ? data : JSON.stringify(data)),
  } as Response;
}

describe('Phase2ViewsAndMetrics — Fase 2: Horas/Presupuesto con Sumatorias, Duplicación, CSV, Cronograma y Dashboard', () => {
  let currentBoard: BoardDetailRead;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setAccessToken('jwt_valid_phase2_token');
    currentBoard = createPhase2Board();

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

      // PATCH /api/items/:itemId
      if (url.match(/\/api\/items\/\d+$/) && method === 'PATCH') {
        const itemId = Number(url.split('/').pop());
        const body = JSON.parse(String(init?.body));
        let found: TaskItemRead | null = null;
        for (const grp of currentBoard.groups) {
          const item = grp.items.find((i) => i.id === itemId);
          if (item) {
            if (body.estimated_hours !== undefined) {
              item.estimated_hours = body.estimated_hours;
            }
            if (body.budget !== undefined) {
              item.budget = body.budget;
            }
            if (Object.prototype.hasOwnProperty.call(body, 'start_date')) {
              item.start_date = body.start_date || null;
            }
            if (Object.prototype.hasOwnProperty.call(body, 'due_date')) {
              item.due_date = body.due_date || null;
            }
            found = { ...item };
            break;
          }
        }
        return createJsonResponse(found);
      }

      // POST /api/items/:itemId/duplicate
      if (url.match(/\/api\/items\/\d+\/duplicate$/) && method === 'POST') {
        const parts = url.split('/');
        const sourceId = Number(parts[parts.length - 2]);
        let sourceItem: TaskItemRead | undefined;
        let targetGroup: TaskGroupRead | undefined;
        for (const grp of currentBoard.groups) {
          const found = grp.items.find((i) => i.id === sourceId);
          if (found) {
            sourceItem = found;
            targetGroup = grp;
            break;
          }
        }
        const duplicated: TaskItemRead = {
          ...sourceItem!,
          id: 450,
          title: `${sourceItem!.title} (Copia)`,
          position: targetGroup!.items.length,
          comments_count: 0,
          checklist_completed: 0,
        };
        targetGroup!.items.push(duplicated);
        return createJsonResponse(duplicated, 201);
      }

      // GET /api/boards/1/export.csv
      if (url.endsWith('/api/boards/1/export.csv') && method === 'GET') {
        const csvText =
          'ID,Grupo,Tarea,Estado,Prioridad,Responsable,Fecha Inicio,Fecha Limite,Horas Estimadas,Presupuesto,Notas\n' +
          '100,"Esta Semana","Implementar autenticación SSO con Google y Microsoft","En Proceso","critical","Ana García","2026-11-10","2026-11-15",16.00,2400.00,"OAuth2 + JWT firmado"';
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'text/csv; charset=utf-8' }),
          text: async () => csvText,
          json: async () => csvText,
        } as Response;
      }

      // GET /api/boards/1/analytics
      if (url.endsWith('/api/boards/1/analytics') && method === 'GET') {
        const analytics: BoardAnalyticsRead = {
          board_id: 1,
          total_items: 3,
          completed_items: 1,
          completion_rate: 33.33,
          overdue_items: 0,
          unassigned_items: 0,
          total_estimated_hours: 40,
          total_budget: 6000,
          by_status: [
            {
              key: 'done',
              label: 'Listo',
              color: '#00c875',
              count: 1,
              percentage: 33.33,
            },
            {
              key: 'in_progress',
              label: 'En Proceso',
              color: '#fdab3d',
              count: 1,
              percentage: 33.33,
            },
            {
              key: 'not_started',
              label: 'Sin Empezar',
              color: '#c4c4c4',
              count: 1,
              percentage: 33.33,
            },
          ],
          by_priority: [
            { priority: 'critical', count: 1 },
            { priority: 'high', count: 1 },
            { priority: 'medium', count: 0 },
            { priority: 'low', count: 1 },
          ],
          by_assignee: [
            {
              user_id: 1,
              full_name: 'Ana García',
              color: '#0073ea',
              total_items: 2,
              completed_items: 0,
              estimated_hours: 26,
              budget: 3900,
            },
            {
              user_id: 2,
              full_name: 'Carlos Ruiz',
              color: '#00c875',
              total_items: 1,
              completed_items: 1,
              estimated_hours: 14,
              budget: 2100,
            },
          ],
          by_group: [
            {
              group_id: 10,
              title: 'Esta Semana',
              color: '#579bfc',
              total_items: 2,
              completed_items: 1,
              total_estimated_hours: 30,
              total_budget: 4500,
            },
            {
              group_id: 11,
              title: 'Próximo Sprint',
              color: '#a25ddc',
              total_items: 1,
              completed_items: 0,
              total_estimated_hours: 10,
              total_budget: 1500,
            },
          ],
        };
        return createJsonResponse(analytics);
      }

      return createJsonResponse({});
    });

    vi.stubGlobal('fetch', fetchMock);
  });

  it('1. Edición Inline de Horas y Presupuesto + Sumatorias Automáticas por Grupo', async () => {
    render(<App />);

    expect(await screen.findByTestId('active-board-title')).toHaveTextContent(
      'Roadmap de Producto Q4',
    );

    // Verificar sumatorias iniciales del Grupo 10 (16h + 14h = 30h; $2,400 + $2,100 = $4,500)
    expect(screen.getByTestId('group-sum-hours-10')).toHaveTextContent('30 h');
    expect(screen.getByTestId('group-sum-budget-10')).toHaveTextContent(
      '$4,500',
    );

    // Editar horas estimadas de la tarea 100 de 16 a 22.5
    fireEvent.change(screen.getByTestId('task-hours-input-100'), {
      target: { value: '22.5' },
    });

    // Optimistic update inmediato en la sumatoria del grupo: 22.5 + 14 = 36.5 h
    expect(screen.getByTestId('group-sum-hours-10')).toHaveTextContent(
      '36.5 h',
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/items/100',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ estimated_hours: 22.5 }),
        }),
      );
    });

    // Editar presupuesto de la tarea 100 de 2400 a 3100
    fireEvent.change(screen.getByTestId('task-budget-input-100'), {
      target: { value: '3100' },
    });

    // Optimistic update en la sumatoria del grupo: $3,100 + $2,100 = $5,200
    expect(screen.getByTestId('group-sum-budget-10')).toHaveTextContent(
      '$5,200',
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/items/100',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ budget: 3100 }),
        }),
      );
    });
  });

  it('2. Duplicación de Tarea y Exportación CSV del Tablero', async () => {
    render(<App />);

    expect(await screen.findByTestId('active-board-title')).toHaveTextContent(
      'Roadmap de Producto Q4',
    );

    // 2.1 Duplicar la tarea 100
    fireEvent.click(screen.getByTestId('btn-duplicate-task-100'));

    expect(await screen.findByTestId('task-row-450')).toBeInTheDocument();
    expect(screen.getByTestId('task-title-display-450')).toHaveTextContent(
      'Implementar autenticación SSO con Google y Microsoft (Copia)',
    );

    // Las sumatorias del grupo 10 ahora incluyen la copia (30 + 16 = 46 h; $4,500 + $2,400 = $6,900)
    expect(screen.getByTestId('group-sum-hours-10')).toHaveTextContent('46 h');
    expect(screen.getByTestId('group-sum-budget-10')).toHaveTextContent(
      '$6,900',
    );

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/items/100/duplicate',
      expect.objectContaining({ method: 'POST' }),
    );

    // 2.2 Exportar CSV del tablero
    fireEvent.click(screen.getByTestId('btn-export-csv'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/boards/1/export.csv',
        expect.objectContaining({ method: 'GET' }),
      );
    });
  });

  it('3. Vista Cronograma (TimelineCalendarView): renderiza línea de tiempo con duración en días y permite editar start_date inline', async () => {
    render(<App />);

    expect(await screen.findByTestId('active-board-title')).toHaveTextContent(
      'Roadmap de Producto Q4',
    );

    // Cambiar a la pestaña Cronograma
    fireEvent.click(screen.getByTestId('view-tab-timeline'));

    const timelineView = await screen.findByTestId('timeline-calendar-view');
    expect(timelineView).toBeInTheDocument();

    // Verificar fila de tarea 100 y su duración inicial (2026-11-10 a 2026-11-15 = 6 días)
    expect(
      within(timelineView).getByTestId('timeline-row-100'),
    ).toBeInTheDocument();
    expect(
      within(timelineView).getByTestId('timeline-duration-100'),
    ).toHaveTextContent('6 d');

    // Editar start_date de la tarea 100 de 2026-11-10 a 2026-11-08 (8 días)
    fireEvent.change(
      within(timelineView).getByTestId('timeline-startdate-input-100'),
      {
        target: { value: '2026-11-08' },
      },
    );

    expect(
      within(timelineView).getByTestId('timeline-duration-100'),
    ).toHaveTextContent('8 d');

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/items/100',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ start_date: '2026-11-08' }),
        }),
      );
    });
  });

  it('4. Vista Dashboard Ejecutivo (DashboardView): carga analítica y muestra KPIs y desgloses por estado, prioridad, responsable y grupo', async () => {
    render(<App />);

    expect(await screen.findByTestId('active-board-title')).toHaveTextContent(
      'Roadmap de Producto Q4',
    );

    // Cambiar a la pestaña Dashboard
    fireEvent.click(screen.getByTestId('view-tab-dashboard'));

    const dashboard = await screen.findByTestId('board-dashboard-view');
    expect(dashboard).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/boards/1/analytics',
        expect.anything(),
      );
    });

    // Verificar KPIs ejecutivos
    expect(
      within(dashboard).getByTestId('kpi-completion-rate'),
    ).toHaveTextContent('33.33%');
    expect(within(dashboard).getByTestId('kpi-total-hours')).toHaveTextContent(
      '40 h',
    );
    expect(within(dashboard).getByTestId('kpi-total-budget')).toHaveTextContent(
      '$6,000',
    );

    // Verificar gráficos y tablas de desglose
    expect(
      within(dashboard).getByTestId('dashboard-status-chart'),
    ).toHaveTextContent('En Proceso');
    expect(
      within(dashboard).getByTestId('dashboard-priority-chart'),
    ).toHaveTextContent('Crítica');
    expect(
      within(dashboard).getByTestId('dashboard-assignee-table'),
    ).toHaveTextContent('Ana García');
    expect(
      within(dashboard).getByTestId('dashboard-group-summary'),
    ).toHaveTextContent('Esta Semana');
  });
});

