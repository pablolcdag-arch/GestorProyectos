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
  TaskCommentRead,
  TaskChecklistItemRead,
  TaskItemDetailRead,
  UserRead,
  WorkspaceRead,
} from '../types';

const MOCK_USERS: UserRead[] = [
  {
    id: 1,
    email: 'sofia@gestor.dev',
    full_name: 'Sofía Martínez',
    avatar_url: null,
    color: '#0073ea',
    auth_provider: 'google',
    provider_subject_id: 'google:sofia@gestor.dev',
    role: 'admin',
    is_active: true,
    created_at: '2026-10-19T12:00:00Z',
  },
  {
    id: 2,
    email: 'martin@gestor.dev',
    full_name: 'Martín Gómez',
    avatar_url: null,
    color: '#00c875',
    auth_provider: 'microsoft',
    provider_subject_id: 'ms:martin@gestor.dev',
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
    key: 'stuck',
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
    name: 'Tablero de Lanzamiento',
    description: 'Tablero de prueba sprint 7',
    created_at: '2026-10-19T12:00:00Z',
    statuses: DEFAULT_FIVE_STATUSES,
    groups: [
      {
        id: 10,
        board_id: 1,
        title: 'Fase 1: Preparación',
        color: '#579bfc',
        position: 0,
        collapsed: false,
        items: [
          {
            id: 201,
            group_id: 10,
            board_id: 1,
            title: 'Diseñar arquitectura del Item Drawer',
            status_key: 'in_progress',
            priority: 'high',
            assignee_id: 1,
            assignee: MOCK_USERS[0],
            start_date: '2026-10-20',
            due_date: '2026-10-28',
            estimated_hours: 12,
            budget: 1500,
            notes: 'Ver especificación de 668px y WYSIWYG',
            position: 0,
            comments_count: 1,
            checklist_total: 2,
            checklist_completed: 1,
            created_at: '2026-10-20T10:00:00Z',
            updated_at: '2026-10-20T10:00:00Z',
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

describe('ItemDetailDrawerWysiwyg — Sprint 7: Panel Lateral 668px, WYSIWYG y Registro de Actividad', () => {
  let currentBoard: BoardDetailRead;
  let item201Detail: TaskItemDetailRead;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setAccessToken('jwt_sprint7_token');
    currentBoard = createInitialBoard();

    item201Detail = {
      ...currentBoard.groups[0].items[0],
      comments: [
        {
          id: 801,
          item_id: 201,
          author_id: 1,
          author: MOCK_USERS[0],
          content: 'Iniciando el diseño del Drawer con ancho 668px según Monday.',
          created_at: '2026-10-20T11:00:00Z',
        },
      ],
      checklist_items: [
        {
          id: 901,
          item_id: 201,
          title: 'Configurar contenedor 668px y sombra suave',
          is_completed: true,
          position: 0,
          created_at: '2026-10-20T10:30:00Z',
        },
        {
          id: 902,
          item_id: 201,
          title: 'Implementar barra de herramientas WYSIWYG',
          is_completed: false,
          position: 1,
          created_at: '2026-10-20T10:35:00Z',
        },
      ],
      activities: [
        {
          id: 1001,
          item_id: 201,
          user_id: 1,
          user: MOCK_USERS[0],
          action: 'created',
          description:
            "Creó la tarea 'Diseñar arquitectura del Item Drawer'",
          created_at: '2026-10-20T10:00:00Z',
        },
      ],
    };

    const workspaces: WorkspaceRead[] = [
      {
        id: 1,
        name: 'Espacio de Trabajo Principal',
        description: 'Espacio Sprint 7',
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
      // Detalle del ítem 201
      if (url.includes('/api/items/201/comments') && method === 'POST') {
        const body = JSON.parse(String(init?.body || '{}'));
        const newComment: TaskCommentRead = {
          id: 802,
          item_id: 201,
          author_id: 1,
          author: MOCK_USERS[0],
          content: body.content,
          created_at: new Date().toISOString(),
        };
        item201Detail = {
          ...item201Detail,
          comments: [newComment, ...item201Detail.comments],
        };
        return Promise.resolve(createJsonResponse(newComment, 201));
      }
      if (url.includes('/api/items/201/checklist') && method === 'POST') {
        const body = JSON.parse(String(init?.body || '{}'));
        const newChk: TaskChecklistItemRead = {
          id: 903,
          item_id: 201,
          title: body.title,
          is_completed: false,
          position: item201Detail.checklist_items.length,
          created_at: new Date().toISOString(),
        };
        item201Detail.checklist_items.push(newChk);
        return Promise.resolve(createJsonResponse(newChk, 201));
      }
      if (url.includes('/api/items/201') && method === 'GET') {
        return Promise.resolve(createJsonResponse(item201Detail));
      }
      if (url.includes('/api/items/201') && method === 'PATCH') {
        const body = JSON.parse(String(init?.body || '{}'));
        item201Detail = { ...item201Detail, ...body };
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

  it('1. Dimensiones 1:1 Monday: abre el drawer con ancho exacto w-[668px], sombra suave y cabecera completa', async () => {
    render(<App />);

    expect(await screen.findByTestId('active-board-title')).toHaveTextContent(
      'Tablero de Lanzamiento',
    );

    // Abrir drawer desde la fila
    const openBtn = screen.getByTestId('btn-open-drawer-201');
    fireEvent.click(openBtn);

    const drawer = await screen.findByTestId('item-detail-drawer');
    expect(drawer).toBeInTheDocument();

    // Validar contenedor con ancho 668px y sombra específica de Monday.com
    const container = screen.getByTestId('drawer-container');
    expect(container).toHaveClass('w-[668px]');
    expect(container).toHaveClass('shadow-[-8px_0_30px_rgba(0,0,0,0.15)]');

    // Validar título grande 24px (text-2xl font-bold text-[#323338])
    const titleEl = within(drawer).getByTestId('drawer-item-title');
    expect(titleEl).toHaveTextContent('Diseñar arquitectura del Item Drawer');
    expect(titleEl).toHaveClass('text-2xl');
    expect(titleEl).toHaveClass('font-bold');

    // Validar botón de cierre
    const closeBtn = within(drawer).getByTestId('btn-close-drawer');
    expect(closeBtn).toBeInTheDocument();
  });

  it('2. Navegación por Pestañas Estilo Monday: alterna entre Actualizaciones, Actividad y Checklist con indicador activo azul', async () => {
    render(<App />);
    expect(await screen.findByTestId('active-board-title')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('btn-open-drawer-201'));
    const drawer = await screen.findByTestId('item-detail-drawer');

    // Por defecto inicia en la pestaña Actualizaciones con indicador activo azul
    const tabUpdates = within(drawer).getByTestId('drawer-tab-updates');
    const tabActivity = within(drawer).getByTestId('drawer-tab-activity');
    const tabChecklist = within(drawer).getByTestId('drawer-tab-checklist');

    expect(tabUpdates).toHaveClass('border-[#0073ea]');
    expect(tabUpdates).toHaveClass('text-[#0073ea]');

    // Cambiar a la pestaña de Actividad
    fireEvent.click(tabActivity);
    expect(tabActivity).toHaveClass('border-[#0073ea]');
    expect(tabActivity).toHaveClass('text-[#0073ea]');
    expect(within(drawer).getByTestId('drawer-activity-list')).toBeInTheDocument();
    expect(within(drawer).getByTestId('drawer-activity-list')).toHaveTextContent(
      "Creó la tarea 'Diseñar arquitectura del Item Drawer'",
    );

    // Cambiar a la pestaña de Checklist
    fireEvent.click(tabChecklist);
    expect(tabChecklist).toHaveClass('border-[#0073ea]');
    expect(tabChecklist).toHaveClass('text-[#0073ea]');
    expect(within(drawer).getByTestId('drawer-checklist-progress')).toHaveTextContent(
      '1/2 (50%)',
    );

    // Volver a Actualizaciones
    fireEvent.click(tabUpdates);
    expect(tabUpdates).toHaveClass('border-[#0073ea]');
  });

  it('3. Editor WYSIWYG Expandible: expande barra de herramientas, formatea texto y publica nueva actualización', async () => {
    render(<App />);
    expect(await screen.findByTestId('active-board-title')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('btn-open-drawer-201'));
    const drawer = await screen.findByTestId('item-detail-drawer');

    // Campo de actualización contraído inicialmente con placeholder descriptivo
    const commentInput = within(drawer).getByTestId('input-new-comment');
    expect(commentInput).toHaveAttribute(
      'placeholder',
      'Escribe una actualización y menciona a otros con @',
    );

    // Al enfocar/hacer clic, se expande la barra de herramientas WYSIWYG
    fireEvent.focus(commentInput);
    const toolbar = await within(drawer).findByTestId('wysiwyg-toolbar');
    expect(toolbar).toBeInTheDocument();

    // Botones de formato presentes
    expect(within(toolbar).getByTestId('wysiwyg-bold-btn')).toBeInTheDocument();
    expect(within(toolbar).getByTestId('wysiwyg-italic-btn')).toBeInTheDocument();
    expect(within(toolbar).getByTestId('wysiwyg-underline-btn')).toBeInTheDocument();
    expect(within(toolbar).getByTestId('wysiwyg-bullet-btn')).toBeInTheDocument();
    expect(within(toolbar).getByTestId('wysiwyg-number-btn')).toBeInTheDocument();
    expect(within(toolbar).getByTestId('wysiwyg-link-btn')).toBeInTheDocument();
    expect(within(toolbar).getByTestId('wysiwyg-mention-btn')).toBeInTheDocument();

    // Aplicar formato de negrita mediante botón de la barra
    fireEvent.click(within(toolbar).getByTestId('wysiwyg-bold-btn'));
    expect(commentInput).toHaveValue('**texto**');

    // Escribir actualización rica con formato
    fireEvent.change(commentInput, {
      target: { value: '**Importante**: @Sofía Martínez el drawer quedó 1:1 Monday.' },
    });

    // Publicar comentario
    const submitBtn = within(drawer).getByTestId('btn-submit-comment');
    fireEvent.click(submitBtn);

    // Esperar a que aparezca en el feed de actualizaciones
    await waitFor(() => {
      expect(
        within(drawer).getByText(/el drawer quedó 1:1 Monday/),
      ).toBeInTheDocument();
    });

    // Cerrar el panel
    fireEvent.click(within(drawer).getByTestId('btn-close-drawer'));
    expect(screen.queryByTestId('item-detail-drawer')).not.toBeInTheDocument();
  });
});
