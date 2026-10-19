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
  TaskChecklistItemRead,
  TaskCommentRead,
  TaskGroupRead,
  TaskItemDetailRead,
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

function createInitialBoard(): BoardDetailRead {
  return {
    id: 1,
    workspace_id: 1,
    name: 'Roadmap de Producto Q4',
    description: 'Tablero principal para pruebas de Kanban, Filtros y Drawer.',
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
            due_date: '2026-11-15',
            notes: 'OAuth2 + JWT firmado',
            position: 0,
            comments_count: 1,
            checklist_total: 2,
            checklist_completed: 1,
            created_at: '2026-10-19T12:00:00Z',
            updated_at: '2026-10-19T12:00:00Z',
          },
          {
            id: 101,
            group_id: 10,
            board_id: 1,
            title: 'Diseñar vista Kanban interactiva',
            status_key: 'not_started',
            priority: 'high',
            assignee_id: 2,
            assignee: MOCK_USERS[1],
            due_date: '2026-11-20',
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
            status_key: 'done',
            priority: 'low',
            assignee_id: null,
            assignee: null,
            due_date: null,
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
  } as Response;
}

describe('KanbanFilterDrawer — Sprint 3B: Vista Kanban Drag & Drop, Filtros en Vivo e ItemDetailDrawer', () => {
  let currentBoard: BoardDetailRead;
  let item100Detail: TaskItemDetailRead;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setAccessToken('jwt_valid_sprint3b_token');
    currentBoard = createInitialBoard();

    item100Detail = {
      ...currentBoard.groups[0].items[0],
      comments: [
        {
          id: 501,
          item_id: 100,
          author_id: 1,
          author: MOCK_USERS[0],
          content: 'Ya quedaron configurados los endpoints OAuth2 en backend.',
          created_at: '2026-10-19T13:00:00Z',
        },
      ],
      checklist_items: [
        {
          id: 601,
          item_id: 100,
          title: 'Validar callback de Google',
          is_completed: true,
          position: 0,
          created_at: '2026-10-19T12:30:00Z',
        },
        {
          id: 602,
          item_id: 100,
          title: 'Validar callback de Microsoft',
          is_completed: false,
          position: 1,
          created_at: '2026-10-19T12:35:00Z',
        },
      ],
      activities: [
        {
          id: 701,
          item_id: 100,
          user_id: 1,
          user: MOCK_USERS[0],
          action: 'created',
          description:
            "Creó la tarea 'Implementar autenticación SSO con Google y Microsoft'",
          created_at: '2026-10-19T12:00:00Z',
        },
      ],
    };

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

      // Crear Tarea (POST /api/groups/:groupId/items)
      if (url.match(/\/api\/groups\/\d+\/items$/) && method === 'POST') {
        const groupId = Number(url.split('/')[3]);
        const body = JSON.parse(String(init?.body));
        const grp = currentBoard.groups.find(
          (g: TaskGroupRead) => g.id === groupId,
        )!;
        const createdItem: TaskItemRead = {
          id: 350,
          group_id: groupId,
          board_id: 1,
          title: body.title,
          status_key: body.status_key || 'not_started',
          priority: body.priority || 'medium',
          assignee_id: body.assignee_id ?? null,
          assignee: null,
          due_date: body.due_date ?? null,
          notes: body.notes || '',
          position: grp.items.length,
          comments_count: 0,
          checklist_total: 0,
          checklist_completed: 0,
          created_at: '2026-10-19T16:00:00Z',
          updated_at: '2026-10-19T16:00:00Z',
        };
        grp.items.push(createdItem);
        return createJsonResponse(createdItem, 201);
      }

      // Actualizar Tarea (PATCH /api/items/:itemId)
      if (url.match(/\/api\/items\/\d+$/) && method === 'PATCH') {
        const itemId = Number(url.split('/').pop());
        const body = JSON.parse(String(init?.body));
        let found: TaskItemRead | null = null;
        for (const grp of currentBoard.groups) {
          const item = grp.items.find((i) => i.id === itemId);
          if (item) {
            if (body.status_key !== undefined) item.status_key = body.status_key;
            if (body.title !== undefined) item.title = body.title;
            if (body.priority !== undefined) item.priority = body.priority;
            found = { ...item };
            break;
          }
        }
        return createJsonResponse(found);
      }

      // Detalle de Tarea (GET /api/items/:itemId/detail)
      if (url.match(/\/api\/items\/\d+\/detail$/) && method === 'GET') {
        return createJsonResponse(item100Detail);
      }

      // Crear Comentario (POST /api/items/:itemId/comments)
      if (url.match(/\/api\/items\/\d+\/comments$/) && method === 'POST') {
        const body = JSON.parse(String(init?.body));
        const newComment: TaskCommentRead = {
          id: 502,
          item_id: 100,
          author_id: 1,
          author: MOCK_USERS[0],
          content: body.content,
          created_at: '2026-10-19T16:10:00Z',
        };
        item100Detail = {
          ...item100Detail,
          comments: [newComment, ...item100Detail.comments],
          comments_count: (item100Detail.comments_count ?? 0) + 1,
        };
        return createJsonResponse(newComment, 201);
      }

      // Eliminar Comentario (DELETE /api/comments/:commentId)
      if (url.match(/\/api\/comments\/\d+$/) && method === 'DELETE') {
        const commentId = Number(url.split('/').pop());
        item100Detail = {
          ...item100Detail,
          comments: item100Detail.comments.filter((c) => c.id !== commentId),
        };
        return createJsonResponse({ deleted: true, id: commentId });
      }

      // Crear Ítem de Checklist (POST /api/items/:itemId/checklist)
      if (url.match(/\/api\/items\/\d+\/checklist$/) && method === 'POST') {
        const body = JSON.parse(String(init?.body));
        const newChk: TaskChecklistItemRead = {
          id: 603,
          item_id: 100,
          title: body.title,
          is_completed: Boolean(body.is_completed),
          position: item100Detail.checklist_items.length,
          created_at: '2026-10-19T16:15:00Z',
        };
        item100Detail = {
          ...item100Detail,
          checklist_items: [...item100Detail.checklist_items, newChk],
        };
        return createJsonResponse(newChk, 201);
      }

      // Actualizar Ítem de Checklist (PATCH /api/checklist/:checklistId)
      if (url.match(/\/api\/checklist\/\d+$/) && method === 'PATCH') {
        const chkId = Number(url.split('/').pop());
        const body = JSON.parse(String(init?.body));
        let updatedChk: TaskChecklistItemRead | null = null;
        item100Detail = {
          ...item100Detail,
          checklist_items: item100Detail.checklist_items.map((c) => {
            if (c.id === chkId) {
              updatedChk = {
                ...c,
                title: body.title ?? c.title,
                is_completed:
                  body.is_completed !== undefined
                    ? body.is_completed
                    : c.is_completed,
              };
              return updatedChk;
            }
            return c;
          }),
        };
        return createJsonResponse(updatedChk);
      }

      // Eliminar Ítem de Checklist (DELETE /api/checklist/:checklistId)
      if (url.match(/\/api\/checklist\/\d+$/) && method === 'DELETE') {
        const chkId = Number(url.split('/').pop());
        item100Detail = {
          ...item100Detail,
          checklist_items: item100Detail.checklist_items.filter(
            (c) => c.id !== chkId,
          ),
        };
        return createJsonResponse({ deleted: true, id: chkId });
      }

      return createJsonResponse({});
    });

    vi.stubGlobal('fetch', fetchMock);
  });

  it('1. Conmutador de Vistas y Vista Kanban: alterna a Kanban, arrastra tarjeta entre columnas (Drag & Drop con Optimistic Update) y crea tarjeta rápida', async () => {
    render(<App />);

    expect(await screen.findByTestId('active-board-title')).toHaveTextContent(
      'Roadmap de Producto Q4',
    );

    // Cambiar a Vista Kanban
    fireEvent.click(screen.getByTestId('btn-view-kanban'));

    expect(await screen.findByTestId('kanban-board-view')).toBeInTheDocument();

    // Verificar columnas por cada estado del tablero
    const colDone = screen.getByTestId('kanban-column-done');
    const colInProgress = screen.getByTestId('kanban-column-in_progress');
    const colBlocked = screen.getByTestId('kanban-column-blocked');
    const colNotStarted = screen.getByTestId('kanban-column-not_started');

    expect(
      within(colInProgress).getByTestId('kanban-card-100'),
    ).toBeInTheDocument();
    expect(
      within(colNotStarted).getByTestId('kanban-card-101'),
    ).toBeInTheDocument();
    expect(within(colDone).getByTestId('kanban-card-102')).toBeInTheDocument();

    // Drag & Drop: arrastrar tarjeta 100 desde "En Proceso" hacia columna "Listo"
    const card100 = screen.getByTestId('kanban-card-100');
    fireEvent.dragStart(card100);
    fireEvent.dragOver(colDone);
    fireEvent.drop(colDone);

    // Optimistic update: la tarjeta 100 pasa a la columna "Listo"
    await waitFor(() => {
      expect(
        within(colDone).getByTestId('kanban-card-100'),
      ).toBeInTheDocument();
    });
    expect(screen.getByTestId('kanban-column-count-done')).toHaveTextContent(
      '2',
    );

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/items/100',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status_key: 'done' }),
      }),
    );

    // Creación rápida de tarjeta en la columna "Bloqueado"
    fireEvent.change(screen.getByTestId('kanban-quick-add-input-blocked'), {
      target: { value: 'Resolver bloqueo de credenciales Azure' },
    });
    fireEvent.click(screen.getByTestId('kanban-quick-add-submit-blocked'));

    expect(
      await within(colBlocked).findByText(
        'Resolver bloqueo de credenciales Azure',
      ),
    ).toBeInTheDocument();

    // Al volver a la Vista Tabla Principal, la tarea 100 conserva el estado "Listo"
    fireEvent.click(screen.getByTestId('btn-view-table'));
    expect(await screen.findByTestId('task-status-badge-100')).toHaveTextContent(
      'Listo',
    );
  });

  it('2. Barra de Búsqueda y Filtros en Vivo: filtra tareas por texto, persona, estado y prioridad tanto en Tabla como en Kanban', async () => {
    render(<App />);

    expect(await screen.findByTestId('active-board-title')).toHaveTextContent(
      'Roadmap de Producto Q4',
    );

    // Inicialmente están las 3 tareas visibles
    expect(screen.getByTestId('task-row-100')).toBeInTheDocument();
    expect(screen.getByTestId('task-row-101')).toBeInTheDocument();
    expect(screen.getByTestId('task-row-102')).toBeInTheDocument();

    // 2.1 Filtrar por texto de búsqueda ("Kanban")
    fireEvent.change(screen.getByTestId('board-search-input'), {
      target: { value: 'Kanban' },
    });

    expect(screen.queryByTestId('task-row-100')).not.toBeInTheDocument();
    expect(screen.getByTestId('task-row-101')).toBeInTheDocument();
    expect(screen.queryByTestId('task-row-102')).not.toBeInTheDocument();

    // Limpiar filtros con el botón "Limpiar filtros"
    fireEvent.click(screen.getByTestId('btn-clear-filters'));
    expect(screen.getByTestId('task-row-100')).toBeInTheDocument();
    expect(screen.getByTestId('task-row-102')).toBeInTheDocument();

    // 2.2 Filtrar por Responsable = "unassigned" (Sin asignar -> solo tarea 102)
    fireEvent.change(screen.getByTestId('board-filter-assignee'), {
      target: { value: 'unassigned' },
    });
    expect(screen.queryByTestId('task-row-100')).not.toBeInTheDocument();
    expect(screen.queryByTestId('task-row-101')).not.toBeInTheDocument();
    expect(screen.getByTestId('task-row-102')).toBeInTheDocument();

    // 2.3 Cambiar a Vista Kanban con el filtro activo: solo debe verse la tarjeta 102
    fireEvent.click(screen.getByTestId('btn-view-kanban'));
    expect(await screen.findByTestId('kanban-card-102')).toBeInTheDocument();
    expect(screen.queryByTestId('kanban-card-100')).not.toBeInTheDocument();

    // Limpiar filtros y probar filtro por Prioridad = "critical" (solo tarea 100)
    fireEvent.click(screen.getByTestId('btn-clear-filters'));
    fireEvent.change(screen.getByTestId('board-filter-priority'), {
      target: { value: 'critical' },
    });
    expect(screen.getByTestId('kanban-card-100')).toBeInTheDocument();
    expect(screen.queryByTestId('kanban-card-101')).not.toBeInTheDocument();
    expect(screen.queryByTestId('kanban-card-102')).not.toBeInTheDocument();
  });

  it('3. ItemDetailDrawer: abre el panel lateral, muestra actividad y sincroniza en vivo Checklist y Comentarios con la fila del tablero', async () => {
    render(<App />);

    expect(await screen.findByTestId('active-board-title')).toHaveTextContent(
      'Roadmap de Producto Q4',
    );

    // Verificar contadores iniciales en la fila de la tarea 100
    expect(screen.getByTestId('task-comments-count-100')).toHaveTextContent('1');
    expect(screen.getByTestId('task-checklist-badge-100')).toHaveTextContent(
      '1/2',
    );

    // Abrir el panel lateral de la tarea 100
    fireEvent.click(screen.getByTestId('btn-open-drawer-100'));

    const drawer = await screen.findByTestId('item-detail-drawer');
    expect(within(drawer).getByTestId('drawer-item-title')).toHaveTextContent(
      'Implementar autenticación SSO con Google y Microsoft',
    );

    // Verificar progreso inicial del checklist (1/2 = 50%) e historial de actividad
    expect(
      within(drawer).getByTestId('drawer-checklist-progress'),
    ).toHaveTextContent('1/2 (50%)');
    expect(
      within(drawer).getByTestId('drawer-activity-list'),
    ).toHaveTextContent(
      "Creó la tarea 'Implementar autenticación SSO con Google y Microsoft'",
    );

    // 3.1 Agregar un nuevo ítem al checklist
    fireEvent.change(within(drawer).getByTestId('drawer-checklist-input'), {
      target: { value: 'Probar expiración del token JWT' },
    });
    fireEvent.click(within(drawer).getByTestId('btn-add-checklist'));

    await waitFor(() => {
      expect(
        within(drawer).getByTestId('drawer-checklist-progress'),
      ).toHaveTextContent('1/3 (33%)');
    });
    expect(screen.getByTestId('task-checklist-badge-100')).toHaveTextContent(
      '1/3',
    );

    // 3.2 Marcar el ítem 602 como completado
    fireEvent.click(within(drawer).getByTestId('checklist-toggle-602'));

    await waitFor(() => {
      expect(
        within(drawer).getByTestId('drawer-checklist-progress'),
      ).toHaveTextContent('2/3 (67%)');
    });
    expect(screen.getByTestId('task-checklist-badge-100')).toHaveTextContent(
      '2/3',
    );

    // 3.3 Eliminar el ítem 603 recién creado
    fireEvent.click(within(drawer).getByTestId('btn-delete-checklist-603'));

    await waitFor(() => {
      expect(
        within(drawer).getByTestId('drawer-checklist-progress'),
      ).toHaveTextContent('2/2 (100%)');
    });
    expect(screen.getByTestId('task-checklist-badge-100')).toHaveTextContent(
      '2/2',
    );

    // 3.4 Publicar un nuevo comentario
    fireEvent.change(within(drawer).getByTestId('drawer-comment-input'), {
      target: { value: 'Pruebas de integración OAuth finalizadas con éxito.' },
    });
    fireEvent.click(within(drawer).getByTestId('btn-add-comment'));

    expect(
      await within(drawer).findByText(
        'Pruebas de integración OAuth finalizadas con éxito.',
      ),
    ).toBeInTheDocument();

    // El contador de comentarios en la fila de la tabla sube a 2
    expect(screen.getByTestId('task-comments-count-100')).toHaveTextContent('2');

    // 3.5 Eliminar el comentario 502
    fireEvent.click(within(drawer).getByTestId('btn-delete-comment-502'));

    await waitFor(() => {
      expect(screen.getByTestId('task-comments-count-100')).toHaveTextContent(
        '1',
      );
    });

    // Cerrar el drawer
    fireEvent.click(within(drawer).getByTestId('btn-close-item-drawer'));
    expect(screen.queryByTestId('item-detail-drawer')).not.toBeInTheDocument();
  });
});

