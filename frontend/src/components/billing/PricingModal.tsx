import React, { useState } from 'react';
import {
  Building2,
  Check,
  Loader2,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { useBillingStore } from '../../store/useBillingStore';
import type { PlanTier, PricingPlanRead } from '../../types';

export const PricingModal: React.FC = () => {
  const {
    plans,
    subscription,
    billingCycle,
    isPricingModalOpen,
    isLoading,
    setBillingCycle,
    closePricingModal,
    upgradePlan,
  } = useBillingStore();

  const [processingTier, setProcessingTier] = useState<PlanTier | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isPricingModalOpen) {
    return null;
  }

  const handleUpgrade = async (tier: PlanTier) => {
    if (tier === 'enterprise') {
      window.location.href = 'mailto:ventas@gestor.dev?subject=Consulta%20Plan%20Enterprise';
      return;
    }
    setProcessingTier(tier);
    setSuccessMessage(null);
    try {
      await upgradePlan(tier);
      setSuccessMessage(`¡Plan ${tier.toUpperCase()} activado con éxito!`);
      setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);
    } catch {
      // El error ya queda registrado en el store
    } finally {
      setProcessingTier(null);
    }
  };

  const getTierIcon = (tier: PlanTier) => {
    switch (tier) {
      case 'pro':
        return <Sparkles className="w-5 h-5 text-[#0073ea]" />;
      case 'standard':
        return <Zap className="w-5 h-5 text-[#fdab3d]" />;
      case 'enterprise':
        return <Building2 className="w-5 h-5 text-[#784bd1]" />;
      default:
        return <ShieldCheck className="w-5 h-5 text-[#00c875]" />;
    }
  };

  const currentTier = subscription?.plan_tier ?? 'free_trial';

  return (
    <div
      data-testid="pricing-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closePricingModal();
        }
      }}
    >
      <div
        data-testid="pricing-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pricing-modal-title"
        className="relative w-full max-w-6xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl p-6 sm:p-8 md:p-10 border border-gray-100 flex flex-col my-auto"
      >
        {/* Botón de cierre X */}
        <button
          type="button"
          onClick={closePricingModal}
          data-testid="btn-close-pricing-modal"
          aria-label="Cerrar modal de precios"
          className="absolute top-5 right-5 p-2 rounded-full text-[#676879] hover:text-[#323338] hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabecera corporativa */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f0f7ff] text-[#0073ea] text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Precios transparentes y justos</span>
          </div>
          <h2
            id="pricing-modal-title"
            className="text-2xl sm:text-3xl font-extrabold text-[#323338] tracking-tight"
          >
            Elegí el plan perfecto para tu equipo
          </h2>
          <p className="text-sm sm:text-base text-[#676879] mt-2">
            Todo el poder de Monday.com a la mitad del costo y sin mínimos
            abusivos de usuarios.
          </p>

          {/* Banner de éxito al actualizar */}
          {successMessage && (
            <div
              data-testid="pricing-success-banner"
              className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Toggle switcher Anual vs Mensual */}
          <div className="mt-6 inline-flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              data-testid="toggle-cycle-yearly"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                billingCycle === 'yearly'
                  ? 'bg-white text-[#323338] shadow-xs'
                  : 'text-[#676879] hover:text-[#323338]'
              }`}
            >
              <span>Facturación Anual</span>
              <span
                data-testid="badge-save-discount"
                className="px-2 py-0.5 rounded-full bg-[#00c875]/20 text-[#00854d] text-[11px] font-extrabold"
              >
                Ahorrá hasta 20%
              </span>
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              data-testid="toggle-cycle-monthly"
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-white text-[#323338] shadow-xs'
                  : 'text-[#676879] hover:text-[#323338]'
              }`}
            >
              Facturación Mensual
            </button>
          </div>
        </div>

        {/* Grid Responsive de 4 Columnas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
          {plans.map((plan: PricingPlanRead) => {
            const isPro = plan.tier === 'pro';
            const isEnterprise = plan.tier === 'enterprise';
            const isCurrent = currentTier === plan.tier;
            const isProcessingThis =
              isLoading && processingTier === plan.tier;

            const price =
              billingCycle === 'yearly'
                ? plan.yearly_price_per_month
                : plan.monthly_price;

            const formattedPrice =
              price % 1 === 0 ? `$${price}.00` : `$${price.toFixed(2)}`;

            return (
              <div
                key={plan.tier}
                data-testid={`plan-card-${plan.tier}`}
                className={`relative flex flex-col justify-between rounded-2xl p-6 transition-all duration-200 ${
                  isPro
                    ? 'border-2 border-[#0073ea] shadow-xl bg-gradient-to-b from-[#f5f9ff] to-white ring-1 ring-[#0073ea]/20'
                    : 'border border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }`}
              >
                {/* Badges superiores de Pro (Plan de prueba + Más popular) */}
                {isPro && (
                  <div className="absolute -top-3.5 left-4 right-4 flex items-center justify-between pointer-events-none">
                    <span
                      data-testid="badge-trial-plan"
                      className="px-2.5 py-0.5 rounded-full bg-[#323338] text-white text-[10px] font-extrabold uppercase tracking-wide shadow-xs"
                    >
                      Plan de prueba
                    </span>
                    <span
                      data-testid="badge-most-popular"
                      className="px-2.5 py-0.5 rounded-full bg-[#0073ea] text-white text-[10px] font-extrabold uppercase tracking-wide shadow-xs"
                    >
                      Más popular
                    </span>
                  </div>
                )}

                {/* Encabezado de la Tarjeta */}
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-100">
                        {getTierIcon(plan.tier)}
                      </div>
                      <h3 className="font-extrabold text-lg text-[#323338]">
                        {plan.name}
                      </h3>
                    </div>
                  </div>

                  <p className="text-xs text-[#676879] min-h-[36px] line-clamp-2">
                    {plan.description}
                  </p>

                  {/* Sección de Precio */}
                  <div className="my-5 pb-5 border-b border-gray-100">
                    {isEnterprise ? (
                      <div className="py-1">
                        <div
                          data-testid={`plan-price-${plan.tier}`}
                          className="text-2xl font-extrabold text-[#323338]"
                        >
                          A medida
                        </div>
                        <p className="text-xs text-[#676879] mt-1">
                          Para grandes organizaciones
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span
                            data-testid={`plan-price-${plan.tier}`}
                            className="text-3xl font-extrabold text-[#323338] tracking-tight"
                          >
                            {formattedPrice}
                          </span>
                          <span className="text-xs font-bold text-[#676879]">
                            USD
                          </span>
                        </div>
                        <p className="text-xs text-[#676879] mt-1">
                          por usuario / mes
                          {billingCycle === 'yearly' ? ' (pago anual)' : ''}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Lista de Beneficios */}
                  <div className="space-y-2.5 mb-6">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#323338]">
                      Incluye:
                    </p>
                    <ul className="space-y-2 text-xs text-[#323338]">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-[#00c875] shrink-0 mt-0.5" />
                          <span className="leading-snug">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Botón CTA */}
                <div className="mt-auto pt-4 border-t border-gray-100">
                  {isCurrent ? (
                    <button
                      type="button"
                      disabled
                      data-testid={`btn-plan-${plan.tier}`}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-gray-100 text-[#676879] cursor-not-allowed border border-gray-200"
                    >
                      Tu plan actual
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => void handleUpgrade(plan.tier)}
                      data-testid={`btn-plan-${plan.tier}`}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs ${
                        isPro
                          ? 'bg-[#0073ea] hover:bg-[#0060c0] text-white shadow-blue-200'
                          : isEnterprise
                            ? 'bg-white hover:bg-gray-50 text-[#323338] border border-gray-300'
                            : 'bg-[#f0f7ff] hover:bg-[#e1f0ff] text-[#0073ea] border border-[#0073ea]/30'
                      }`}
                    >
                      {isProcessingThis ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Procesando...</span>
                        </>
                      ) : (
                        <span>{plan.cta_label || 'Elegir plan'}</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pie con nota de seguridad y garantía */}
        <div className="mt-8 pt-6 border-t border-gray-100 flex flex-wrap items-center justify-between text-xs text-[#676879] gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#00c875]" />
            <span>Cancelá o cambiá de plan en cualquier momento sin penalizaciones.</span>
          </div>
          <div className="text-right">
            <span>Todos los precios están expresados en USD. IVA aplicable según el país.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
