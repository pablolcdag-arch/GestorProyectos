import React, { useState } from 'react';
import {
  Activity,
  Calendar,
  CheckSquare,
  MessageSquare,
  Plus,
  Send,
  Trash2,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { PRIORITY_MAP } from '../../types';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

type DrawerSectionTab = 'all' | 'comments' | 'checklist' | 'activity';

export const ItemDetailDrawer: React.FC = () => {
  const {
    activeBoard,
    activeItemDetail,
    isLoadingItemDetail,
    closeItemDrawer,
    addComment,
    removeComment,
    addChecklistItem,
    toggleOrUpdateChecklistItem,
    removeChecklistItem,
  } = useWorkspaceStore();

  const [activeTab, setActiveTab] = useState<DrawerSectionTab>('all');
  const [commentText, setCommentText] = useState('');
  const [checklistTitle, setChecklistTitle] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isSubmittingChecklist, setIsSubmittingChecklist] = useState(false);

  if (!activeItemDetail && !isLoadingItemDetail) {
    return null;
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItemDetail) return;
    const cleaned = commentText.trim();
    if (!cleaned) return;

    setIsSubmittingComment(true);
    try {
      await addComment(activeItemDetail.id, cleaned);
      setCommentText('');
    } catch {
      // Error gestionado en el store
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleAddChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItemDetail) return;
    const cleaned = checklistTitle.trim();
    if (!cleaned) return;

    setIsSubmittingChecklist(true);
    try {
      await addChecklistItem(activeItemDetail.id, cleaned);
      setChecklistTitle('');
    } catch {
      // Error gestionado en el store
    } finally {
      setIsSubmittingChecklist(false);
    }
  };

  const statusCfg = activeBoard?.statuses.find(
    (s) => s.key === activeItemDetail?.status_key,
  );
  const priorityMeta = activeItemDetail
    ? (PRIORITY_MAP[activeItemDetail.priority.toLowerCase()] ?? {
        key: activeItemDetail.priority,
        label: activeItemDetail.priority,
        bgColor: '#579bfc',
        textColor: '#ffffff',
      })
    : null;

  const checklistItems = activeItemDetail?.checklist_items ?? [];
  const totalChecklist = checklistItems.length;
  const completedChecklist = checklistItems.filter((c) => c.is_completed).length;
  const checklistPct =
    totalChecklist > 0
      ? Math.round((completedChecklist / totalChecklist) * 100)
      : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Detalle y colaboración de la tarea"
      data-testid="item-detail-drawer"
      className="fixed inset-0 z-50 flex justify-end bg-black/35 backdrop-blur-[1px]"
    >
      <div className="w-full max-w-xl bg-white h-full shadow-2xl border-l border-gray-200 flex flex-col overflow-hidden">
        {/* Cabecera del Drawer */}
        <div className="px-6 py-4 border-b border-gray-200 bg-[#f7f8fa] flex items-start justify-between gap-4">
          <div className="space-y-2 min-w-0 flex-1">
            <h2
              data-testid="drawer-item-title"
              className="text-lg font-bold text-[#323338] leading-snug break-words"
            >
              {activeItemDetail ? activeItemDetail.title : 'Cargando tarea...'}
            </h2>

            {activeItemDetail && (
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span
                  className="px-2.5 py-0.5 rounded-full text-white font-semibold"
                  style={{
                    backgroundColor: statusCfg?.color ?? '#c4c4c4',
                  }}
                >
                  {statusCfg?.label ?? activeItemDetail.status_key}
                </span>

                {priorityMeta && (
                  <span
                    className="px-2.5 py-0.5 rounded-full font-semibold"
                    style={{
                      backgroundColor: priorityMeta.bgColor,
                      color: priorityMeta.textColor,
                    }}
                  >
                    {priorityMeta.label}
                  </span>
                )}

                {activeItemDetail.assignee ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white border border-gray-200 text-[#323338] font-medium">
                    <span
                      className="w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                      style={{
                        backgroundColor:
                          activeItemDetail.assignee.color || '#0073ea',
                      }}
                    >
                      {getInitials(activeItemDetail.assignee.full_name)}
                    </span>
                    <span>{activeItemDetail.assignee.full_name}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-[#676879]">
                    <UserIcon className="w-3 h-3" />
                    <span>Sin asignar</span>
                  </span>
                )}

                {activeItemDetail.due_date && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-[#323338] font-medium">
                    <Calendar className="w-3 h-3 text-[#0073ea]" />
                    <span>{activeItemDetail.due_date}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={closeItemDrawer}
            data-testid="btn-close-item-drawer"
            aria-label="Cerrar panel de detalle"
            className="p-2 rounded-lg text-[#676879] hover:text-[#323338] hover:bg-gray-200/60 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas de navegación del Drawer */}
        <div className="px-6 py-2.5 border-b border-gray-200 bg-white flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            data-testid="drawer-tab-all"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'all'
                ? 'bg-[#0073ea] text-white'
                : 'text-[#676879] hover:bg-gray-100'
            }`}
          >
            Vista Completa
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('comments')}
            data-testid="drawer-tab-comments"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'comments'
                ? 'bg-[#0073ea] text-white'
                : 'text-[#676879] hover:bg-gray-100'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Comentarios ({activeItemDetail?.comments.length ?? 0})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('checklist')}
            data-testid="drawer-tab-checklist"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'checklist'
                ? 'bg-[#0073ea] text-white'
                : 'text-[#676879] hover:bg-gray-100'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>
              Checklist ({completedChecklist}/{totalChecklist})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            data-testid="drawer-tab-activity"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'activity'
                ? 'bg-[#0073ea] text-white'
                : 'text-[#676879] hover:bg-gray-100'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>
              Actividad ({activeItemDetail?.activities.length ?? 0})
            </span>
          </button>
        </div>

        {/* Contenido scrollable del Drawer */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoadingItemDetail && !activeItemDetail && (
            <p className="text-sm text-[#676879] text-center py-8">
              Cargando detalles de la tarea...
            </p>
          )}

          {activeItemDetail && (
            <>
              {/* SECCIÓN 1: CHECKLIST INTERNO CON BARRA DE PROGRESO */}
              {(activeTab === 'all' || activeTab === 'checklist') && (
                <section
                  data-testid="drawer-checklist-section"
                  className="bg-[#f7f8fa] rounded-2xl p-4 border border-gray-200 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-[#0073ea]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#323338]">
                        Checklist Interno
                      </h3>
                    </div>
                    <span
                      data-testid="drawer-checklist-progress"
                      className="text-xs font-bold text-[#0073ea]"
                    >
                      {completedChecklist}/{totalChecklist} ({checklistPct}%)
                    </span>
                  </div>

                  {/* Barra de progreso visual */}
                  <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      data-testid="drawer-checklist-progressbar"
                      className="h-full bg-[#00c875] transition-all duration-300"
                      style={{ width: `${checklistPct}%` }}
                    />
                  </div>

                  {/* Lista de ítems del checklist */}
                  <div className="space-y-1.5 pt-1">
                    {checklistItems.map((chk) => (
                      <div
                        key={chk.id}
                        data-testid={`checklist-item-${chk.id}`}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200"
                      >
                        <label className="flex items-center gap-2.5 flex-1 cursor-pointer min-w-0">
                          <input
                            type="checkbox"
                            checked={chk.is_completed}
                            data-testid={`checklist-toggle-${chk.id}`}
                            onChange={() =>
                              void toggleOrUpdateChecklistItem(chk.id, {
                                is_completed: !chk.is_completed,
                              })
                            }
                            className="w-4 h-4 rounded accent-[#00c875] cursor-pointer shrink-0"
                          />
                          <span
                            className={`text-xs font-medium truncate ${
                              chk.is_completed
                                ? 'line-through text-[#676879]'
                                : 'text-[#323338]'
                            }`}
                          >
                            {chk.title}
                          </span>
                        </label>

                        <button
                          type="button"
                          onClick={() => void removeChecklistItem(chk.id)}
                          data-testid={`btn-delete-checklist-${chk.id}`}
                          aria-label={`Eliminar subtarea ${chk.title}`}
                          className="p-1 rounded-md text-[#676879] hover:text-[#e2445c] hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {checklistItems.length === 0 && (
                      <p className="text-xs text-[#676879] italic py-1">
                        Sin subtareas aún. Agregá pasos para medir el avance.
                      </p>
                    )}
                  </div>

                  {/* Formulario para agregar nuevo ítem al checklist */}
                  <form
                    onSubmit={(e) => void handleAddChecklist(e)}
                    className="flex items-center gap-2 pt-1"
                  >
                    <input
                      type="text"
                      data-testid="drawer-checklist-input"
                      aria-label="Nuevo ítem de checklist"
                      placeholder="Agregar subtarea al checklist..."
                      value={checklistTitle}
                      onChange={(e) => setChecklistTitle(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:border-[#0073ea]"
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingChecklist}
                      data-testid="btn-add-checklist"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0073ea] hover:bg-[#0060b9] text-white text-xs font-semibold cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar ítem</span>
                    </button>
                  </form>
                </section>
              )}

              {/* SECCIÓN 2: COMENTARIOS Y ACTUALIZACIONES */}
              {(activeTab === 'all' || activeTab === 'comments') && (
                <section
                  data-testid="drawer-comments-section"
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#0073ea]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#323338]">
                      Comentarios ({activeItemDetail.comments.length})
                    </h3>
                  </div>

                  <form
                    onSubmit={(e) => void handleAddComment(e)}
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        data-testid="drawer-comment-input"
                        aria-label="Nuevo comentario"
                        placeholder="Escribí una actualización o comentario..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:border-[#0073ea]"
                      />
                      <button
                        type="submit"
                        disabled={isSubmittingComment}
                        data-testid="btn-add-comment"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0073ea] hover:bg-[#0060b9] text-white text-xs font-semibold cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Publicar comentario</span>
                      </button>
                    </div>
                  </form>

                  <div className="space-y-2.5">
                    {activeItemDetail.comments.map((comment) => (
                      <div
                        key={comment.id}
                        data-testid={`comment-item-${comment.id}`}
                        className="p-3.5 rounded-xl border border-gray-200 bg-white shadow-2xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                              style={{
                                backgroundColor:
                                  comment.author?.color || '#0073ea',
                              }}
                            >
                              {getInitials(
                                comment.author?.full_name || 'Usuario',
                              )}
                            </span>
                            <span className="text-xs font-bold text-[#323338]">
                              {comment.author?.full_name || 'Usuario'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => void removeComment(comment.id)}
                            data-testid={`btn-delete-comment-${comment.id}`}
                            aria-label="Eliminar comentario"
                            className="p-1 rounded-md text-[#676879] hover:text-[#e2445c] hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <p className="text-xs text-[#323338] leading-relaxed pl-8">
                          {comment.content}
                        </p>
                      </div>
                    ))}

                    {activeItemDetail.comments.length === 0 && (
                      <p className="text-xs text-[#676879] italic py-2">
                        Aún no hay comentarios en esta tarea.
                      </p>
                    )}
                  </div>
                </section>
              )}

              {/* SECCIÓN 3: HISTORIAL DE ACTIVIDAD */}
              {(activeTab === 'all' || activeTab === 'activity') && (
                <section
                  data-testid="drawer-activity-section"
                  className="space-y-3 border-t border-gray-200 pt-4"
                >
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#0073ea]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#323338]">
                      Historial de Actividad ({activeItemDetail.activities.length})
                    </h3>
                  </div>

                  <div
                    data-testid="drawer-activity-list"
                    className="space-y-2"
                  >
                    {activeItemDetail.activities.map((act) => (
                      <div
                        key={act.id}
                        data-testid={`activity-item-${act.id}`}
                        className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#f7f8fa] border border-gray-100 text-xs"
                      >
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5"
                          style={{
                            backgroundColor: act.user?.color || '#676879',
                          }}
                        >
                          {getInitials(act.user?.full_name || 'Sistema')}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[#323338]">
                            <span className="font-semibold">
                              {act.user?.full_name || 'Sistema'}:{' '}
                            </span>
                            <span>{act.description}</span>
                          </p>
                        </div>
                      </div>
                    ))}

                    {activeItemDetail.activities.length === 0 && (
                      <p className="text-xs text-[#676879] italic">
                        Sin actividad registrada todavía.
                      </p>
                    )}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

