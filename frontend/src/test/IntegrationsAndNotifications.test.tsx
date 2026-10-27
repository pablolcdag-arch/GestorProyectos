import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import App from '../App';
import { setAccessToken } from '../services/api';
import type {
  BoardDetailRead,
  BoardStatusRead,
  NotificationItem,
  TaskAttachment,
  TaskItemDetailRead,
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
  description: 'Planificación general.',
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
          title: 'Integrar pasarela y archivos adjuntos',
          status_key: 'in_progress',
          priority: 'critical',
          assignee_id: 1,
          assignee: MOCK_USER,
          due_date: '2026-10-31',
          notes: 'Manejo de archivos drag and drop',
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
    description: 'Gestión central',
    icon: 'Briefcase',
    color: '#0073ea',
    owner_id: 1,
    created_at: '2026-10-19T12:00:00Z',
    boards: [
      {
        id: 1,
        workspace_id: 1,
        name: 'Roadmap de Producto Q4',
        description: 'Planificación general.',
        created_at: '2026-10-19T12:00:00Z',
      },
    ],
  },
];

let mockNotifications: NotificationItem[] = [
  {
    id: 1,
    title: 'Nueva mención en Tarea 1',
    message: 'Carlos te mencionó en un comentario.',
    is_read: false,
    created_at: '2026-10-20T10:00:00Z',
  },
  {
    id: 2,
    title: 'Automatización ejecutada',
    message: 'Se cambió el estado a Listo automáticamente.',
    is_read: true,
    created_at: '2026-10-19T14:30:00Z',
  },
];

let mockAttachments: TaskAttachment[] = [
  {
    id: 1,
    item_id: 100,
    filename: 'reporte_trimestral.pdf',
    file_size: 154800,
    content_type: 'application/pdf',
    file_url: 'https://storage.gestor.dev/attachments/reporte_trimestral.pdf',
    created_at: '2026-10-20T12:00:00Z',
  },
];

const ITEM_100_DETAIL: TaskItemDetailRead = {
  id: 100,
  group_id: 10,
  board_id: 1,
  title: 'Integrar pasarela y archivos adjuntos',
  status_key: 'in_progress',
  priority: 'critical',
  assignee_id: 1,
  assignee: MOCK_USER,
  start_date: '2026-10-20',
  due_date: '2026-10-31',
  estimated_hours: 8.0,
  budget: 1200.0,
  notes: 'Manejo de archivos drag and drop',
  position: 0,
  created_at: '2026-10-19T12:00:00Z',
  updated_at: '2026-10-19T12:00:00Z',
  comments: [],
  checklist_items: [],
  activities: [],
};

function createJsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => data,
  } as Response;
}

