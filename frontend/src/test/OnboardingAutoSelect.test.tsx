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

const ONBOARDING_USER: UserRead = {
  id: 1,
  email: 'newuser@gestor.dev',
  full_name: 'Nuevo Usuario',
  avatar_url: null,
  color: '#0073ea',
  auth_provider: 'google',
  provider_subject_id: 'google:newuser@gestor.dev',
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

const ONBOARDING_BOARD_DETAIL: BoardDetailRead = {
  id: 1,
  workspace_id: 1,
  name: 'Primer proyecto',
  description: 'Gestioná tus tareas y flujos de trabajo en un solo lugar',
  created_at: '2026-10-19T12:00:00Z',
  statuses: DEFAULT_FIVE_STATUSES,
  groups: [
    {
      id: 1,
      board_id: 1,
      title: 'Pendientes',
      color: '#579bfc',
      position: 0,
      collapsed: false,
      items: [
        {
          id: 101,
          group_id: 1,
          board_id: 1,
          title: 'Tarea 1',
          status_key: 'in_progress',
          priority: 'low',
          assignee_id: 1,
          assignee: ONBOARDING_USER,
          start_date: '2026-10-20',
          due_date: '2026-10-25',
          estimated_hours: 4.0,
          budget: 100.0,
          notes: 'Elementos de acción y entregables principales',
          position: 0,
          created_at: '2026-10-19T12:00:00Z',
          updated_at: '2026-10-19T12:00:00Z',
        },
        {
          id: 102,
          group_id: 1,
          board_id: 1,
          title: 'Tarea 2',
          status_key: 'done',
          priority: 'high',
          assignee_id: null,
          assignee: null,
          start_date: '2026-10-21',
          due_date: '2026-10-28',
          estimated_hours: 8.0,
          budget: 1000.0,
          notes: 'Notas de la reunión y seguimiento con el equipo',
          position: 1,
          created_at: '2026-10-19T12:00:00Z',
          updated_at: '2026-10-19T12:00:00Z',
        },
        {
          id: 103,
          group_id: 1,
          board_id: 1,
          title: 'Tarea 3',
          status_key: 'blocked',
          priority: 'medium',
          assignee_id: null,
          assignee: null,
          start_date: '2026-10-22',
          due_date: '2026-10-30',
          estimated_hours: 2.0,
          budget: 500.0,
          notes: 'Revisión técnica y control de calidad',
          position: 2,
          created_at: '2026-10-19T12:00:00Z',
          updated_at: '2026-10-19T12:00:00Z',
        },
      ],
    },
    {
      id: 2,
      board_id: 1,
      title: 'Completado',
      color: '#00c875',
      position: 1,
      collapsed: false,
      items: [],
    },
  ],
};

const ONBOARDING_WORKSPACES: WorkspaceRead[] = [
  {
    id: 1,
    name: 'Mi Espacio de Trabajo',
    description: 'Espacio de trabajo por defecto',
    icon: 'Briefcase',
    color: '#0073ea',
    owner_id: 1,
    created_at: '2026-10-19T12:00:00Z',
    boards: [
      {
        id: 1,
        workspace_id: 1,
        name: 'Primer proyecto',
        description: 'Gestioná tus tareas y flujos de trabajo en un solo lugar',
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

describe('OnboardingAutoSelect — Onboarding Automático y Auto-Selección 1:1 Monday.com', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setAccessToken('valid_test_onboarding_token');
  });

  it('1. Auto-selecciona el tablero "Primer proyecto" al autenticarse sin parpadeo de estado vacío y renderiza tareas y sumatorias 1:1 Monday', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/auth/providers')) {
        return createJsonResponse([]);
      }
      if (url.includes('/api/auth/me')) {
        return createJsonResponse(ONBOARDING_USER);
      }
      if (url.includes('/api/users')) {
        return createJsonResponse([ONBOARDING_USER]);
      }
      if (url.includes('/api/workspaces')) {
        return createJsonResponse(ONBOARDING_WORKSPACES);
      }
      if (url.includes('/api/boards/1/automations')) {
        return createJsonResponse([]);
      }
      if (url.includes('/api/boards/1/analytics')) {
        return createJsonResponse({
          board_id: 1,
          total_items: 3,
          completed_items: 1,
          completion_rate: 33.3,
          total_estimated_hours: 14.0,
          total_budget: 1600.0,
          status_counts: { done: 1, in_progress: 1, blocked: 1 },
          priority_counts: { low: 1, high: 1, medium: 1 },
          assignee_breakdown: [],
          group_breakdown: [],
        });
      }
      if (url.includes('/api/boards/1')) {
        return createJsonResponse(ONBOARDING_BOARD_DETAIL);
      }
      return createJsonResponse({});
    });

    render(<App />);

    // Verificación defensiva contra parpadeos:
    // "No hay ningún tablero seleccionado" NUNCA debe estar en el DOM
    expect(
      screen.queryByText('No hay ningún tablero seleccionado'),
    ).not.toBeInTheDocument();

    // El tablero "Primer proyecto" se auto-selecciona e impacta de inmediato en el título
    const boardTitle = await screen.findByTestId('active-board-title');
    expect(boardTitle).toHaveTextContent('Primer proyecto');

    // Confirmar que el texto de estado vacío jamás apareció
    expect(
      screen.queryByText('No hay ningún tablero seleccionado'),
    ).not.toBeInTheDocument();

    // Verificar renderizado de grupos de bienvenida de Monday
    expect(screen.getByText('Pendientes')).toBeInTheDocument();
    expect(screen.getByText('Completado')).toBeInTheDocument();

    // Verificar las 3 tareas auténticas de bienvenida
    expect(screen.getByText('Tarea 1')).toBeInTheDocument();
    expect(screen.getByText('Tarea 2')).toBeInTheDocument();
    expect(screen.getByText('Tarea 3')).toBeInTheDocument();

    // Verificar sumatoria de presupuesto exacto en el pie del grupo: $1,600 Total (100 + 1000 + 500)
    const budgetSum = screen.getByTestId('group-sum-budget-1');
    expect(budgetSum).toHaveTextContent(/1,600/);

    // Verificar sumatoria de horas estimadas en el pie del grupo: 14 h Total (4 + 8 + 2)
    const hoursSum = screen.getByTestId('group-sum-hours-1');
    expect(hoursSum).toHaveTextContent(/14/);

    // En el Sidebar, "Primer proyecto" está presente y destacado con estilo activo
    const sidebarBoardBtn = screen.getByTestId('board-item-1');
    expect(sidebarBoardBtn).toBeInTheDocument();
    expect(sidebarBoardBtn).toHaveTextContent('Primer proyecto');
    // El contenedor de la fila de tablero debe tener la clase activa
    expect(sidebarBoardBtn.closest('div')).toHaveClass('text-[#0073ea]');
  });

  it('2. Muestra indicador de carga suave y previene el estado "No hay ningún tablero seleccionado" durante llamadas asíncronas', async () => {
    let resolveWorkspacesPromise: (res: Response) => void;
    const workspacesDelay = new Promise<Response>((resolve) => {
      resolveWorkspacesPromise = resolve;
    });

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/auth/providers')) {
        return createJsonResponse([]);
      }
      if (url.includes('/api/auth/me')) {
        return createJsonResponse(ONBOARDING_USER);
      }
      if (url.includes('/api/users')) {
        return createJsonResponse([ONBOARDING_USER]);
      }
      if (url.includes('/api/workspaces')) {
        return workspacesDelay;
      }
      if (url.includes('/api/boards/1')) {
        return createJsonResponse(ONBOARDING_BOARD_DETAIL);
      }
      return createJsonResponse({});
    });

    render(<App />);

    // Esperar a que la sesión se restaure y comience la carga asíncrona de espacios
    await waitFor(() => {
      expect(screen.getByText('Cargando tablero...')).toBeInTheDocument();
    });

    // Y el cartel de vacío no debe existir en ningún momento
    expect(
      screen.queryByText('No hay ningún tablero seleccionado'),
    ).not.toBeInTheDocument();

    // Resolvemos la carga de workspaces
    resolveWorkspacesPromise!(createJsonResponse(ONBOARDING_WORKSPACES));

    // El tablero carga y muestra su contenido
    expect(await screen.findByTestId('active-board-title')).toHaveTextContent(
      'Primer proyecto',
    );
    expect(
      screen.queryByText('No hay ningún tablero seleccionado'),
    ).not.toBeInTheDocument();
  });

  it('3. Auto-selecciona defensivamente el primer tablero al conmutar entre espacios de trabajo con tableros', async () => {
    const TWO_WORKSPACES: WorkspaceRead[] = [
      ONBOARDING_WORKSPACES[0],
      {
        id: 2,
        name: 'Operaciones & Finanzas',
        description: 'Gestión contable y proyectos de escala',
        icon: 'Rocket',
        color: '#cab641',
        owner_id: 1,
        created_at: '2026-10-19T12:00:00Z',
        boards: [
          {
            id: 20,
            workspace_id: 2,
            name: 'Facturación Q4',
            description: 'Control de facturación y cobros',
            created_at: '2026-10-19T12:00:00Z',
          },
        ],
      },
    ];

    const BOARD_20_DETAIL: BoardDetailRead = {
      id: 20,
      workspace_id: 2,
      name: 'Facturación Q4',
      description: 'Control de facturación y cobros',
      created_at: '2026-10-19T12:00:00Z',
      statuses: DEFAULT_FIVE_STATUSES,
      groups: [
        {
          id: 201,
          board_id: 20,
          title: 'Emisiones Pendientes',
          color: '#cab641',
          position: 0,
          collapsed: false,
          items: [
            {
              id: 2001,
              group_id: 201,
              board_id: 20,
              title: 'Emitir factura cliente A',
              status_key: 'in_progress',
              priority: 'high',
              assignee_id: 1,
              assignee: ONBOARDING_USER,
              start_date: '2026-10-25',
              due_date: '2026-10-27',
              estimated_hours: 3.0,
              budget: 450.0,
              notes: 'Factura mensual recurrente',
              position: 0,
              created_at: '2026-10-19T12:00:00Z',
              updated_at: '2026-10-19T12:00:00Z',
            },
          ],
        },
      ],
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/auth/providers')) {
        return createJsonResponse([]);
      }
      if (url.includes('/api/auth/me')) {
        return createJsonResponse(ONBOARDING_USER);
      }
      if (url.includes('/api/users')) {
        return createJsonResponse([ONBOARDING_USER]);
      }
      if (url.includes('/api/workspaces')) {
        return createJsonResponse(TWO_WORKSPACES);
      }
      if (url.includes('/api/boards/1')) {
        return createJsonResponse(ONBOARDING_BOARD_DETAIL);
      }
      if (url.includes('/api/boards/20')) {
        return createJsonResponse(BOARD_20_DETAIL);
      }
      return createJsonResponse({});
    });

    render(<App />);

    // El tablero inicial es "Primer proyecto"
    expect(await screen.findByTestId('active-board-title')).toHaveTextContent(
      'Primer proyecto',
    );

    // Conmutar al espacio "Operaciones & Finanzas" haciendo clic en el workspace item
    const ws2Button = screen.getByTestId('workspace-item-2');
    fireEvent.click(ws2Button);

    // Debe auto-seleccionar y cargar el tablero 20 ("Facturación Q4") inmediatamente
    await waitFor(() => {
      expect(screen.getByTestId('active-board-title')).toHaveTextContent(
        'Facturación Q4',
      );
    });

    // En ningún momento se visualiza "No hay ningún tablero seleccionado"
    expect(
      screen.queryByText('No hay ningún tablero seleccionado'),
    ).not.toBeInTheDocument();

    // Comprobar que la tarea del nuevo tablero se renderiza
    expect(screen.getByText('Emitir factura cliente A')).toBeInTheDocument();
  });
});
