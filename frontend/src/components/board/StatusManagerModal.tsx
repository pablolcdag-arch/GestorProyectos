import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Palette,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import {
  MONDAY_COLOR_PALETTE,
  type BoardStatusRead,
} from '../../types';

interface StatusManagerModalProps {
  boardId: number;
  statuses: BoardStatusRead[];
  isOpen: boolean;
  onClose: () => void;
}

interface DraftStatus {
  label: string;
  color: string;
}

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;

export const StatusManagerModal: React.FC<StatusManagerModalProps> = ({
  boardId,
  statuses,
  isOpen,
  onClose,
}) => {
  const { createBoardStatus, updateBoardStatus, deleteBoardStatus } =
    useWorkspaceStore();

  const [drafts, setDrafts] = useState<Record<number, DraftStatus>>({});
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState('#0073ea');
  const [activePaletteStatusId, setActivePaletteStatusId] = useState<number | null>(null);
  const [isNewStatusPaletteOpen, setIsNewStatusPaletteOpen] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [savedStatusId, setSavedStatusId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const initial: Record<number, DraftStatus> = {};
    for (const st of statuses) {
      initial[st.id] = { label: st.label, color: st.color };
    }
    setDrafts(initial);
  }, [statuses]);

  if (!isOpen) return null;

  const handleDraftChange = (
    statusId: number,
    field: keyof DraftStatus,
    value: string,
  ) => {
    setFeedbackError(null);
    setDrafts((prev) => ({
      ...prev,
      [statusId]: {
        ...(prev[statusId] ?? { label: '', color: '#0073ea' }),
        [field]: value,
      },
    }));
  };

  const handleSaveStatus = async (st: BoardStatusRead) => {
    const draft = drafts[st.id];
    if (!draft) return;

    const cleanedLabel = draft.label.trim();
    const cleanedColor = draft.color.trim().toLowerCase();

    if (!cleanedLabel) {
      setFeedbackError('La etiqueta del estado no puede estar vacía.');
      return;
    }
    if (!HEX_REGEX.test(cleanedColor)) {
      setFeedbackError(
        `El color "${draft.color}" no es válido. Usá formato hexadecimal #RRGGBB.`,
      );
      return;
    }

    setFeedbackError(null);
    setIsSubmitting(true);
    try {
      await updateBoardStatus(boardId, st.id, {
        label: cleanedLabel,
        color: cleanedColor,
      });
      setSavedStatusId(st.id);
      setActivePaletteStatusId(null);
      setTimeout(() => {
        setSavedStatusId((current) => (current === st.id ? null : current));
      }, 1500);
    } catch (err) {
      setFeedbackError(
        err instanceof Error ? err.message : 'No se pudo actualizar el estado.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyAllChanges = async () => {
    setFeedbackError(null);
    setIsSubmitting(true);
    try {
      for (const st of statuses) {
        const draft = drafts[st.id];
        if (!draft) continue;
        const cleanedLabel = draft.label.trim();
        const cleanedColor = draft.color.trim().toLowerCase();

        if (cleanedLabel !== st.label || cleanedColor !== st.color.toLowerCase()) {
          if (!cleanedLabel || !HEX_REGEX.test(cleanedColor)) continue;
          await updateBoardStatus(boardId, st.id, {
            label: cleanedLabel,
            color: cleanedColor,
          });
        }
      }
      onClose();
    } catch (err) {
      setFeedbackError(
        err instanceof Error ? err.message : 'No se pudieron aplicar todos los cambios.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStatus = async (st: BoardStatusRead) => {
    if (statuses.length <= 1) return;
    setFeedbackError(null);
    setIsSubmitting(true);
    try {
      await deleteBoardStatus(boardId, st.id);
    } catch (err) {
      setFeedbackError(
        err instanceof Error ? err.message : 'No se pudo eliminar el estado.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedLabel = newLabel.trim();
    const cleanedColor = newColor.trim().toLowerCase();

    if (!cleanedLabel) {
      setFeedbackError('Ingresá un nombre para el nuevo estado.');
      return;
    }
    if (!HEX_REGEX.test(cleanedColor)) {
      setFeedbackError(
        `El color "${newColor}" es inválido. Debe tener formato #RRGGBB.`,
      );
      return;
    }

    setFeedbackError(null);
    setIsSubmitting(true);
    try {
      await createBoardStatus(boardId, {
        label: cleanedLabel,
        color: cleanedColor,
      });
      setNewLabel('');
      setNewColor('#0073ea');
      setIsNewStatusPaletteOpen(false);
    } catch (err) {
      setFeedbackError(
        err instanceof Error ? err.message : 'No se pudo crear el estado.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-modal-title"
      data-testid="status-manager-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4"
    >
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Cabecera del Modal */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-[#f7f8fa]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0073ea]/10 text-[#0073ea] flex items-center justify-center">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="status-modal-title"
                className="text-base font-bold text-[#323338]"
              >
                Personalizar Etiquetas de Estado
              </h2>
              <p className="text-xs text-[#676879]">
                Editá nombres, seleccioná entre la paleta oficial de 40 colores de Monday.com o agregá nuevos estados
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar personalizador de estados"
            data-testid="btn-close-status-modal"
            className="p-2 rounded-lg text-[#676879] hover:text-[#323338] hover:bg-gray-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo con lista de estados actuales */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {feedbackError && (
            <div
              role="alert"
              className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-[#e2445c]" />
              <span>{feedbackError}</span>
            </div>
          )}

          <div className="space-y-3">
            {statuses.map((st) => {
              const draft = drafts[st.id] ?? {
                label: st.label,
                color: st.color,
              };
              const isOnlyOneRemaining = statuses.length <= 1;
              const wasJustSaved = savedStatusId === st.id;
              const isPaletteOpen = activePaletteStatusId === st.id;

              return (
                <div
                  key={st.id}
                  data-testid={`status-row-${st.key}`}
                  className="p-3.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-all space-y-2.5 shadow-2xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                    {/* Píldora de vista previa estilo Monday.com (32px de alto, rounded-[2px]) */}
                    <div
                      className="px-3 h-8 rounded-[2px] text-white text-xs font-bold text-center sm:w-36 shrink-0 truncate shadow-2xs flex items-center justify-center"
                      style={{
                        backgroundColor: HEX_REGEX.test(draft.color)
                          ? draft.color
                          : st.color,
                      }}
                    >
                      {draft.label || st.label}
                    </div>

                    {/* Input de nombre / etiqueta */}
                    <input
                      type="text"
                      value={draft.label}
                      onChange={(e) =>
                        handleDraftChange(st.id, 'label', e.target.value)
                      }
                      aria-label={`Etiqueta del estado ${st.label}`}
                      data-testid={`status-label-input-${st.key}`}
                      className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 focus:outline-none focus:border-[#0073ea]"
                      placeholder="Nombre del estado"
                    />

                    {/* Swatch interactivo que despliega la paleta de 40 colores */}
                    <button
                      type="button"
                      data-testid={`status-color-swatch-${st.key}`}
                      onClick={() =>
                        setActivePaletteStatusId((prev) =>
                          prev === st.id ? null : st.id,
                        )
                      }
                      title="Seleccionar de la paleta de 40 colores"
                      className="w-8 h-8 rounded-md border border-gray-300 shadow-2xs cursor-pointer flex items-center justify-center transition-transform hover:scale-105 shrink-0"
                      style={{ backgroundColor: draft.color }}
                    >
                      {isPaletteOpen ? (
                        <ChevronUp className="w-3.5 h-3.5 text-white drop-shadow-xs" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-white drop-shadow-xs" />
                      )}
                    </button>

                    {/* Input hexadecimal #RRGGBB (mantenido para tests y edición manual) */}
                    <input
                      type="text"
                      value={draft.color}
                      onChange={(e) =>
                        handleDraftChange(st.id, 'color', e.target.value)
                      }
                      aria-label={`Color del estado ${st.label}`}
                      data-testid={`status-color-input-${st.key}`}
                      className="w-20 px-2 py-1.5 text-xs font-mono rounded-lg border border-gray-300 focus:outline-none focus:border-[#0073ea]"
                      placeholder="#00c875"
                    />

                    {/* Botones Guardar y Eliminar */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => void handleSaveStatus(st)}
                        aria-label={`Guardar estado ${st.label}`}
                        data-testid={`btn-save-status-${st.key}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0073ea] hover:bg-[#0060b9] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {wasJustSaved ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Guardado</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            <span>Guardar</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={isOnlyOneRemaining || isSubmitting}
                        onClick={() => void handleDeleteStatus(st)}
                        aria-label={`Eliminar estado ${st.label}`}
                        data-testid={`btn-delete-status-${st.key}`}
                        title={
                          isOnlyOneRemaining
                            ? 'No se puede eliminar el único estado restante'
                            : 'Eliminar estado'
                        }
                        className="p-1.5 rounded-lg border border-gray-200 text-[#676879] hover:text-[#e2445c] hover:bg-red-50 hover:border-red-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Matriz Completa de 40 Colores (5 columnas x 8 filas) desplegable */}
                  {isPaletteOpen && (
                    <div className="mt-2 p-3 bg-[#f6f7fb] rounded-xl border border-[#d0d4e4] space-y-2 animate-in fade-in duration-100">
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#676879] uppercase tracking-wider">
                        <span>Paleta oficial de Monday.com (40 colores)</span>
                        <span className="text-[#323338] font-mono lowercase">
                          {draft.color}
                        </span>
                      </div>
                      <div className="grid grid-cols-5 sm:grid-cols-8 gap-1.5">
                        {MONDAY_COLOR_PALETTE.map((hex) => {
                          const isSelected =
                            draft.color.toLowerCase() === hex.toLowerCase();
                          return (
                            <button
                              key={hex}
                              type="button"
                              data-testid={`palette-color-${hex.replace('#', '')}`}
                              onClick={() =>
                                handleDraftChange(st.id, 'color', hex)
                              }
                              aria-label={`Seleccionar color ${hex} para ${st.label}`}
                              className={`h-7 rounded-[3px] transition-transform hover:scale-105 cursor-pointer shadow-xs relative flex items-center justify-center ${
                                isSelected
                                  ? 'ring-2 ring-offset-1 ring-[#323338] scale-105 z-10'
                                  : 'opacity-90 hover:opacity-100'
                              }`}
                              style={{ backgroundColor: hex }}
                            >
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-white drop-shadow-xs" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Pie del Modal: Formulario para Agregar nuevo estado y Botón Aplicar */}
        <form
          onSubmit={(e) => void handleAddStatus(e)}
          data-testid="form-add-status"
          className="px-6 py-4 bg-[#f7f8fa] border-t border-gray-200 space-y-3"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-[#323338]">
              + Agregar nueva etiqueta
            </p>
            <button
              type="button"
              onClick={() => setIsNewStatusPaletteOpen((prev) => !prev)}
              className="text-[11px] font-semibold text-[#0073ea] hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Paleta de 40 colores</span>
              {isNewStatusPaletteOpen ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <input
              type="text"
              placeholder="Nombre de la nueva etiqueta (ej: En Revisión QA)"
              aria-label="Nombre del nuevo estado"
              data-testid="input-new-status-label"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="flex-1 px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:border-[#0073ea]"
            />

            {/* Swatch para nuevo estado */}
            <button
              type="button"
              data-testid="new-status-color-swatch"
              onClick={() => setIsNewStatusPaletteOpen((prev) => !prev)}
              className="w-9 h-8 rounded-md border border-gray-300 shadow-2xs cursor-pointer flex items-center justify-center shrink-0"
              style={{ backgroundColor: newColor }}
            >
              <Palette className="w-4 h-4 text-white drop-shadow-xs" />
            </button>

            <input
              type="text"
              placeholder="#0073ea"
              aria-label="Color hexadecimal del nuevo estado"
              data-testid="input-new-status-color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-24 px-3 py-2 text-xs font-mono rounded-lg border border-gray-300 bg-white focus:outline-none focus:border-[#0073ea]"
            />

            <button
              type="submit"
              disabled={isSubmitting}
              data-testid="btn-add-status"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#00c875] hover:bg-[#00b067] text-white text-xs font-bold transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar etiqueta</span>
            </button>
          </div>

          {/* Paleta de 40 colores para nuevo estado */}
          {isNewStatusPaletteOpen && (
            <div className="p-3 bg-white rounded-xl border border-[#d0d4e4] space-y-2 animate-in fade-in duration-100">
              <span className="text-[11px] font-bold text-[#676879] uppercase tracking-wider">
                Seleccionar color para nueva etiqueta:
              </span>
              <div className="grid grid-cols-5 sm:grid-cols-8 gap-1.5">
                {MONDAY_COLOR_PALETTE.map((hex) => {
                  const isSelected = newColor.toLowerCase() === hex.toLowerCase();
                  return (
                    <button
                      key={hex}
                      type="button"
                      data-testid={`new-palette-color-${hex.replace('#', '')}`}
                      onClick={() => setNewColor(hex)}
                      className={`h-7 rounded-[3px] transition-transform hover:scale-105 cursor-pointer shadow-xs relative flex items-center justify-center ${
                        isSelected
                          ? 'ring-2 ring-offset-1 ring-[#323338] scale-105 z-10'
                          : 'opacity-90 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: hex }}
                    >
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-white drop-shadow-xs" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Barra de acciones finales */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <span className="text-xs text-[#676879]">
              Total: <strong>{statuses.length}</strong> etiquetas configuradas
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-xs font-semibold text-[#323338] cursor-pointer"
              >
                Cerrar
              </button>

              <button
                type="button"
                data-testid="btn-apply-status-changes"
                disabled={isSubmitting}
                onClick={() => void handleApplyAllChanges()}
                className="px-5 py-2 rounded-lg bg-[#0073ea] hover:bg-[#0060b9] text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
              >
                Aplicar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