describe('IntegrationsAndNotifications — Google Calendar, Pestaña Archivos y Notificaciones 1:1 Monday.com', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setAccessToken('valid_integration_test_jwt');
    mockNotifications = [
      {
        id: 1,
        title: 'Nueva mención en Tarea 1',
        message: 'Carlos te mencionó en un comentario.',
        is_read: false,
        created_at: '2026-10-20T10:00:00Z',
      },
      {
        id: 2,
        title: 'Automatización ejecutada',
        message: 'Se cambió el estado a Listo automáticamente.',
        is_read: true,
        created_at: '2026-10-19T14:30:00Z',
      },
    ];
    mockAttachments = [
      {
        id: 1,
        item_id: 100,
        filename: 'reporte_trimestral.pdf',
        file_size: 154800,
        content_type: 'application/pdf',
        file_url: 'https://storage.gestor.dev/attachments/reporte_trimestral.pdf',
        created_at: '2026-10-20T12:00:00Z',
      },
    ];

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
      if (url.includes('/api/boards/1') && method === 'GET') {
        return createJsonResponse(INITIAL_BOARD);
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
      if (url.includes('/api/notifications/read-all') && method === 'POST') {
        mockNotifications = mockNotifications.map((n) => ({ ...n, is_read: true }));
        return createJsonResponse({ updated: true });
      }
      if (url.includes('/api/notifications/1/read') && method === 'PATCH') {
        mockNotifications = mockNotifications.map((n) =>
          n.id === 1 ? { ...n, is_read: true } : n,
        );
        return createJsonResponse({ id: 1, is_read: true });
      }
      if (url.includes('/api/notifications') && method === 'GET') {
        return createJsonResponse(mockNotifications);
      }
      if (url.includes('/api/items/100/attachments') && method === 'GET') {
        return createJsonResponse(mockAttachments);
      }
      if (url.includes('/api/items/100/attachments') && method === 'POST') {
        const body = JSON.parse((init?.body as string) || '{}');
        const newAtt: TaskAttachment = {
          id: 2,
          item_id: 100,
          filename: body.filename,
          file_size: body.file_size,
          content_type: body.content_type,
          file_url: body.file_url || 'https://storage.gestor.dev/attachments/contrato.pdf',
          created_at: new Date().toISOString(),
        };
        mockAttachments = [...mockAttachments.filter((a) => a.id !== 2), newAtt];
        return createJsonResponse(newAtt, 201);
      }
      if (url.includes('/api/attachments/2') && method === 'DELETE') {
        mockAttachments = mockAttachments.filter((a) => a.id !== 2);
        return createJsonResponse({ deleted: true });
      }
      if (url.includes('/api/items/100') && method === 'GET') {
        return createJsonResponse(ITEM_100_DETAIL);
      }
      return createJsonResponse({});
    });
  });

  it('1. Campana de Notificaciones: renderiza badge no leído, abre el popover y permite marcar como leídas', async () => {
    render(<App />);

    expect(await screen.findByTestId('active-board-title')).toHaveTextContent(
      'Roadmap de Producto Q4',
    );

    // Botón oficial de notificaciones en la cabecera
    const bellBtn = screen.getByTestId('btn-notifications-bell');
    expect(bellBtn).toBeInTheDocument();

    // Badge rojo con conteo de no leídas (1 pendiente)
    const badge = await screen.findByTestId('badge-notifications-count');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('1');

    // Clic en la campana para desplegar el popover
    fireEvent.click(bellBtn);

    const popover = await screen.findByTestId('notifications-popover');
    expect(popover).toBeInTheDocument();
    expect(within(popover).getByText('Notificaciones')).toBeInTheDocument();
    expect(within(popover).getByText('1 nuevas')).toBeInTheDocument();

    // Verificar notificación no leída en la lista
    const item1 = screen.getByTestId('notification-item-1');
    expect(item1).toHaveTextContent('Nueva mención en Tarea 1');
    expect(item1).toHaveTextContent('Carlos te mencionó en un comentario.');

    // Marcar como leída haciendo clic en el ítem
    fireEvent.click(item1);

    // El badge de conteo en la cabecera se actualiza o desaparece
    await waitFor(() => {
      expect(screen.queryByTestId('badge-notifications-count')).not.toBeInTheDocument();
    });
  });

  it('2. Pestaña "Archivos" en el Drawer: lista adjuntos existentes, permite subida drag & drop y borrado', async () => {
    render(<App />);

    expect(await screen.findByTestId('active-board-title')).toHaveTextContent(
      'Roadmap de Producto Q4',
    );

    // Abrir el Drawer de la tarea 100
    const openBtn = screen.getByTestId('btn-open-drawer-100');
    fireEvent.click(openBtn);

    const drawer = await screen.findByTestId('item-detail-drawer');
    expect(drawer).toBeInTheDocument();

    // Clic en la pestaña Archivos
    const filesTab = screen.getByTestId('drawer-tab-files');
    expect(filesTab).toBeInTheDocument();
    fireEvent.click(filesTab);

    // Verificar sección de archivos activa
    const filesSection = await screen.findByTestId('drawer-files-section');
    expect(filesSection).toBeInTheDocument();

    // Verificar zona de subida drag & drop
    const dropzone = screen.getByTestId('dropzone-attachments');
    expect(dropzone).toHaveTextContent(/Arrastrá archivos acá o hacé clic para adjuntar/i);

    // Verificar archivo preexistente en la lista con su tamaño formateado
    const att1 = await screen.findByTestId('attachment-name-1');
    expect(att1).toHaveTextContent('reporte_trimestral.pdf');
    expect(screen.getByTestId('attachment-item-1')).toHaveTextContent(/151/);

    // Simular subida de un nuevo archivo
    const fileInput = screen.getByTestId('file-input-attachments');
    const newFile = new File(['contenido de prueba'], 'contrato_firmado.pdf', {
      type: 'application/pdf',
    });
    Object.defineProperty(newFile, 'size', { value: 250000 });

    fireEvent.change(fileInput, { target: { files: [newFile] } });

    // El nuevo archivo debe aparecer en la lista
    const att2 = await screen.findByTestId('attachment-name-2');
    expect(att2).toHaveTextContent('contrato_firmado.pdf');

    // Botón de eliminar adjunto
    const deleteBtn = screen.getByTestId('btn-delete-attachment-2');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('attachment-name-2')).not.toBeInTheDocument();
    });
  });

  it('3. Sincronización Google Calendar: abre modal, expone link directo y copia enlace iCal (.ics)', async () => {
    render(<App />);

    expect(await screen.findByTestId('active-board-title')).toHaveTextContent(
      'Roadmap de Producto Q4',
    );

    // Botón en la Toolbar
    const syncBtn = screen.getByTestId('btn-sync-calendar');
    expect(syncBtn).toBeInTheDocument();
    fireEvent.click(syncBtn);

    // Modal de sincronización
    const modal = await screen.findByTestId('modal-sync-calendar');
    expect(modal).toBeInTheDocument();
    expect(
      within(modal).getByText('Sincronizar con Google Calendar'),
    ).toBeInTheDocument();

    // Input con URL del feed iCal
    const icalInput = screen.getByTestId('input-ical-url') as HTMLInputElement;
    expect(icalInput.value).toContain('/api/boards/1/calendar.ics');

    // Botón abrir en Google Calendar con enlace render
    const openGoogleBtn = screen.getByTestId('btn-open-google-calendar');
    expect(openGoogleBtn.getAttribute('href')).toContain(
      'calendar.google.com/calendar/render',
    );

    // Botón copiar enlace iCal
    const copyBtn = screen.getByTestId('btn-copy-ical-url');
    expect(copyBtn).toHaveTextContent('Copiar');
    fireEvent.click(copyBtn);

    expect(await screen.findByText('¡Copiado!')).toBeInTheDocument();

    // Cerrar modal
    fireEvent.click(screen.getByTestId('btn-close-sync-modal'));
    expect(screen.queryByTestId('modal-sync-calendar')).not.toBeInTheDocument();
  });
});
