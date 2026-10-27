import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { setAccessToken } from '../services/api';
import type {
  BoardDetailRead,
  BoardStatusRead,
  PricingPlanRead,
  SubscriptionRead,
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

const INITIAL_BOARD_DETAIL: BoardDetailRead = {
  id: 1,
  workspace_id: 1,
  name: 'Roadmap de Producto Q4',
  description: 'Planificación trimestral.',
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
          title: 'Implementar suscripciones y planes',
          status_key: 'in_progress',
          priority: 'critical',
          assignee_id: 1,
          assignee: MOCK_USER,
          due_date: '2026-10-28',
          notes: 'Modal de precios 1:1 Monday',
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
        description: 'Planificación trimestral.',
        created_at: '2026-10-19T12:00:00Z',
      },
    ],
  },
];

const MOCK_PLANS: PricingPlanRead[] = [
  {
    tier: 'basic',
    name: 'Básico',
    badge: null,
    yearly_price_per_month: 4.5,
    monthly_price: 6.0,
    description: 'Para organizar proyectos y tareas esenciales con tu equipo.',
    features: [
      'Tableros ilimitados',
      'Más de 20 tipos de columnas',
      'Comentarios y checklist colaborativo',
    ],
    cta_label: 'Elegir Básico',
  },
  {
    tier: 'standard',
    name: 'Estándar',
    badge: null,
    yearly_price_per_month: 6.0,
    monthly_price: 8.0,
    description: 'Para colaborar y optimizar flujos de trabajo interconectados.',
    features: [
      'Todo lo del plan Básico',
      'Vistas de Cronograma y Calendario',
      'Hasta 250 acciones de automatización / mes',
    ],
    cta_label: 'Elegir Estándar',
  },
  {
    tier: 'pro',
    name: 'Pro',
    badge: 'Más popular',
    yearly_price_per_month: 9.5,
    monthly_price: 12.0,
    description:
      'Para equipos que necesitan flujos complejos, automatizaciones y dashboards.',
    is_popular: true,
    features: [
      'Todo lo del plan Estándar',
      'Dashboards ejecutivos con KPIs consolidados',
      'Funciones premium de IA asistida',
    ],
    cta_label: 'Actualizar a Pro',
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    badge: 'Corporativo',
    yearly_price_per_month: 0,
    monthly_price: 0,
    description: 'Seguridad corporativa, gobernanza y soporte 24/7 dedicado.',
    features: ['Todo lo del plan Pro', 'SSO empresarial', 'Soporte 24/7'],
    cta_label: 'Contactar',
  },
];

let currentSubscription: SubscriptionRead = {
  id: 1,
  user_id: 1,
  plan_tier: 'free_trial',
  billing_cycle: 'yearly',
  status: 'trialing',
  trial_days_left: 14,
  current_period_end: '2026-11-10T12:00:00Z',
  created_at: '2026-10-19T12:00:00Z',
};

function createJsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => data,
  } as Response;
}

