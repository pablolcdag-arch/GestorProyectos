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
  { id: 2, board_id: 1, key: 'in_progress', label: 'En Proceso', color: '#fdab3d', position: 1 },
  { id: 3, board_id: 1, key: 'blocked', label: 'Bloqueado', color: '#e2445c', position: 2 },
  { id: 4, board_id: 1, key: 'handed_over', label: 'Traspasado', color: '#a25ddc', position: 3 },
  { id: 5, board_id: 1, key: 'not_started', label: 'Sin Empezar', color: '#c4c4c4', position: 4 },
];

const INITIAL_BOARD: BoardDetailRead = {
  id: 1,
  workspace_id: 1,
  name: 'Roadmap de Producto Q4',
  description: 'Seguimiento general.',
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
          title: 'Configurar infraestructura base',
          status_key: 'in_progress',
          priority: 'critical',
          assignee_id: 1,
          assignee: MOCK_USER,
          due_date: '2026-10-25',
          notes: 'Servidores cloud',
          position: 0,
          created_at: '2026-10-19T12:00:00Z',
          updated_at: '2026-10-19T12:00:00Z',
        },
      ],
    },
  ],
};

const BOARD_AFTER_AI_TASKS: BoardDetailRead = {
  ...INITIAL_BOARD,
  groups: [
    {
      id: 10,
      board_id: 1,
      title: 'Esta Semana',
      color: '#579bfc',
      position: 0,
      collapsed: false,
      items: [
        ...INITIAL_BOARD.groups[0].items,
        {
          id: 201,
          group_id: 10,
          board_id: 1,
          title: 'Diseñar wireframes de alta fidelidad',
          status_key: 'not_started',
          priority: 'high',
          assignee_id: 1,
          assignee: MOCK_USER,
          due_date: '2026-10-30',
          notes: 'Generado por Sidekick IA',
          position: 1,
          created_at: '2026-10-19T12:00:00Z',
          updated_at: '2026-10-19T12:00:00Z',
        },
        {
          id: 202,
          group_id: 10,
          board_id: 1,
          title: 'Definir arquitectura de microservicios',
          status_key: 'in_progress',
          priority: 'critical',
          assignee_id: null,
          assignee: null,
          due_date: '2026-11-02',
          notes: 'Generado por Sidekick IA',
          position: 2,
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
        description: 'Seguimiento general.',
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

describe('AIAssistantSidekick — Interfaz Sidekick "Preguntar, crear, analizar" 1:1 Monday.com', () => {
  let boardData = INITIAL_BOARD;

  beforeEach(() => {
    vi.restoreAllMocks();
    setAccessToken('valid_ai_test_jwt');
    boardData = INITIAL_BOARD;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method?.toUpperCase() || 'GET';

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
      if (url.includes('/api/boards/1/automations')) {
        return createJsonResponse([]);
      }
      if (url.includes('/api/boards/1/analytics')) {
        return createJsonResponse({});
      }
      if (url.includes('/api/billing/plans')) {
        return createJsonResponse([]);
      }
      if (url.includes('/api/billing/subscription')) {
        return createJsonResponse({
          id: 1,
          user_id: 1,
          plan_tier: 'pro',
          billing_cycle: 'yearly',
          status: 'active',
        });
      }
      if (url.includes('/api/boards/1') && method === 'GET') {
        return createJsonResponse(boardData);
      }
      if (url.includes('/api/ai/ask') && method === 'POST') {
        const body = JSON.parse((init?.body as string) || '{}');
        const actionType = body.action_type;

        if (actionType === 'summarize_board') {
          return createJsonResponse({
            action_type: 'summarize_board',
            message: 'Resumen ejecutivo generado exitosamente',
            created_tasks_count: 0,
            summary_text:
              'El tablero Roadmap de Producto Q4 cuenta con 3 tareas activas. Presupuesto total asignado: $3,200 USD. El 50% de las tareas críticas están en progreso.',
          });
        }

        if (actionType === 'breakdown_checklist') {
          return createJsonResponse({
            action_type: 'breakdown_checklist',
            message: 'Checklist generado exitosamente',
            created_tasks_count: 0,
            checklist_items: [
              'Definir especificación funcional',
              'Validar wireframes con stakeholders',
              'Aprobar estimación de horas',
            ],
          });
        }

        // Por defecto: generate_tasks
        boardData = BOARD_AFTER_AI_TASKS;
        return createJsonResponse({
          action_type: 'generate_tasks',
          message: 'Se generaron 2 nuevas tareas para el lanzamiento',
          created_tasks_count: 2,
        });
      }
      return createJsonResponse({});
    });
  });

  it('1. Renderiza la píldora flotante "Preguntar, crear, analizar" 1:1 Monday.com al pie del tablero', async () => {
    render(<App />);

    expect(await screen.findByTestId('active-board-title')).toHaveTextContent(
      'Roadmap de Producto Q4',
    );

    // Verificar que la píldora flotante esté presente y visible
    const pill = screen.getByTestId('btn-ai-assistant-pill');
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveTextContent('Preguntar, crear, analizar');
    expect(pill).toHaveTextContent('Sidekick');
  });

  it('2. Abre y cierra el panel expandible al hacer clic en la píldora o en el botón de cerrar', async () => {
    render(<App />);

    expect(await screen.findByTestId('active-board-title')).toHaveTextContent(
      'Roadmap de Producto Q4',
    );

    // Inicialmente el panel no está abierto
    expect(screen.queryByTestId('ai-assistant-panel')).not.toBeInTheDocument();

    // Clic en la píldora abre el panel
    fireEvent.click(screen.getByTestId('btn-ai-assistant-pill'));

    const panel = await screen.findByTestId('ai-assistant-panel');
    expect(panel).toBeInTheDocument();

    // Input de prompt con placeholder específico
    const input = screen.getByTestId('input-ai-prompt');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute(
      'placeholder',
      "Pedile a la IA: 'Crear 4 tareas para lanzamiento', 'Resumir este tablero'...",
    );

    // Chips de sugerencias rápidas
    expect(screen.getByTestId('chip-ai-generate-tasks')).toHaveTextContent(
      'Crear tareas de lanzamiento',
    );
    expect(screen.getByTestId('chip-ai-summarize-board')).toHaveTextContent(
      'Resumir estado y presupuesto',
    );
    expect(screen.getByTestId('chip-ai-breakdown-checklist')).toHaveTextContent(
      'Dividir en checklist de entregables',
    );

    // Cerrar panel con la X
    fireEvent.click(screen.getByTestId('btn-close-ai-panel'));
    expect(screen.queryByTestId('ai-assistant-panel')).not.toBeInTheDocument();
  });

  it('3. Envía prompt para crear tareas y refresca el tablero en vivo con las nuevas tareas generadas', async () => {
    render(<App />);

    expect(await screen.findByTestId('active-board-title')).toHaveTextContent(
      'Roadmap de Producto Q4',
    );

    // Inicialmente solo está la tarea base
    expect(
      screen.getByText('Configurar infraestructura base'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Diseñar wireframes de alta fidelidad'),
    ).not.toBeInTheDocument();

    // Abrir panel
    fireEvent.click(screen.getByTestId('btn-ai-assistant-pill'));
    await screen.findByTestId('ai-assistant-panel');

    // Clic en sugerencia "Crear tareas de lanzamiento"
    fireEvent.click(screen.getByTestId('chip-ai-generate-tasks'));

    // Esperar mensaje de respuesta de la IA
    const responseMsg = await screen.findByTestId('ai-response-message');
    expect(responseMsg).toHaveTextContent(
      'Se generaron 2 nuevas tareas para el lanzamiento',
    );
    expect(responseMsg).toHaveTextContent('+2 tareas');

    // Verificar que el tablero se haya refrescado automáticamente con las nuevas tareas
    await waitFor(() => {
      expect(
        screen.getByText('Diseñar wireframes de alta fidelidad'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Definir arquitectura de microservicios'),
      ).toBeInTheDocument();
    });
  });

  it('4. Despliega el resumen ejecutivo en una tarjeta con opción para copiar al solicitar summarize_board', async () => {
    render(<App />);

    expect(await screen.findByTestId('active-board-title')).toHaveTextContent(
      'Roadmap de Producto Q4',
    );

    fireEvent.click(screen.getByTestId('btn-ai-assistant-pill'));
    await screen.findByTestId('ai-assistant-panel');

    // Clic en chip de resumen de tablero
    fireEvent.click(screen.getByTestId('chip-ai-summarize-board'));

    // Verificar tarjeta de resumen ejecutivo
    const summaryCard = await screen.findByTestId('ai-summary-card');
    expect(summaryCard).toBeInTheDocument();
    expect(summaryCard).toHaveTextContent(/Resumen Ejecutivo del Tablero/i);
    expect(summaryCard).toHaveTextContent(
      /El tablero Roadmap de Producto Q4 cuenta con 3 tareas activas/i,
    );

    // Botón de copiar
    const copyBtn = screen.getByTestId('btn-copy-summary');
    expect(copyBtn).toHaveTextContent('Copiar');
    fireEvent.click(copyBtn);
    expect(await screen.findByText('¡Copiado!')).toBeInTheDocument();
  });
});
