import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  FileText,
  ListPlus,
  Loader2,
  Send,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { api } from '../../services/api';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import type { AIActionType, AIPromptResponse } from '../../types';

export const AIAssistantBar: React.FC = () => {
  const { activeBoard, selectBoard } = useWorkspaceStore();

  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [actionType, setActionType] = useState<AIActionType>('generate_tasks');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState<AIPromptResponse | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    inputRef.current?.focus();

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        // Ignorar clics sobre el botón de la píldora para evitar toggle instantáneo
        const pill = document.querySelector('[data-testid="btn-ai-assistant-pill"]');
        if (pill && pill.contains(e.target as Node)) return;
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSubmit = async (e?: React.FormEvent, overridePrompt?: string, overrideAction?: AIActionType) => {
    if (e) e.preventDefault();
    const finalPrompt = (overridePrompt ?? prompt).trim();
    if (!finalPrompt || isProcessing) return;

    let finalAction = overrideAction ?? actionType;
    if (!overrideAction) {
      const lower = finalPrompt.toLowerCase();
      if (lower.includes('resum') || lower.includes('balance') || lower.includes('presupuesto')) {
        finalAction = 'summarize_board';
      } else if (lower.includes('checklist') || lower.includes('desglos') || lower.includes('divid')) {
        finalAction = 'breakdown_checklist';
      }
    }

    setIsProcessing(true);
    setError(null);
    setLastResponse(null);

    try {
      const res = await api.askAI({
        prompt: finalPrompt,
        board_id: activeBoard?.id,
        action_type: finalAction,
      });

      setLastResponse(res);
      setPrompt('');

      // Si se generaron tareas o fue generate_tasks, refrescar el tablero para que impacte en vivo
      if (
        (res.action_type === 'generate_tasks' || res.created_tasks_count > 0) &&
        activeBoard?.id
      ) {
        await selectBoard(activeBoard.id);
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Error al comunicarse con el asistente de IA.';
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChipClick = (chipPrompt: string, chipAction: AIActionType) => {
    setPrompt(chipPrompt);
    setActionType(chipAction);
    void handleSubmit(undefined, chipPrompt, chipAction);
  };

  const handleCopySummary = async () => {
    const textToCopy = lastResponse?.summary_text || lastResponse?.message || '';
    if (!textToCopy) return;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      }
    } catch {
      // Ignorar errores en entornos con permisos restringidos
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!activeBoard) {
    return null;
  }

  return (
    <>
      {/* Píldora Flotante Inferior (1:1 Monday.com) */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          data-testid="btn-ai-assistant-pill"
          aria-expanded={isOpen}
          aria-label="Abrir asistente de IA Sidekick"
          className="shadow-lg border border-gray-200/80 bg-white/95 backdrop-blur-md rounded-full px-5 py-2.5 flex items-center gap-2.5 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all group"
        >
          {/* Icono con degradado multicolor estilo Monday Sidekick */}
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-tr from-[#00c875] via-[#0073ea] to-[#a25ddc] p-0.5">
            <span className="w-full h-full bg-white rounded-full flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-[#0073ea]" />
            </span>
          </span>

          <span className="text-xs font-semibold text-[#323338] tracking-tight group-hover:text-[#0073ea] transition-colors">
            Preguntar, crear, analizar
          </span>

          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-[#0073ea] font-bold border border-blue-100">
            Sidekick
          </span>
        </button>
      </div>

      {/* Panel Expandible de Interacción con IA */}
      {isOpen && (
        <div
          ref={panelRef}
          data-testid="ai-assistant-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Sidekick Asistente de IA"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[480px] max-w-[95vw] bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          {/* Cabecera del Panel */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-tr from-[#00c875] via-[#0073ea] to-[#a25ddc] text-white p-1">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-[#323338] leading-tight">
                  Sidekick AI
                </h3>
                <p className="text-[11px] text-[#676879]">
                  Tablero: {activeBoard.name}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              data-testid="btn-close-ai-panel"
              aria-label="Cerrar panel de IA"
              className="p-1.5 rounded-lg text-[#676879] hover:text-[#323338] hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Formulario de Prompt */}
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Pedile a la IA: 'Crear 4 tareas para lanzamiento', 'Resumir este tablero'..."
                data-testid="input-ai-prompt"
                disabled={isProcessing}
                className="w-full pl-3.5 pr-10 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#0073ea] focus:ring-2 focus:ring-[#0073ea]/20 placeholder-gray-400 text-[#323338]"
              />
              <button
                type="submit"
                disabled={isProcessing || !prompt.trim()}
                data-testid="btn-send-ai-prompt"
                aria-label="Enviar prompt a la IA"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-[#0073ea] text-white hover:bg-[#0060c0] disabled:opacity-40 disabled:hover:bg-[#0073ea] transition-all cursor-pointer"
              >
                {isProcessing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Chips de Sugerencias Rápidas */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#676879]">
                Sugerencias rápidas con 1 clic:
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    handleChipClick(
                      'Crear tareas de lanzamiento',
                      'generate_tasks',
                    )
                  }
                  data-testid="chip-ai-generate-tasks"
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50 hover:bg-[#f0f7ff] text-[11px] font-medium text-[#323338] border border-gray-200 hover:border-[#0073ea]/40 hover:text-[#0073ea] transition-all cursor-pointer"
                >
                  <Zap className="w-3 h-3 text-[#fdab3d]" />
                  <span>Crear tareas de lanzamiento</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleChipClick(
                      'Resumir estado y presupuesto',
                      'summarize_board',
                    )
                  }
                  data-testid="chip-ai-summarize-board"
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50 hover:bg-[#f0f7ff] text-[11px] font-medium text-[#323338] border border-gray-200 hover:border-[#0073ea]/40 hover:text-[#0073ea] transition-all cursor-pointer"
                >
                  <FileText className="w-3 h-3 text-[#0073ea]" />
                  <span>Resumir estado y presupuesto</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleChipClick(
                      'Dividir en checklist de entregables',
                      'breakdown_checklist',
                    )
                  }
                  data-testid="chip-ai-breakdown-checklist"
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50 hover:bg-[#f0f7ff] text-[11px] font-medium text-[#323338] border border-gray-200 hover:border-[#0073ea]/40 hover:text-[#0073ea] transition-all cursor-pointer"
                >
                  <ListPlus className="w-3 h-3 text-[#00c875]" />
                  <span>Dividir en checklist de entregables</span>
                </button>
              </div>
            </div>
          </form>

          {/* Mensaje de Error */}
          {error && (
            <div
              data-testid="ai-error-banner"
              className="mt-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs"
            >
              {error}
            </div>
          )}

          {/* Tarjeta de Respuesta de la IA */}
          {lastResponse && (
            <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
              {/* Mensaje / Toast de Éxito */}
              <div
                data-testid="ai-response-message"
                className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{lastResponse.message}</span>
                </div>
                {lastResponse.created_tasks_count > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-200/60 text-emerald-900 text-[10px] font-bold">
                    +{lastResponse.created_tasks_count} tareas
                  </span>
                )}
              </div>

              {/* Tarjeta de Resumen Ejecutivo con botón para copiar */}
              {(lastResponse.summary_text ||
                lastResponse.action_type === 'summarize_board') && (
                <div
                  data-testid="ai-summary-card"
                  className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-2 text-xs text-[#323338]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] uppercase tracking-wider text-[#676879]">
                      Resumen Ejecutivo del Tablero
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleCopySummary()}
                      data-testid="btn-copy-summary"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-[#0073ea] hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-[#00c875]" />
                          <span>¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="whitespace-pre-line leading-relaxed text-[#323338]">
                    {lastResponse.summary_text || lastResponse.message}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};