describe('PricingAndSubscription — Planes, Modal de Precios y Facturación 1:1 Monday.com', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setAccessToken('valid_test_pricing_jwt');
    currentSubscription = {
      id: 1,
      user_id: 1,
      plan_tier: 'free_trial',
      billing_cycle: 'yearly',
      status: 'trialing',
      trial_days_left: 14,
      current_period_end: '2026-11-10T12:00:00Z',
      created_at: '2026-10-19T12:00:00Z',
    };

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
      if (url.includes('/api/boards/1')) {
        return createJsonResponse(INITIAL_BOARD_DETAIL);
      }
      if (url.includes('/api/billing/plans')) {
        return createJsonResponse(MOCK_PLANS);
      }
      if (url.includes('/api/billing/subscription')) {
        return createJsonResponse(currentSubscription);
      }
      if (url.includes('/api/billing/checkout') && method === 'POST') {
        const body = JSON.parse((init?.body as string) || '{}');
        currentSubscription = {
          ...currentSubscription,
          plan_tier: body.plan_tier || 'pro',
          billing_cycle: body.billing_cycle || 'yearly',
          status: 'active',
          trial_days_left: null,
        };
        return createJsonResponse({
          checkout_url: null,
          subscription: currentSubscription,
          message: 'Suscripción actualizada exitosamente',
        });
      }
      return createJsonResponse({});
    });
  });

  it('1. El botón "Ver planes" se renderiza en la cabecera con el badge de días de prueba', async () => {
    render(<App />);

    // Verificar que el tablero cargue correctamente
    expect(await screen.findByTestId('active-board-title')).toHaveTextContent(
      'Roadmap de Producto Q4',
    );

    // Verificar botón oficial "Ver planes" en la cabecera
    const viewPlansBtn = screen.getByTestId('btn-view-plans');
    expect(viewPlansBtn).toBeInTheDocument();
    expect(viewPlansBtn).toHaveTextContent('Ver planes');

    // Verificar badge suave con los días de prueba restantes
    const trialBadge = await screen.findByTestId('badge-trial-days');
    expect(trialBadge).toBeInTheDocument();
    expect(trialBadge).toHaveTextContent(/14 días de prueba/i);
  });

  it('2. Al hacer clic en "Ver planes", se abre el modal con las 4 tarjetas de precios mostrando $4.50, $6.00 y $9.50', async () => {
    render(<App />);

    expect(await screen.findByTestId('active-board-title')).toHaveTextContent(
      'Roadmap de Producto Q4',
    );

    // Abrir modal haciendo clic en "Ver planes"
    const viewPlansBtn = screen.getByTestId('btn-view-plans');
    fireEvent.click(viewPlansBtn);

    // Verificar que el modal de precios se renderice
    const modal = await screen.findByTestId('pricing-modal');
    expect(modal).toBeInTheDocument();

    // Título y subtítulo corporativos
    expect(
      screen.getByText('Elegí el plan perfecto para tu equipo'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Todo el poder de Monday.com a la mitad del costo y sin mínimos abusivos de usuarios.',
      ),
    ).toBeInTheDocument();

    // 4 tarjetas de planes
    expect(screen.getByTestId('plan-card-basic')).toBeInTheDocument();
    expect(screen.getByTestId('plan-card-standard')).toBeInTheDocument();
    expect(screen.getByTestId('plan-card-pro')).toBeInTheDocument();
    expect(screen.getByTestId('plan-card-enterprise')).toBeInTheDocument();

    // Tarifas anuales con descuento
    expect(screen.getByTestId('plan-price-basic')).toHaveTextContent('$4.50');
    expect(screen.getByTestId('plan-price-standard')).toHaveTextContent('$6.00');
    expect(screen.getByTestId('plan-price-pro')).toHaveTextContent('$9.50');

    // Plan Pro destacado con badges de Monday
    expect(screen.getByTestId('badge-trial-plan')).toHaveTextContent(
      'Plan de prueba',
    );
    expect(screen.getByTestId('badge-most-popular')).toHaveTextContent(
      'Más popular',
    );
    expect(screen.getByTestId('plan-card-pro')).toHaveClass(
      'border-2',
      'border-[#0073ea]',
    );

    // Cerrar modal
    const closeBtn = screen.getByTestId('btn-close-pricing-modal');
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId('pricing-modal')).not.toBeInTheDocument();
  });

  it('3. El toggle de ciclo de facturación alterna entre mensual y anual actualizando los valores', async () => {
    render(<App />);

    expect(await screen.findByTestId('active-board-title')).toHaveTextContent(
      'Roadmap de Producto Q4',
    );

    fireEvent.click(screen.getByTestId('btn-view-plans'));
    await screen.findByTestId('pricing-modal');

    // Inicialmente está en anual
    expect(screen.getByTestId('badge-save-discount')).toHaveTextContent(
      'Ahorrá hasta 20%',
    );
    expect(screen.getByTestId('plan-price-basic')).toHaveTextContent('$4.50');
    expect(screen.getByTestId('plan-price-standard')).toHaveTextContent('$6.00');
    expect(screen.getByTestId('plan-price-pro')).toHaveTextContent('$9.50');

    // Cambiar a facturación mensual
    const toggleMonthly = screen.getByTestId('toggle-cycle-monthly');
    fireEvent.click(toggleMonthly);

    // Los precios mensuales reflejan el valor sin descuento
    expect(screen.getByTestId('plan-price-basic')).toHaveTextContent('$6.00');
    expect(screen.getByTestId('plan-price-standard')).toHaveTextContent('$8.00');
    expect(screen.getByTestId('plan-price-pro')).toHaveTextContent('$12.00');

    // Volver a facturación anual
    const toggleYearly = screen.getByTestId('toggle-cycle-yearly');
    fireEvent.click(toggleYearly);

    expect(screen.getByTestId('plan-price-basic')).toHaveTextContent('$4.50');
    expect(screen.getByTestId('plan-price-standard')).toHaveTextContent('$6.00');
    expect(screen.getByTestId('plan-price-pro')).toHaveTextContent('$9.50');
  });

  it('4. Al hacer clic en el botón de upgrade a "Pro", se invoca la API y se actualiza el estado de la suscripción sin romper la navegación', async () => {
    render(<App />);

    expect(await screen.findByTestId('active-board-title')).toHaveTextContent(
      'Roadmap de Producto Q4',
    );

    fireEvent.click(screen.getByTestId('btn-view-plans'));
    await screen.findByTestId('pricing-modal');

    // El botón del plan Pro es "Actualizar a Pro"
    const btnPro = screen.getByTestId('btn-plan-pro');
    expect(btnPro).toHaveTextContent('Actualizar a Pro');
    expect(btnPro).not.toBeDisabled();

    // Ejecutar upgrade a Pro
    fireEvent.click(btnPro);

    // Verificar que se muestre el banner de éxito
    const successBanner = await screen.findByTestId('pricing-success-banner');
    expect(successBanner).toHaveTextContent(/PRO activado con éxito/i);

    // El botón ahora refleja que es "Tu plan actual" y queda deshabilitado
    await waitFor(() => {
      expect(screen.getByTestId('btn-plan-pro')).toHaveTextContent(
        'Tu plan actual',
      );
      expect(screen.getByTestId('btn-plan-pro')).toBeDisabled();
    });

    // Cerrar el modal
    fireEvent.click(screen.getByTestId('btn-close-pricing-modal'));

    // En la cabecera, el badge de prueba ya no debe estar visible porque el plan es PRO activo
    await waitFor(() => {
      expect(screen.queryByTestId('badge-trial-days')).not.toBeInTheDocument();
    });

    // La navegación del tablero sigue intacta
    expect(screen.getByTestId('active-board-title')).toHaveTextContent(
      'Roadmap de Producto Q4',
    );
    expect(
      screen.getByText('Implementar suscripciones y planes'),
    ).toBeInTheDocument();
  });
});
