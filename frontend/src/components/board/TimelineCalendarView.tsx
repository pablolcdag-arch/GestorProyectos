import React from 'react';
import {
  AlertTriangle,
  CalendarRange,
  CheckSquare,
  Clock,
  MessageSquare,
  User as UserIcon,
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import {
  PRIORITY_MAP,
  type BoardDetailRead,
  type BoardStatusRead,
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

function parseIsoDateMs(iso?: string | null): number | null {
  if (!iso) return null;
  const parsed = Date.parse(`${iso}T00:00:00Z`);
  return Number.isNaN(parsed) ? null : parsed;
}

function calculateDurationDays(
  startDate?: string | null,
  dueDate?: string | null,
): number | null {
  const startMs = parseIsoDateMs(startDate);
  const dueMs = parseIsoDateMs(dueDate);
  if (startMs === null && dueMs === null) return null;
  if (startMs !== null && dueMs !== null) {
    const diff = Math.round((dueMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
  }
  return 1;
}

interface TimelineCalendarViewProps {
  board: BoardDetailRead;
  filteredItems: TaskItemRead[];
}

export const TimelineCalendarView: React.FC<TimelineCalendarViewProps> = ({
  board,
  filteredItems,
}) => {
  const { updateItem, openItemDrawer } = useWorkspaceStore();

  const todayIso = getTodayIsoDate();

  const statusMap = new Map<string, BoardStatusRead>();
  for (const st of board.statuses) {
    statusMap.set(st.key, st);
  }

  const groupMap = new Map<number, { title: string; color: string }>();
  for (const g of board.groups) {
    groupMap.set(g.id, { title: g.title, color: g.color });
  }

  // Calcular ventana global de fechas para posicionar las barras Gantt proporcionalmente
  const allTimestamps: number[] = [];
  for (const item of filteredItems) {
    const s = parseIsoDateMs(item.start_date);
    const d = parseIsoDateMs(item.due_date);
    if (s !== null) allTimestamps.push(s);
    if (d !== null) allTimestamps.push(d);
  }

  const todayMs = parseIsoDateMs(todayIso) ?? Date.now();
  const minWindowMs =
    allTimestamps.length > 0
      ? Math.min(...allTimestamps) - 2 * 86400000
      : todayMs - 7 * 86400000;
  const maxWindowMs =
    allTimestamps.length > 0
      ? Math.max(...allTimestamps) + 4 * 86400000
      : todayMs + 21 * 86400000;
  const totalWindowSpan = Math.max(86400000, maxWindowMs - minWindowMs);

  return (
    <div
      data-testid="timeline-calendar-view"
      className="space-y-4 bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden"
    >
      {/* Cabecera de la Vista Cronograma */}
      <div className="px-5 py-4 bg-[#f7f8fa] border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#e6f1fd] text-[#0073ea] flex items-center justify-center">
            <CalendarRange className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#323338]">
              Cronograma y Rango Temporal de Tareas (Gantt / Timeline)
            </h2>
            <p className="text-xs text-[#676879]">
              Planificá fechas de inicio y vencimiento con visualización de
              duración por estado.
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs font-semibold text-[#323338]">
          <Clock className="w-3.5 h-3.5 text-[#0073ea]" />
          <span>{filteredItems.length} tareas en cronograma</span>
        </span>
      </div>

      {/* Tabla / Grilla de Cronograma */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-[#fafbfc] border-b border-gray-200 text-[11px] font-bold uppercase tracking-wider text-[#676879]">
              <th className="py-2.5 px-4 min-w-[250px]">Tarea y Grupo</th>
              <th className="py-2.5 px-3 w-40 border-l border-gray-200">
                Responsable
              </th>
              <th className="py-2.5 px-3 w-40 text-center border-l border-gray-200">
                Fecha Inicio
              </th>
              <th className="py-2.5 px-3 w-40 text-center border-l border-gray-200">
                Fecha Límite
              </th>
              <th className="py-2.5 px-3 w-24 text-center border-l border-gray-200">
                Duración
              </th>
              <th className="py-2.5 px-4 min-w-[260px] border-l border-gray-200">
                Línea de Tiempo Visual
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 text-sm">
            {filteredItems.map((item) => {
              const statusCfg = statusMap.get(item.status_key);
              const statusColor = statusCfg?.color ?? '#0073ea';
              const statusLabel = statusCfg?.label ?? item.status_key;
              const groupInfo = groupMap.get(item.group_id);

              const priorityMeta = PRIORITY_MAP[item.priority.toLowerCase()] ?? {
                key: item.priority,
                label: item.priority,
                bgColor: '#579bfc',
                textColor: '#ffffff',
              };

              const durationDays = calculateDurationDays(
                item.start_date,
                item.due_date,
              );

              const isOverdue =
                Boolean(item.due_date) &&
                item.due_date! < todayIso &&
                item.status_key !== 'done';

              const startMs =
                parseIsoDateMs(item.start_date) ??
                parseIsoDateMs(item.due_date);
              const endMs =
                parseIsoDateMs(item.due_date) ??
                parseIsoDateMs(item.start_date);

              let barLeftPct = 5;
              let barWidthPct = 20;
              if (startMs !== null && endMs !== null) {
                const effectiveStart = Math.min(startMs, endMs);
                const effectiveEnd = Math.max(startMs, endMs) + 86400000;
                barLeftPct = Math.max(
                  2,
                  Math.min(
                    88,
                    ((effectiveStart - minWindowMs) / totalWindowSpan) * 100,
                  ),
                );
                barWidthPct = Math.max(
                  10,
                  Math.min(
                    96 - barLeftPct,
                    ((effectiveEnd - effectiveStart) / totalWindowSpan) * 100,
                  ),
                );
              }

              const commentsCount = item.comments_count ?? 0;
              const checklistTotal = item.checklist_total ?? 0;
              const checklistCompleted = item.checklist_completed ?? 0;

              return (
                <tr
                  key={item.id}
                  data-testid={`timeline-row-${item.id}`}
                  className="hover:bg-[#f5f9ff] transition-colors"
                >
                  {/* Tarea y Grupo */}
                  <td className="py-3 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {groupInfo && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#676879]">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: groupInfo.color }}
                              />
                              <span>{groupInfo.title}</span>
                            </span>
                          )}
                          <span
                            className="px-1.5 py-0.2 rounded text-[10px] font-bold"
                            style={{
                              backgroundColor: priorityMeta.bgColor,
                              color: priorityMeta.textColor,
                            }}
                          >
                            {priorityMeta.label}
                          </span>
                        </div>

                        <div
                          onClick={() => void openItemDrawer(item.id)}
                          className="font-semibold text-[#323338] hover:text-[#0073ea] cursor-pointer leading-snug"
                        >
                          {item.title}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => void openItemDrawer(item.id)}
                        data-testid={`btn-open-drawer-${item.id}`}
                        aria-label={`Abrir detalle de ${item.title}`}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-gray-200 bg-white hover:border-[#0073ea] text-xs font-semibold text-[#676879] hover:text-[#0073ea] transition-colors cursor-pointer shrink-0"
                      >
                        {checklistTotal > 0 && (
                          <span className="inline-flex items-center gap-0.5">
                            <CheckSquare className="w-3 h-3" />
                            <span>
                              {checklistCompleted}/{checklistTotal}
                            </span>
                          </span>
                        )}
                        <span className="inline-flex items-center gap-0.5">
                          <MessageSquare className="w-3 h-3" />
                          <span>{commentsCount}</span>
                        </span>
                      </button>
                    </div>
                  </td>

                  {/* Responsable */}
                  <td className="py-2.5 px-3 border-l border-gray-100">
                    {item.assignee ? (
                      <div className="flex items-center gap-2">
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                          style={{
                            backgroundColor: item.assignee.color || '#0073ea',
                          }}
                        >
                          {getInitials(item.assignee.full_name)}
                        </span>
                        <span className="text-xs font-medium text-[#323338] truncate">
                          {item.assignee.full_name}
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-[#676879]">
                        <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                        <span>Sin asignar</span>
                      </span>
                    )}
                  </td>

                  {/* Fecha Inicio Editable Inline */}
                  <td className="py-2.5 px-3 border-l border-gray-100 text-center">
                    <input
                      type="date"
                      data-testid={`timeline-startdate-input-${item.id}`}
                      aria-label={`Fecha de inicio de ${item.title}`}
                      value={item.start_date ?? ''}
                      onChange={(e) =>
                        void updateItem(item.id, {
                          start_date: e.target.value || null,
                        })
                      }
                      className="text-xs font-medium rounded-md px-2 py-1 border border-gray-200 bg-white text-[#323338] focus:outline-none focus:border-[#0073ea] cursor-pointer"
                    />
                  </td>

                  {/* Fecha Límite Editable Inline */}
                  <td className="py-2.5 px-3 border-l border-gray-100 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <input
                        type="date"
                        data-testid={`timeline-duedate-input-${item.id}`}
                        aria-label={`Fecha límite en cronograma de ${item.title}`}
                        value={item.due_date ?? ''}
                        onChange={(e) =>
                          void updateItem(item.id, {
                            due_date: e.target.value || null,
                          })
                        }
                        className={`text-xs font-medium rounded-md px-2 py-1 border focus:outline-none focus:border-[#0073ea] cursor-pointer ${
                          isOverdue
                            ? 'border-red-300 bg-red-50 text-[#e2445c] font-semibold'
                            : 'border-gray-200 bg-white text-[#323338]'
                        }`}
                      />
                      {isOverdue && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#e2445c]">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          <span>Vencida</span>
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Duración en Días */}
                  <td className="py-2.5 px-3 border-l border-gray-100 text-center">
                    <span
                      data-testid={`timeline-duration-${item.id}`}
                      className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-[#323338] text-xs font-bold"
                    >
                      {durationDays !== null ? `${durationDays} d` : '—'}
                    </span>
                  </td>

                  {/* Barra Gantt / Línea de Tiempo */}
                  <td className="py-2.5 px-4 border-l border-gray-100">
                    <div className="relative w-full h-7 rounded-lg bg-[#f5f6f8] border border-gray-200/80 overflow-hidden flex items-center">
                      {startMs !== null ? (
                        <div
                          data-testid={`timeline-bar-${item.id}`}
                          className="absolute h-5 rounded-md text-[10px] font-bold text-white px-2 flex items-center justify-between shadow-2xs truncate transition-all"
                          style={{
                            left: `${barLeftPct}%`,
                            width: `${barWidthPct}%`,
                            backgroundColor: statusColor,
                          }}
                          title={`${statusLabel}: ${item.start_date || item.due_date} → ${item.due_date || item.start_date}`}
                        >
                          <span className="truncate">{statusLabel}</span>
                          {item.estimated_hours ? (
                            <span className="ml-1 opacity-90">
                              {item.estimated_hours}h
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#676879] italic px-3">
                          Sin fechas asignadas
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredItems.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="py-8 text-center text-xs text-[#676879] italic"
                >
                  No hay tareas para mostrar en el cronograma con los filtros
                  actuales.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

