import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { setAccessToken } from '../services/api';
import { MONDAY_COLOR_PALETTE } from '../types';
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
    name: 'Tablero Monday Status Picker',
    description: 'Tablero de prueba para Status Picker y paleta de 40 colores',
    created_at: '2026-10-19T12:00:00Z',
    statuses: DEFAULT_STATUSES.map((s) => ({ ...s })),
    groups: [
      {
        id: 10,
        board_id: 1,
        title: 'Sprint 2 Tasks',
        color: '#579bfc',
        position: 0,
        collapsed: false,
        items: [
          {
            id: 101,
            group_id: 10,
            board_id: 1,
            title: 'Implementar Status Picker Custom',
            status_key: 'working',
            priority: 'high',
            assignee_id: 1,
            assignee: MOCK_USERS[0],
            start_date: '2026-10-20',
            due_date: '2026-10-25',
            estimated_hours: 8,
            budget: 450,
            notes: 'Píldoras 32px y paleta de 40 colores',
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

describe('StatusPickerAndLabels — Sprint 2: Status Picker Custom y Paleta de 40 Colores', () => {
  let currentBoard: BoardDetailRead;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setAccessToken('jwt_valid_status_picker_token');
    currentBoard = createMockBoard();

    const workspaces: WorkspaceRead[] = [
      {
        id: 1,
        name: 'Workspace Principal',
        description: 'Espacio de trabajo central',
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

      // PATCH /api/items/101
      if (url.match(/\/api\/items\/\d+$/) && method === 'PATCH') {
        const itemId = Number(url.split('/').pop());
        const body = JSON.parse(String(init?.body));
        const item = currentBoard.groups[0].items.find((i) => i.id === itemId);
        if (item) {
          Object.assign(item, body);
          return createJsonResponse({ ...item });
        }
        return createJsonResponse({ id: itemId, ...body });
      }

      // PATCH /api/boards/1/statuses/:statusId
      if (url.match(/\/api\/boards\/\d+\/statuses\/\d+$/) && method === 'PATCH') {
        const parts = url.split('/');
        const statusId = Number(parts.pop());
        const body = JSON.parse(String(init?.body));
        const st = currentBoard.statuses.find((s) => s.id === statusId);
        if (st) {
          if (body.label !== undefined) st.label = body.label;
          if (body.color !== undefined) st.color = body.color;
          return createJsonResponse({ ...st });
        }
        return createJsonResponse({ id: statusId, board_id: 1, ...body });
      }

      return createJsonResponse({ detail: `Unhandled ${method} ${url}` }, 404);
    });

    vi.stubGlobal('fetch', fetchMock);
  });

  it('1. Al hacer clic en la píldora de estado despliega el popover con las opciones del tablero y botón "Editar etiquetas"', async () => {
    render(<App />);

    expect(await screen.findByTestId('active-board-title')).toBeInTheDocument();

    const statusBadge = screen.getByTestId('task-status-badge-101');
    expect(statusBadge).toBeInTheDocument();
    expect(statusBadge).toHaveTextContent('En Proceso');

    // Inicialmente el dropdown no debe estar abierto
    expect(screen.queryByTestId('status-option-done')).not.toBeInTheDocument();
    expect(screen.queryByTestId('edit-labels-button')).not.toBeInTheDocument();

    // Clic en la píldora para abrir el StatusPickerDropdown flotante
    fireEvent.click(statusBadge);

    // Verificar que se renderizan las opciones de estado y el botón inferior
    expect(screen.getByTestId('status-option-done')).toHaveTextContent('Listo');
    expect(screen.getByTestId('status-option-working')).toHaveTextContent('En Proceso');
    expect(screen.getByTestId('status-option-blocked')).toHaveTextContent('Bloqueado');
    expect(screen.getByTestId('status-option-transferred')).toHaveTextContent('Traspasado');
    expect(screen.getByTestId('status-option-not_started')).toHaveTextContent('Sin Empezar');
    expect(screen.getByTestId('edit-labels-button')).toBeInTheDocument();
  });

  it('2. Seleccionar una opción diferente en el popover dispara la actualización y actualiza la píldora optimísticamente', async () => {
    render(<App />);

    await screen.findByTestId('active-board-title');

    const statusBadge = screen.getByTestId('task-status-badge-101');
    expect(statusBadge).toHaveTextContent('En Proceso');

    // Abrir popover
    fireEvent.click(statusBadge);

    // Seleccionar 'Listo' (done)
    const optionDone = screen.getByTestId('status-option-done');
    fireEvent.click(optionDone);

    // Verificar llamada PATCH al backend
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/items\/101$/),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status_key: 'done' }),
        }),
      );
    });

    // Verificar que la píldora se actualizó a 'Listo'
    await waitFor(() => {
      expect(screen.getByTestId('task-status-badge-101')).toHaveTextContent('Listo');
    });

    // El popover debe haberse cerrado tras la selección
    expect(screen.queryByTestId('status-option-done')).not.toBeInTheDocument();
  });

  it('3. El botón "Editar etiquetas" abre el gestor de estados con la paleta de 40 colores completa y permite modificarla', async () => {
    // Verificar que la paleta MONDAY_COLOR_PALETTE contenga exactamente 40 colores
    expect(MONDAY_COLOR_PALETTE).toHaveLength(40);

    render(<App />);

    await screen.findByTestId('active-board-title');

    // Abrir popover de estado
    fireEvent.click(screen.getByTestId('task-status-badge-101'));

    // Clic en "Editar etiquetas"
    const editLabelsBtn = screen.getByTestId('edit-labels-button');
    expect(editLabelsBtn).toBeInTheDocument();
    fireEvent.click(editLabelsBtn);

    // Verificar que el modal de personalización de estados esté en el DOM
    expect(await screen.findByTestId('status-manager-modal')).toBeInTheDocument();

    // Abrir el selector de 40 colores del estado 'working'
    const swatchWorking = screen.getByTestId('status-color-swatch-working');
    expect(swatchWorking).toBeInTheDocument();
    fireEvent.click(swatchWorking);

    // Verificar que la paleta de 40 colores esté disponible en el modal
    expect(screen.getByTestId('palette-color-037f4c')).toBeInTheDocument(); // grass_green
    expect(screen.getByTestId('palette-color-00c875')).toBeInTheDocument(); // done_green
    expect(screen.getByTestId('palette-color-ffcb00')).toBeInTheDocument(); // egg_yolk
    expect(screen.getByTestId('palette-color-333333')).toBeInTheDocument(); // charcoal

    // Cambiar color haciendo clic en el swatch de la paleta: #0073ea (monday_blue)
    const mondayBlueColorBtn = screen.getByTestId('palette-color-0073ea');
    fireEvent.click(mondayBlueColorBtn);

    // Modificar también la etiqueta a "En Desarrollo"
    const labelInput = screen.getByTestId('status-label-input-working');
    fireEvent.change(labelInput, { target: { value: 'En Desarrollo' } });

    // Guardar cambios del estado
    fireEvent.click(screen.getByTestId('btn-save-status-working'));

    // Verificar que se invocó la API PATCH /api/boards/1/statuses/2
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/boards\/1\/statuses\/2$/),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            label: 'En Desarrollo',
            color: '#0073ea',
          }),
        }),
      );
    });
  });
});
