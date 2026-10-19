import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CheckSquare,
  Loader2,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

interface AutomationsModalProps {
  boardId: number;
  boardName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface RecipeDefinition {
  rule_type: string;
  title: string;
  description: string;
  category: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
}

const AUTOMATION_RECIPES: RecipeDefinition[] = [
  {
    rule_type: 'when_checklist_complete_set_status',
    title: 'Al completar el 100% del checklist → Cambiar estado a Listo',
    description:
      'Cuando todos los elementos del checklist de una tarea se marquen como completados, su estado se actualizará automáticamente a Listo.',
    category: 'Progreso y Estados',
    badge: 'Checklist → Estado',
    icon: CheckCircle2,
  },
  {
    rule_type: 'when_status_done_complete_checklist',
    title: 'Al cambiar estado a Listo → Marcar checklist como completado',
    description:
      'Cuando el estado de una tarea cambie a Listo, todos los elementos pendientes de su checklist se marcarán automáticamente como completados.',
    category: 'Finalización de Tarea',
    badge: 'Estado → Checklist',
    icon: CheckSquare,
  },
  {
    rule_type: 'when_status_blocked_log_alert',
    title: 'Al marcar como Bloqueado → Registrar alerta en el log',
    description:
      'Cuando una tarea pase al estado Bloqueado o Atascado, se registrará una alerta de alta prioridad en el historial de actividad.',
    category: 'Alertas y Riesgos',
    badge: 'Riesgos y Alertas',
    icon: AlertTriangle,
  },
];

export const AutomationsModal: React.FC<AutomationsModalProps> = ({
  boardId,
  boardName,
  isOpen,
  onClose,
}) => {
  const {
    boardAutomations,
    isLoadingAutomations,
    loadBoardAutomations,
    toggleAutomation,
    error,
    clearError,
  } = useWorkspaceStore();

  const [togglingRule, setTogglingRule] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && boardId) {
      void loadBoardAutomations(boardId);
    }
  }, [isOpen, boardId, loadBoardAutomations]);

  if (!isOpen) return null;

  const handleToggle = async (recipe: RecipeDefinition) => {
    const existing = boardAutomations.find(
      (r) => r.rule_type === recipe.rule_type,
    );
    const currentlyActive = existing ? existing.is_active : false;
    setTogglingRule(recipe.rule_type);
    try {
      await toggleAutomation(
        boardId,
        recipe.rule_type,
        currentlyActive,
        existing?.id,
      );
    } catch {
      // Error manejado en el store
    } finally {
      setTogglingRule(null);
    }
  };

  const activeCount = boardAutomations.filter((a) => a.is_active).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="automations-modal-title"
      data-testid="automations-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Cabecera del Modal */}
        <div className="p-5 border-b border-gray-200 flex items-start justify-between bg-gradient-to-r from-amber-50/70 via-white to-amber-50/30">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="automations-modal-title"
                  className="text-lg font-bold text-[#323338]"
                >
                  Automatizaciones de Tablero
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  {activeCount} {activeCount === 1 ? 'activa' : 'activas'}
                </span>
              </div>
              <p className="text-xs text-[#676879] mt-0.5">
                Tablero:{' '}
                <span className="font-semibold text-[#323338]">{boardName}</span>{' '}
                — Flujos automáticos sin código estilo Monday.com
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="btn-close-automations"
            aria-label="Cerrar modal de automatizaciones"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner de error */}
        {error && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={clearError}
              className="text-red-700 font-bold hover:underline"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Contenido / Recetas */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <div className="flex items-center justify-between text-xs text-[#676879]">
            <span className="font-semibold uppercase tracking-wider text-[11px]">
              Recetas Disponibles
            </span>
            {isLoadingAutomations && (
              <span className="inline-flex items-center gap-1.5 text-[#0073ea]">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Sincronizando reglas...
              </span>
            )}
          </div>

          <div className="space-y-3">
            {AUTOMATION_RECIPES.map((recipe) => {
              const Icon = recipe.icon;
              const existing = boardAutomations.find(
                (r) => r.rule_type === recipe.rule_type,
              );
              const isActive = existing ? existing.is_active : false;
              const isToggling = togglingRule === recipe.rule_type;

              return (
                <div
                  key={recipe.rule_type}
                  className={`p-4 rounded-xl border transition-all ${
                    isActive
                      ? 'border-[#00c875]/60 bg-[#f0faf5] shadow-2xs'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          isActive
                            ? 'bg-[#00c875] text-white shadow-2xs'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-[#323338]">
                            {recipe.title}
                          </h3>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                            {recipe.badge}
                          </span>
                        </div>
                        <p className="text-xs text-[#676879] leading-relaxed">
                          {recipe.description}
                        </p>
                      </div>
                    </div>

                    {/* Switch / Toggle Button */}
                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                      <button
                        type="button"
                        onClick={() => void handleToggle(recipe)}
                        disabled={isToggling}
                        data-testid={`automation-toggle-${recipe.rule_type}`}
                        aria-pressed={isActive}
                        aria-label={`Alternar regla ${recipe.title}`}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#0073ea] focus:ring-offset-2 cursor-pointer ${
                          isActive ? 'bg-[#00c875]' : 'bg-gray-300'
                        } ${isToggling ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-xs ${
                            isActive ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span
                        className={`text-xs font-semibold w-14 ${
                          isActive ? 'text-[#00c875]' : 'text-gray-400'
                        }`}
                      >
                        {isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl bg-blue-50/70 border border-blue-200/80 p-3.5 flex items-center gap-3 text-xs text-blue-900">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Las reglas se ejecutan de manera instantánea en el backend cuando
              actualizás el estado o el checklist de cualquier tarea del tablero.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-gray-300 text-[#323338] hover:bg-gray-100 text-xs font-semibold transition-colors cursor-pointer"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};

