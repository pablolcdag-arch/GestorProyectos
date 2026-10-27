import { create } from 'zustand';
import { api } from '../services/api';
import type {
  PlanTier,
  PricingPlanRead,
  SubscriptionRead,
} from '../types';

export const DEFAULT_PRICING_PLANS: PricingPlanRead[] = [
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
      'Exportación a CSV',
      'Soporte prioritario por email',
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
      'Integraciones con herramientas externas',
      'Panel lateral de auditoría avanzada',
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
      'Hasta 25,000 acciones de automatización / mes',
      'Columnas de fórmulas y seguimiento de tiempo',
      'Permisos avanzados a nivel de columna y tablero',
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
    features: [
      'Todo lo del plan Pro',
      'SSO y SCIM empresarial (Okta, Entra ID)',
      'SLA del 99.9% con soporte telefónico 24/7',
      'Auditorías de cumplimiento y registros de actividad ilimitados',
      'Gerente de éxito del cliente dedicado',
    ],
    cta_label: 'Contactar',
  },
];

export interface BillingState {
  plans: PricingPlanRead[];
  subscription: SubscriptionRead | null;
  billingCycle: 'monthly' | 'yearly';
  isPricingModalOpen: boolean;
  isLoading: boolean;
  error: string | null;

  loadBillingInfo: () => Promise<void>;
  setBillingCycle: (cycle: 'monthly' | 'yearly') => void;
  openPricingModal: () => void;
  closePricingModal: () => void;
  upgradePlan: (planTier: string) => Promise<void>;
  resetStore: () => void;
}

export const useBillingStore = create<BillingState>((set, get) => ({
  plans: DEFAULT_PRICING_PLANS,
  subscription: null,
  billingCycle: 'yearly',
  isPricingModalOpen: false,
  isLoading: false,
  error: null,

  loadBillingInfo: async () => {
    set({ isLoading: true, error: null });
    try {
      const [plansRes, subRes] = await Promise.allSettled([
        api.getBillingPlans(),
        api.getMySubscription(),
      ]);

      const plans =
        plansRes.status === 'fulfilled' &&
        Array.isArray(plansRes.value) &&
        plansRes.value.length > 0
          ? plansRes.value
          : get().plans.length > 0
            ? get().plans
            : DEFAULT_PRICING_PLANS;

      const subscription =
        subRes.status === 'fulfilled' && subRes.value
          ? subRes.value
          : get().subscription;

      set({
        plans,
        subscription,
        isLoading: false,
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Error al cargar la información de facturación.';
      set({
        plans: get().plans.length > 0 ? get().plans : DEFAULT_PRICING_PLANS,
        isLoading: false,
        error: message,
      });
    }
  },

  setBillingCycle: (cycle: 'monthly' | 'yearly') =>
    set({ billingCycle: cycle }),

  openPricingModal: () => set({ isPricingModalOpen: true }),

  closePricingModal: () => set({ isPricingModalOpen: false }),

  upgradePlan: async (planTier: string) => {
    set({ isLoading: true, error: null });
    try {
      const cycle = get().billingCycle;
      const res = await api.createCheckoutSession(planTier, cycle);

      if (res && res.subscription) {
        set({ subscription: res.subscription, isLoading: false });
      } else {
        const existingSub = get().subscription;
        const updatedSub: SubscriptionRead = {
          id: existingSub?.id ?? 1,
          user_id: existingSub?.user_id ?? 1,
          plan_tier: planTier as PlanTier,
          billing_cycle: cycle,
          status: 'active',
          trial_days_left: null,
          current_period_end: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          created_at: existingSub?.created_at ?? new Date().toISOString(),
        };
        set({ subscription: updatedSub, isLoading: false });
      }

      if (res && res.checkout_url && typeof window !== 'undefined') {
        window.location.href = res.checkout_url;
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Error al procesar la actualización del plan.';
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  resetStore: () =>
    set({
      plans: DEFAULT_PRICING_PLANS,
      subscription: null,
      billingCycle: 'yearly',
      isPricingModalOpen: false,
      isLoading: false,
      error: null,
    }),
}));
