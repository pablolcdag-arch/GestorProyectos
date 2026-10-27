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

    const targetItem =
      filteredItems.find((i) => i.id === resolvedId) ??
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
      className="flex gap-4 overflow-x-auto pb-6 pt-2 items-start"
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
            className={`w-72 shrink-0 rounded-2xl bg-[#f7f8fa] border transition-all flex flex-col max-h-[calc(100vh-220px)] ${
              isDragOver
                ? 'border-[#0073ea] ring-2 ring-[#0073ea]/20 bg-[#f0f7ff]'
                : 'border-gray-200'
            }`}
          >
            {/* Cabecera de Columna 1:1 Monday.com con banda o píldora en color exacto */}
            <div
              className="px-4 py-3 rounded-t-2xl text-white flex items-center justify-between shadow-2xs"
              style={{ backgroundColor: st.color }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold text-xs tracking-wider uppercase truncate">
                  {st.label}
                </span>
              </div>
              <span
                data-testid={`kanban-column-count-${st.key}`}
                className="px-2 py-0.5 rounded-full bg-black/20 text-xs font-bold"
              >
                {columnItems.length}
              </span>
            </div>

            {/* Lista de Tarjetas Kanban Refinadas */}
            <div className="p-3 space-y-2.5 overflow-y-auto flex-1 min-h-[140px]">
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
                    className={`group rounded-lg bg-white p-3.5 border border-gray-200 border-l-4 shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing space-y-2.5 relative ${
                      draggedItemId === item.id ? 'opacity-50 scale-[0.98]' : ''
                    }`}
                    style={{
                      borderLeftColor: priorityMeta.bgColor,
                    }}
                  >
                    {/* Fila Superior: Grupo + Micro-píldora Prioridad + Grip */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {groupInfo && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#676879] truncate">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: groupInfo.color }}
                            />
                            <span className="truncate">{groupInfo.title}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Micro-píldora de Prioridad */}
                        <span
                          data-testid={`kanban-card-priority-${item.id}`}
                          className="px-2 py-0.5 rounded text-[10px] font-bold shadow-2xs"
                          style={{
                            backgroundColor: priorityMeta.bgColor,
                            color: priorityMeta.textColor,
                          }}
                        >
                          {priorityMeta.label}
                        </span>
                        <GripVertical className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 shrink-0" />
                      </div>
                    </div>

                    {/* Título de la Tarjeta (Click abre Drawer lateral) */}
                    <div
                      data-testid={`kanban-card-title-${item.id}`}
                      onClick={() => void openItemDrawer(item.id)}
                      className="text-sm font-semibold text-[#323338] hover:text-[#0073ea] transition-colors cursor-pointer leading-snug break-words"
                    >
                      {item.title}
                    </div>

                    {item.notes && (
                      <p className="text-xs text-[#676879] line-clamp-2 leading-relaxed">
                        {item.notes}
                      </p>
                    )}

                    {/* Fecha de vencimiento (con alerta visual si está atrasada) */}
                    {item.due_date && (
                      <div className="pt-0.5">
                        <span
                          data-testid={`kanban-card-due-date-${item.id}`}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                            isOverdue
                              ? 'bg-red-50 text-[#e2445c] border border-red-200 font-bold'
                              : 'bg-gray-100 text-[#323338]'
                          }`}
                        >
                          {isOverdue ? (
                            <AlertTriangle className="w-3 h-3 text-[#e2445c]" />
                          ) : (
                            <Calendar className="w-3 h-3 text-[#0073ea]" />
                          )}
                          <span>{item.due_date}</span>
                        </span>
                      </div>
                    )}

                    {/* Pie de Tarjeta: Checklist, Comentarios y Avatar de asignación */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => void openItemDrawer(item.id)}
                        data-testid={`btn-open-drawer-${item.id}`}
                        aria-label={`Abrir detalle de ${item.title}`}
                        title="Ver comentarios, checklist y actividad"
                        className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-[#f7f8fa] hover:bg-[#e6f1fd] text-[#676879] hover:text-[#0073ea] text-xs font-semibold transition-colors cursor-pointer shrink-0"
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

                      {/* Avatar redondo en la esquina inferior derecha */}
                      <div className="shrink-0">
                        {item.assignee ? (
                          <div
                            data-testid={`kanban-card-assignee-${item.id}`}
                            title={item.assignee.full_name}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-2xs border-2 border-white ring-1 ring-gray-200"
                            style={{
                              backgroundColor:
                                item.assignee.color || '#0073ea',
                            }}
                          >
                            {getInitials(item.assignee.full_name)}
                          </div>
                        ) : (
                          <div
                            data-testid={`kanban-card-assignee-${item.id}`}
                            title="Sin asignar"
                            className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-[#676879]"
                          >
                            <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                        )}
                      </div>
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
              <div className="p-2.5 border-t border-gray-200 bg-white/80 rounded-b-2xl">
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

                {/* Botón rápido "+ Agregar tarea" */}
                <button
                  type="button"
                  data-testid={`kanban-quick-add-btn-${st.key}`}
                  onClick={() => {
                    const inputEl = document.querySelector(
                      `[data-testid="kanban-quick-add-input-${st.key}"]`,
                    ) as HTMLInputElement | null;
                    inputEl?.focus();
                  }}
                  className="mt-1 text-[11px] text-[#676879] hover:text-[#0073ea] font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Agregar tarea</span>
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
