import React, { useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckSquare,
  GripVertical,
  MessageSquare,
  Plus,
  User as UserIcon,
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import {
  PRIORITY_MAP,
  type BoardDetailRead,
  type TaskItemRead,
} from '../../types';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getTodayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface KanbanViewProps {
  board: BoardDetailRead;
  filteredItems: TaskItemRead[];
}

export const KanbanView: React.FC<KanbanViewProps> = ({
  board,
  filteredItems,
}) => {
  const { createItem, updateItem, openItemDrawer } = useWorkspaceStore();

  const [draggedItemId, setDraggedItemId] = useState<number | null>(null);
  const [dragOverStatusKey, setDragOverStatusKey] = useState<string | null>(
    null,
  );
  const [quickAddByStatus, setQuickAddByStatus] = useState<
    Record<string, string>
  >({});

  const todayIso = getTodayIsoDate();

  const groupMap = new Map<number, { title: string; color: string }>();
  for (const g of board.groups) {
    groupMap.set(g.id, { title: g.title, color: g.color });
  }

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    itemId: number,
  ) => {
    setDraggedItemId(itemId);
    try {
      e.dataTransfer?.setData('text/plain', String(itemId));
      e.dataTransfer.effectAllowed = 'move';
    } catch {
      // En entornos de test (jsdom) dataTransfer puede ser sintético
    }
  };

  const handleDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    statusKey: string,
  ) => {
    e.preventDefault();
    if (dragOverStatusKey !== statusKey) {
      setDragOverStatusKey(statusKey);
    }
  };

  const handleDrop = async (
    e: React.DragEvent<HTMLDivElement>,
    targetStatusKey: string,
  ) => {
    e.preventDefault();
    setDragOverStatusKey(null);

    let resolvedId: number | null = draggedItemId;
    try {
      const fromTransfer = e.dataTransfer?.getData('text/plain');
      if (fromTransfer) {
        const parsed = Number(fromTransfer);
        if (!Number.isNaN(parsed)) {
          resolvedId = parsed;
        }
      }
    } catch {
      // Fallback a draggedItemId en estado React
    }

    setDraggedItemId(null);

    if (resolvedId === null) return;

    const targetItem = filteredItems.find((i) => i.id === resolvedId) ??
      board.groups.flatMap((g) => g.items).find((i) => i.id === resolvedId);

    if (!targetItem || targetItem.status_key === targetStatusKey) {
      return;
    }

    try {
      await updateItem(resolvedId, { status_key: targetStatusKey });
    } catch {
      // Rollback automático manejado por useWorkspaceStore
    }
  };

  const handleQuickAddCard = async (statusKey: string) => {
    const rawTitle = quickAddByStatus[statusKey] ?? '';
    const cleaned = rawTitle.trim();
    if (!cleaned) return;

    const defaultGroup = board.groups[0];
    if (!defaultGroup) return;

    setQuickAddByStatus((prev) => ({ ...prev, [statusKey]: '' }));
    try {
      await createItem(defaultGroup.id, {
        title: cleaned,
        status_key: statusKey,
      });
    } catch {
      setQuickAddByStatus((prev) => ({ ...prev, [statusKey]: rawTitle }));
    }
  };

  return (
    <div
      data-testid="kanban-board-view"
      className="flex gap-4 overflow-x-auto pb-4 pt-1 items-start"
    >
      {board.statuses.map((st) => {
        const columnItems = filteredItems.filter(
          (item) => item.status_key === st.key,
        );
        const isDragOver = dragOverStatusKey === st.key;

        return (
          <div
            key={st.id}
            data-testid={`kanban-column-${st.key}`}
            onDragOver={(e) => handleDragOver(e, st.key)}
            onDragLeave={() =>
              setDragOverStatusKey((prev) => (prev === st.key ? null : prev))
            }
            onDrop={(e) => void handleDrop(e, st.key)}
            className={`w-72 shrink-0 rounded-2xl bg-[#f7f8fa] border transition-all flex flex-col max-h-[calc(100vh-250px)] ${
              isDragOver
                ? 'border-[#0073ea] ring-2 ring-[#0073ea]/20 bg-[#f0f7ff]'
                : 'border-gray-200'
            }`}
          >
            {/* Cabecera de Columna con el color del Estado */}
            <div
              className="px-4 py-3 rounded-t-2xl text-white flex items-center justify-between"
              style={{ backgroundColor: st.color }}
            >
              <span className="font-bold text-xs tracking-wide uppercase truncate">
                {st.label}
              </span>
              <span
                data-testid={`kanban-column-count-${st.key}`}
                className="px-2 py-0.5 rounded-full bg-black/20 text-xs font-bold"
              >
                {columnItems.length}
              </span>
            </div>

            {/* Lista de Tarjetas Arrastrables */}
            <div className="p-3 space-y-2.5 overflow-y-auto flex-1 min-h-[120px]">
              {columnItems.map((item) => {
                const groupInfo = groupMap.get(item.group_id);
                const priorityMeta = PRIORITY_MAP[
                  item.priority.toLowerCase()
                ] ?? {
                  key: item.priority,
                  label: item.priority,
                  bgColor: '#579bfc',
                  textColor: '#ffffff',
                };

                const isOverdue =
                  Boolean(item.due_date) &&
                  item.due_date! < todayIso &&
                  item.status_key !== 'done';

                const commentsCount = item.comments_count ?? 0;
                const checklistTotal = item.checklist_total ?? 0;
                const checklistCompleted = item.checklist_completed ?? 0;

                return (
                  <div
                    key={item.id}
                    draggable
                    data-testid={`kanban-card-${item.id}`}
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    onDragEnd={() => {
                      setDraggedItemId(null);
                      setDragOverStatusKey(null);
                    }}
                    className={`group rounded-xl bg-white p-3.5 border border-gray-200 shadow-2xs hover:shadow-md hover:border-[#0073ea]/50 transition-all cursor-grab active:cursor-grabbing space-y-2.5 ${
                      draggedItemId === item.id ? 'opacity-50 scale-[0.98]' : ''
                    }`}
                  >
                    {/* Etiqueta del Grupo y Grip */}
                    <div className="flex items-center justify-between gap-2">
                      {groupInfo && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#676879] truncate">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: groupInfo.color }}
                          />
                          <span className="truncate">{groupInfo.title}</span>
                        </span>
                      )}
                      <GripVertical className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 shrink-0" />
                    </div>

                    {/* Título de la Tarjeta */}
                    <div
                      data-testid={`kanban-card-title-${item.id}`}
                      onClick={() => void openItemDrawer(item.id)}
                      className="text-sm font-semibold text-[#323338] hover:text-[#0073ea] transition-colors cursor-pointer leading-snug"
                    >
                      {item.title}
                    </div>

                    {item.notes && (
                      <p className="text-xs text-[#676879] line-clamp-2">
                        {item.notes}
                      </p>
                    )}

                    {/* Metadatos: Prioridad y Fecha límite */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold"
                        style={{
                          backgroundColor: priorityMeta.bgColor,
                          color: priorityMeta.textColor,
                        }}
                      >
                        {priorityMeta.label}
                      </span>

                      {item.due_date && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                            isOverdue
                              ? 'bg-red-100 text-[#e2445c]'
                              : 'bg-gray-100 text-[#323338]'
                          }`}
                        >
                          {isOverdue ? (
                            <AlertTriangle className="w-2.5 h-2.5" />
                          ) : (
                            <Calendar className="w-2.5 h-2.5 text-[#0073ea]" />
                          )}
                          <span>{item.due_date}</span>
                        </span>
                      )}
                    </div>

                    {/* Pie de Tarjeta: Responsable + Botones de Colaboración */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {item.assignee ? (
                          <>
                            <span
                              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                              style={{
                                backgroundColor:
                                  item.assignee.color || '#0073ea',
                              }}
                              title={item.assignee.full_name}
                            >
                              {getInitials(item.assignee.full_name)}
                            </span>
                            <span className="text-xs text-[#323338] font-medium truncate">
                              {item.assignee.full_name}
                            </span>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-[#676879]">
                            <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                            <span>Sin asignar</span>
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => void openItemDrawer(item.id)}
                        data-testid={`btn-open-drawer-${item.id}`}
                        aria-label={`Abrir detalle de ${item.title}`}
                        title="Ver comentarios, checklist y actividad"
                        className="inline-flex items-center gap-2 px-2 py-1 rounded-lg bg-[#f7f8fa] hover:bg-[#e6f1fd] text-[#676879] hover:text-[#0073ea] text-xs font-semibold transition-colors cursor-pointer shrink-0"
                      >
                        {checklistTotal > 0 && (
                          <span
                            data-testid={`task-checklist-badge-${item.id}`}
                            className={`inline-flex items-center gap-1 ${
                              checklistCompleted === checklistTotal
                                ? 'text-[#00c875]'
                                : ''
                            }`}
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span>
                              {checklistCompleted}/{checklistTotal}
                            </span>
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span data-testid={`task-comments-count-${item.id}`}>
                            {commentsCount}
                          </span>
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {columnItems.length === 0 && (
                <div className="py-8 px-3 text-center border border-dashed border-gray-200 rounded-xl text-xs text-[#676879]">
                  Arrastrá una tarea aquí
                </div>
              )}
            </div>

            {/* Creación rápida de tarjeta en la columna */}
            {board.groups.length > 0 && (
              <div className="p-2.5 border-t border-gray-200 bg-white/70 rounded-b-2xl">
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    data-testid={`kanban-quick-add-input-${st.key}`}
                    placeholder={`+ Agregar en ${st.label}...`}
                    aria-label={`Agregar tarea en estado ${st.label}`}
                    value={quickAddByStatus[st.key] ?? ''}
                    onChange={(e) =>
                      setQuickAddByStatus((prev) => ({
                        ...prev,
                        [st.key]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleQuickAddCard(st.key);
                      }
                    }}
                    className="flex-1 min-w-0 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#0073ea]"
                  />
                  <button
                    type="button"
                    onClick={() => void handleQuickAddCard(st.key)}
                    data-testid={`kanban-quick-add-submit-${st.key}`}
                    aria-label={`Confirmar tarea en ${st.label}`}
                    className="p-1.5 rounded-lg bg-[#0073ea] hover:bg-[#0060b9] text-white transition-colors cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

