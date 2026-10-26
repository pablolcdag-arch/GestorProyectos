import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';
import { setAccessToken } from '../services/api';
import type {
  BoardDetailRead,
  BoardStatusRead,
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
    name: 'Tablero Pixel Perfect',
    description: 'Tablero con design tokens Monday.com',
    created_at: '2026-10-19T12:00:00Z',
    statuses: DEFAULT_STATUSES,
    groups: [
      {
        id: 10,
        board_id: 1,
        title: 'Grupo Primario',
        color: '#579bfc',
        position: 0,
        collapsed: false,
        items: [
          {
            id: 101,
            group_id: 10,
            board_id: 1,
            title: 'Tarea Pixel Perfect 101',
            status_key: 'working',
            priority: 'high',
            assignee_id: 1,
            assignee: MOCK_USERS[0],
            start_date: '2026-10-01',
            due_date: '2026-10-15',
            estimated_hours: 8,
            budget: 800,
            notes: 'Notas de diseño',
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
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response;
}

describe('PixelPerfectDesignTokens — Sprint 1: Tokens de Diseño, Figtree y Celdas 1:1 Monday.com', () => {
  let currentBoard: BoardDetailRead;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setAccessToken('jwt_valid_design_tokens');
    currentBoard = createMockBoard();

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

    fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url.endsWith('/api/auth/me')) {
        return createJsonResponse(MOCK_USERS[0]);
      }
      if (url.endsWith('/api/auth/providers')) {
        return createJsonResponse([]);
      }
      if (url.endsWith('/api/users')) {
        return createJsonResponse(MOCK_USERS);
      }
      if (url.endsWith('/api/workspaces')) {
        return createJsonResponse(workspaces);
      }
      if (url.endsWith('/api/boards/1')) {
        return createJsonResponse(currentBoard);
      }
      if (url.endsWith('/api/boards/1/automations')) {
        return createJsonResponse([]);
      }

      return createJsonResponse({});
    });

    vi.stubGlobal('fetch', fetchMock);
  });

  it('1. Tipografía Figtree está aplicada en el contenedor del tablero', async () => {
    render(<App />);

    const boardTitle = await screen.findByTestId('active-board-title');
    expect(boardTitle).toBeInTheDocument();

    const boardContainer = screen.getByTestId('board-main-container');
    expect(boardContainer).toBeInTheDocument();
    expect(boardContainer.className).toMatch(/Figtree/i);
    expect(boardContainer.className).toContain('font-sans');
  });

  it('2. Geometría y bordes de celdas: altura h-9 (36px), bordes #d0d4e4 y hover #f6f7fb', async () => {
    render(<App />);

    const row = await screen.findByTestId('task-row-101');
    expect(row).toBeInTheDocument();

    // Verificación de altura 36px y hover Monday.com en la fila
    expect(row.className).toContain('h-9');
    expect(row.className).toContain('min-h-[36px]');
    expect(row.className).toContain('max-h-[36px]');
    expect(row.className).toContain('hover:bg-[#f6f7fb]');
    expect(row.className).toContain('border-[#d0d4e4]');

    // Verificación de celdas internas
    const cells = row.querySelectorAll('td');
    expect(cells.length).toBeGreaterThanOrEqual(8);

    cells.forEach((cell) => {
      expect(cell.className).toContain('border-[#d0d4e4]');
      expect(cell.className).toContain('h-9');
      expect(cell.className).toContain('min-h-[36px]');
      expect(cell.className).toContain('max-h-[36px]');
    });
  });

  it('3. Anchos de columna específicos y borde de acento de 4px en el grupo', async () => {
    render(<App />);

    const row = await screen.findByTestId('task-row-101');
    const cells = row.querySelectorAll('td');

    // Columna 0: Checkbox (w-10 min-w-[40px] max-w-[40px])
    expect(cells[0].className).toContain('w-10');
    expect(cells[0].className).toContain('min-w-[40px]');
    expect(cells[0].className).toContain('max-w-[40px]');

    // Columna 1: Tarea Sticky (w-[331px] min-w-[331px])
    expect(cells[1].className).toContain('w-[331px]');
    expect(cells[1].className).toContain('min-w-[331px]');
    expect(cells[1].className).toContain('sticky');

    // Columna 2: Responsable (w-[98px] min-w-[98px])
    expect(cells[2].className).toContain('w-[98px]');
    expect(cells[2].className).toContain('min-w-[98px]');

    // Columna 3: Estado (w-[134px] min-w-[134px])
    expect(cells[3].className).toContain('w-[134px]');
    expect(cells[3].className).toContain('min-w-[134px]');

    // Columna 4: Prioridad (w-[140px] min-w-[140px])
    expect(cells[4].className).toContain('w-[140px]');
    expect(cells[4].className).toContain('min-w-[140px]');

    // Columna 5: Fecha límite (w-[140px] min-w-[140px])
    expect(cells[5].className).toContain('w-[140px]');
    expect(cells[5].className).toContain('min-w-[140px]');

    // Borde de acento de grupo: contenedor con 4px solid group.color
    const groupSection = screen.getByTestId('task-group-10');
    const tableContainer = groupSection.querySelector('div.rounded-xl');
    expect(tableContainer).toBeInTheDocument();
    expect(tableContainer?.className).toContain('border-[#d0d4e4]');
    expect(tableContainer).toHaveStyle({
      borderLeftWidth: '4px',
      borderLeftColor: '#579bfc',
    });
  });
});
