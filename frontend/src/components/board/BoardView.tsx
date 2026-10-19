import React, { useState } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  Layers,
  Palette,
  User as UserIcon,
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import {
  PRIORITY_MAP,
  type BoardStatusRead,
  type TaskGroupRead,
} from '../../types';
import { StatusManagerModal } from './StatusManagerModal';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const BoardView: React.FC = () => {
  const { activeBoard, isLoadingBoard, toggleGroupCollapse } =
    useWorkspaceStore();
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  if (isLoadingBoard && !activeBoard) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-sm text-[#676879]">
        Cargando tablero...
      </div>
    );
  }

  if (!activeBoard) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 text-[#676879] flex items-center justify-center mb-3">
          <FolderKanban className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-[#323338]">
          No hay ningún tablero seleccionado
        </h2>
        <p className="text-sm text-[#676879] mt-1 max-w-md">
          Seleccioná un tablero desde la barra lateral o creá uno nuevo con el botón{' '}
          <span className="font-semibold text-[#323338]">+ Nuevo Tablero</span>.
        </p>
      </div>
    );
  }

  const statusMap = new Map<string, BoardStatusRead>();
  for (const st of activeBoard.statuses) {
    statusMap.set(st.key, st);
  }

  const allItems = activeBoard.groups.flatMap((g) => g.items);

  return (
    <main className="flex-1 overflow-y-auto bg-white p-6 space-y-6">
      {/* Cabecera del Tablero */}
      <div className="border-b border-gray-200 pb-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1
                data-testid="active-board-title"
                className="text-2xl font-bold text-[#323338] tracking-tight"
              >
                {activeBoard.name}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#f0f7ff] text-[#0073ea]">
                <Layers className="w-3.5 h-3.5" />
                <span>{allItems.length} tareas</span>
              </span>
            </div>
            {activeBoard.description && (
              <p className="text-sm text-[#676879] mt-1">
                {activeBoard.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsStatusModalOpen(true)}
              data-testid="btn-open-status-modal"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0073ea] hover:bg-[#0060b9] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Palette className="w-4 h-4" />
              <span>Personalizar Estados</span>
            </button>
          </div>
        </div>

        {/* Píldoras resumen de los estados activos del tablero */}
        <div
          aria-label="Resumen de estados del tablero"
          className="flex items-center gap-2 flex-wrap"
        >
          <span className="text-xs font-semibold text-[#676879] mr-1">
            Estados activos:
          </span>
          {activeBoard.statuses.map((st) => {
            const count = allItems.filter(
              (item) => item.status_key === st.key,
            ).length;
            return (
              <span
                key={st.id}
                data-testid={`board-status-pill-${st.key}`}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white shadow-2xs"
                style={{ backgroundColor: st.color }}
              >
                <span>{st.label}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px]">
                  {count}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Grupos desplegables del Tablero */}
      <div className="space-y-8">
        {activeBoard.groups.map((group: TaskGroupRead) => {
          const totalGroupItems = group.items.length;

          return (
            <section
              key={group.id}
              data-testid={`task-group-${group.id}`}
              className="space-y-2"
            >
              {/* Cabecera del Grupo */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => toggleGroupCollapse(group.id)}
                  data-testid={`toggle-group-${group.id}`}
                  className="flex items-center gap-2 text-left group cursor-pointer"
                >
                  <span
                    className="p-1 rounded-md text-white transition-transform"
                    style={{ backgroundColor: group.color }}
                  >
                    {group.collapsed ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </span>
                  <h2
                    className="text-base font-bold tracking-tight"
                    style={{ color: group.color }}
                  >
                    {group.title}
                  </h2>
                  <span className="text-xs text-[#676879] font-medium ml-1">
                    ({totalGroupItems}{' '}
                    {totalGroupItems === 1 ? 'tarea' : 'tareas'})
                  </span>
                </button>
              </div>

              {/* Tabla de Filas (Items) estilo Monday Work OS */}
              {!group.collapsed && (
                <div
                  className="rounded-xl border border-gray-200 overflow-hidden shadow-2xs bg-white"
                  style={{
                    borderLeftWidth: '6px',
                    borderLeftColor: group.color,
                  }}
                >
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="bg-[#f7f8fa] border-b border-gray-200 text-[11px] font-bold uppercase tracking-wider text-[#676879]">
                          <th className="py-2.5 px-4 min-w-[260px]">Tarea</th>
                          <th className="py-2.5 px-4 w-48 text-center border-l border-gray-200">
                            Responsable
                          </th>
                          <th className="py-2.5 px-4 w-44 text-center border-l border-gray-200">
                            Estado
                          </th>
                          <th className="py-2.5 px-4 w-36 text-center border-l border-gray-200">
                            Prioridad
                          </th>
                          <th className="py-2.5 px-4 w-36 text-center border-l border-gray-200">
                            Fecha límite
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 text-sm">
                        {group.items.map((item) => {
                          const statusCfg = statusMap.get(item.status_key);
                          const statusLabel =
                            statusCfg?.label ?? item.status_key;
                          const statusColor = statusCfg?.color ?? '#c4c4c4';

                          const priorityMeta = PRIORITY_MAP[
                            item.priority.toLowerCase()
                          ] ?? {
                            key: item.priority,
                            label: item.priority,
                            bgColor: '#579bfc',
                            textColor: '#ffffff',
                          };

                          return (
                            <tr
                              key={item.id}
                              data-testid={`task-row-${item.id}`}
                              className="hover:bg-[#f5f9ff] transition-colors"
                            >
                              {/* Columna 1: Tarea */}
                              <td className="py-3 px-4">
                                <div className="font-medium text-[#323338]">
                                  {item.title}
                                </div>
                                {item.notes && (
                                  <div className="text-xs text-[#676879] mt-0.5 line-clamp-1">
                                    {item.notes}
                                  </div>
                                )}
                              </td>

                              {/* Columna 2: Responsable */}
                              <td className="py-2.5 px-4 border-l border-gray-100">
                                {item.assignee ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <span
                                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-2xs"
                                      style={{
                                        backgroundColor:
                                          item.assignee.color || '#0073ea',
                                      }}
                                    >
                                      {getInitials(item.assignee.full_name)}
                                    </span>
                                    <span className="text-xs font-medium text-[#323338] truncate max-w-[110px]">
                                      {item.assignee.full_name}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-1.5 text-xs text-[#676879]">
                                    <UserIcon className="w-4 h-4 text-gray-400" />
                                    <span>Sin asignar</span>
                                  </div>
                                )}
                              </td>

                              {/* Columna 3: Estado (Píldora Monday) */}
                              <td className="p-1.5 border-l border-gray-100">
                                <div
                                  data-testid={`task-status-badge-${item.id}`}
                                  className="w-full py-2 px-3 rounded-md text-center text-xs font-semibold text-white shadow-2xs truncate"
                                  style={{ backgroundColor: statusColor }}
                                >
                                  {statusLabel}
                                </div>
                              </td>

                              {/* Columna 4: Prioridad */}
                              <td className="p-1.5 border-l border-gray-100">
                                <div
                                  className="w-full py-2 px-3 rounded-md text-center text-xs font-semibold shadow-2xs"
                                  style={{
                                    backgroundColor: priorityMeta.bgColor,
                                    color: priorityMeta.textColor,
                                  }}
                                >
                                  {priorityMeta.label}
                                </div>
                              </td>

                              {/* Columna 5: Fecha límite */}
                              <td className="py-2.5 px-4 border-l border-gray-100 text-center">
                                {item.due_date ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-xs font-medium text-[#323338]">
                                    <Calendar className="w-3.5 h-3.5 text-[#0073ea]" />
                                    <span>{item.due_date}</span>
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">
                                    —
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}

                        {group.items.length === 0 && (
                          <tr>
                            <td
                              colSpan={5}
                              className="py-5 px-4 text-center text-xs text-[#676879] italic"
                            >
                              Este grupo aún no tiene tareas registradas.
                            </td>
                          </tr>
                        )}
                      </tbody>

                      {/* Fila inferior de resumen visual con barra proporcional de estados */}
                      {group.items.length > 0 && (
                        <tfoot>
                          <tr className="bg-[#fafbfc] border-t border-gray-200">
                            <td
                              colSpan={2}
                              className="py-2.5 px-4 text-right text-xs font-semibold text-[#676879]"
                            >
                              Progreso del grupo ({totalGroupItems}{' '}
                              {totalGroupItems === 1 ? 'tarea' : 'tareas'})
                            </td>
                            <td className="p-2 border-l border-gray-200">
                              <div
                                aria-label={`Barra de distribución de estados de ${group.title}`}
                                className="w-full h-5 rounded-md overflow-hidden flex bg-gray-200"
                              >
                                {activeBoard.statuses.map((st) => {
                                  const count = group.items.filter(
                                    (i) => i.status_key === st.key,
                                  ).length;
                                  if (count === 0) return null;
                                  const pct = (count / totalGroupItems) * 100;
                                  return (
                                    <div
                                      key={st.id}
                                      title={`${st.label}: ${count} (${Math.round(pct)}%)`}
                                      style={{
                                        width: `${pct}%`,
                                        backgroundColor: st.color,
                                      }}
                                      className="h-full transition-all"
                                    />
                                  );
                                })}
                              </div>
                            </td>
                            <td colSpan={2} className="border-l border-gray-200" />
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Modal Personalizador de Estados */}
      <StatusManagerModal
        boardId={activeBoard.id}
        statuses={activeBoard.statuses}
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
      />
    </main>
  );
};

