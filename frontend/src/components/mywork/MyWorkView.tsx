import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CalendarRange,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Clock,
  MessageSquare,
  RefreshCw,
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import {
  PRIORITY_MAP,
  type MyWorkItemRead,
  type PriorityMeta,
} from '../../types';
import { ItemDetailDrawer } from '../board/ItemDetailDrawer';

interface StatusDefinition {
  key: string;
  label: string;
  color: string;
}

const STANDARD_STATUSES: StatusDefinition[] = [
  { key: 'done', label: 'Listo', color: '#00c875' },
  { key: 'working', label: 'En Proceso', color: '#fdab3d' },
  { key: 'blocked', label: 'Bloqueado', color: '#e2445c' },
  { key: 'transferred', label: 'Traspasado', color: '#a25ddc' },
  { key: 'not_started', label: 'Sin Empezar', color: '#c4c4c4' },
];

export const MyWorkView: React.FC = () => {
  const {
    myWorkData,
    isLoadingMyWork,
    loadMyWork,
    updateItem,
    openItemDrawer,
    error,
    clearError,
  } = useWorkspaceStore();

  // Secciones colapsadas por id
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    void loadMyWork();
  }, [loadMyWork]);

  const toggleSection = (sectionKey: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const handleStatusChange = async (itemId: number, newStatus: string) => {
    try {
      await updateItem(itemId, { status_key: newStatus });
      void loadMyWork();
    } catch {
      // Error manejado en el store
    }
  };

  const handlePriorityChange = async (itemId: number, newPriority: string) => {
    try {
      await updateItem(itemId, { priority: newPriority });
      void loadMyWork();
    } catch {
      // Error manejado en el store
    }
  };

  const handleDueDateChange = async (itemId: number, newDueDate: string) => {
    try {
      await updateItem(itemId, { due_date: newDueDate || null });
      void loadMyWork();
    } catch {
      // Error manejado en el store
    }
  };

  const summary = myWorkData?.summary ?? {
    total_assigned: 0,
    overdue_count: 0,
    today_count: 0,
    this_week_count: 0,
    upcoming_count: 0,
    completed_count: 0,
  };

  const renderSection = (
    key: string,
    title: string,
    testId: string,
    items: MyWorkItemRead[],
    color: string,
    icon: React.ComponentType<{ className?: string }>,
    emptyMessage: string,
  ) => {
    const isCollapsed = Boolean(collapsedSections[key]);
    const Icon = icon;

    return (
      <section
        key={key}
        data-testid={testId}
        className="rounded-2xl border border-gray-200 bg-white shadow-2xs overflow-hidden"
      >
        {/* Cabecera de la Sección */}
        <div
          onClick={() => toggleSection(key)}
          className="px-5 py-3.5 flex items-center justify-between border-b border-gray-100 hover:bg-[#fafafa] cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className="p-1 rounded-md text-gray-500 hover:bg-gray-100"
              aria-label={`Alternar sección ${title}`}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: color }}
            >
              <Icon className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-[#323338]">{title}</h2>
            <span
              className="text-xs px-2.5 py-0.5 rounded-full font-bold"
              style={{
                backgroundColor: `${color}1a`,
                color: color,
              }}
            >
              {items.length}
            </span>
          </div>
        </div>

        {/* Filas de Tareas */}
        {!isCollapsed && (
          <div>
            {items.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#676879] italic bg-[#fcfcfd]">
                {emptyMessage}
              </div>
            ) : (
              <div className="divide-y divide-gray-100 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[750px]">
                  <thead>
                    <tr className="bg-[#f7f8fa] text-[11px] font-bold text-[#676879] uppercase tracking-wider">
                      <th className="py-2.5 px-4">Tarea y Contexto</th>
                      <th className="py-2.5 px-3 w-40 text-center">Estado</th>
                      <th className="py-2.5 px-3 w-32 text-center">Prioridad</th>
                      <th className="py-2.5 px-3 w-36 text-center">Fecha Límite</th>
                      <th className="py-2.5 px-3 w-32 text-center">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {items.map((item) => {
                      const statusDef =
                        STANDARD_STATUSES.find(
                          (s) => s.key === item.status_key,
                        ) ?? {
                          key: item.status_key,
                          label: item.status_key,
                          color: '#c4c4c4',
                        };

                      const priorityDef: PriorityMeta =
                        PRIORITY_MAP[item.priority.toLowerCase()] ?? {
                          key: item.priority,
                          label: item.priority,
                          bgColor: '#579bfc',
                          textColor: '#ffffff',
                        };

                      return (
                        <tr
                          key={item.id}
                          data-testid={`mywork-row-${item.id}`}
                          className="hover:bg-[#f0f7ff]/40 transition-colors group"
                        >
                          {/* Tarea y Contexto (Workspace / Tablero / Grupo) */}
                          <td className="py-3 px-4">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                                  {item.workspace_name || 'Espacio'}
                                </span>
                                <span className="text-gray-300">/</span>
                                <span className="text-[10px] font-semibold text-[#0073ea] bg-[#e5f4ff] px-2 py-0.5 rounded-md">
                                  {item.board_name || 'Tablero'}
                                </span>
                                <span
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md text-white"
                                  style={{
                                    backgroundColor: item.group_color,
                                  }}
                                >
                                  {item.group_title || 'Grupo'}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => void openItemDrawer(item.id)}
                                className="text-left font-semibold text-[#323338] hover:text-[#0073ea] transition-colors cursor-pointer text-sm line-clamp-1"
                              >
                                {item.title}
                              </button>
                            </div>
                          </td>

                          {/* Selector de Estado */}
                          <td className="py-3 px-3 text-center">
                            <select
                              value={item.status_key}
                              onChange={(e) =>
                                void handleStatusChange(item.id, e.target.value)
                              }
                              data-testid={`task-status-select-${item.id}`}
                              aria-label={`Estado de tarea ${item.title}`}
                              className="w-full text-center py-1.5 px-2.5 rounded-lg text-xs font-bold text-white shadow-2xs border-0 cursor-pointer focus:ring-2 focus:ring-offset-1 focus:ring-[#0073ea]"
                              style={{ backgroundColor: statusDef.color }}
                            >
                              {STANDARD_STATUSES.map((st) => (
                                <option
                                  key={st.key}
                                  value={st.key}
                                  className="bg-white text-[#323338] font-semibold"
                                >
                                  {st.label}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Selector de Prioridad */}
                          <td className="py-3 px-3 text-center">
                            <select
                              value={item.priority.toLowerCase()}
                              onChange={(e) =>
                                void handlePriorityChange(
                                  item.id,
                                  e.target.value,
                                )
                              }
                              data-testid={`task-priority-select-${item.id}`}
                              aria-label={`Prioridad de tarea ${item.title}`}
                              className="w-full text-center py-1.5 px-2 rounded-lg text-xs font-bold text-white shadow-2xs border-0 cursor-pointer focus:ring-2 focus:ring-offset-1 focus:ring-[#0073ea]"
                              style={{
                                backgroundColor: priorityDef.bgColor,
                                color: priorityDef.textColor,
                              }}
                            >
                              {Object.values(PRIORITY_MAP).map((p) => (
                                <option
                                  key={p.key}
                                  value={p.key}
                                  className="bg-white text-[#323338] font-semibold"
                                >
                                  {p.label}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Selector de Fecha Límite */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="date"
                              value={item.due_date ?? ''}
                              onChange={(e) =>
                                void handleDueDateChange(
                                  item.id,
                                  e.target.value,
                                )
                              }
                              data-testid={`task-due-date-input-${item.id}`}
                              aria-label={`Fecha límite de tarea ${item.title}`}
                              className="w-full py-1.5 px-2 rounded-lg border border-gray-200 text-xs text-[#323338] text-center bg-white hover:border-gray-300 focus:ring-2 focus:ring-[#0073ea] cursor-pointer"
                            />
                          </td>

                          {/* Botón Abrir Panel de Detalle */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => void openItemDrawer(item.id)}
                              data-testid={`btn-open-drawer-${item.id}`}
                              title="Abrir comentarios y checklist"
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 hover:text-[#0073ea] transition-all cursor-pointer font-medium"
                            >
                              <span className="flex items-center gap-1">
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>{item.comments_count ?? 0}</span>
                              </span>
                              {(item.checklist_total ?? 0) > 0 && (
                                <span className="flex items-center gap-1 text-[11px] text-gray-500">
                                  <CheckSquare className="w-3.5 h-3.5" />
                                  <span>
                                    {item.checklist_completed ?? 0}/
                                    {item.checklist_total ?? 0}
                                  </span>
                                </span>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    );
  };

  return (
    <main
      data-testid="my-work-view"
      className="flex-1 overflow-y-auto bg-[#f5f6f8] p-6 space-y-6"
    >
      {/* Banner de Error Descartable */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm shadow-2xs"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-[#e2445c] shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button
            type="button"
            onClick={clearError}
            className="text-xs font-bold text-red-700 hover:underline cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Cabecera Principal de Mi Trabajo */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#0073ea] text-white flex items-center justify-center shadow-xs">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#323338] tracking-tight">
                Mi Trabajo
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e5f4ff] text-[#0073ea]">
                {summary.total_assigned} tareas asignadas
              </span>
            </div>
            <p className="text-xs text-[#676879] mt-0.5">
              Consolidación global de todas tus tareas pendientes a través de
              todos los espacios de trabajo y tableros.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadMyWork()}
          disabled={isLoadingMyWork}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-300 text-[#323338] hover:bg-gray-50 text-xs font-semibold transition-all cursor-pointer shrink-0"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-[#0073ea] ${
              isLoadingMyWork ? 'animate-spin' : ''
            }`}
          />
          <span>{isLoadingMyWork ? 'Actualizando...' : 'Actualizar'}</span>
        </button>
      </div>

      {/* Tarjetas KPI de Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-gray-200 shadow-2xs flex flex-col">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
            Total
          </span>
          <span className="text-xl font-extrabold text-[#323338] mt-1">
            {summary.total_assigned}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-red-200 shadow-2xs flex flex-col">
          <span className="text-[11px] font-bold text-[#e2445c] uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Vencidas
          </span>
          <span className="text-xl font-extrabold text-[#e2445c] mt-1">
            {summary.overdue_count}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-amber-200 shadow-2xs flex flex-col">
          <span className="text-[11px] font-bold text-[#fdab3d] uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Para Hoy
          </span>
          <span className="text-xl font-extrabold text-[#fdab3d] mt-1">
            {summary.today_count}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-blue-200 shadow-2xs flex flex-col">
          <span className="text-[11px] font-bold text-[#0073ea] uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Esta Semana
          </span>
          <span className="text-xl font-extrabold text-[#0073ea] mt-1">
            {summary.this_week_count}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-gray-200 shadow-2xs flex flex-col">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <CalendarRange className="w-3 h-3" />
            Próximas
          </span>
          <span className="text-xl font-extrabold text-gray-700 mt-1">
            {summary.upcoming_count}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-emerald-200 shadow-2xs flex flex-col">
          <span className="text-[11px] font-bold text-[#00c875] uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Completadas
          </span>
          <span className="text-xl font-extrabold text-[#00c875] mt-1">
            {summary.completed_count}
          </span>
        </div>
      </div>

      {/* 5 Secciones Temporales */}
      <div className="space-y-4">
        {renderSection(
          'overdue',
          'Vencidas',
          'mywork-section-overdue',
          myWorkData?.overdue ?? [],
          '#e2445c',
          AlertTriangle,
          'No tenés tareas vencidas. ¡Excelente trabajo!',
        )}

        {renderSection(
          'today',
          'Para Hoy',
          'mywork-section-today',
          myWorkData?.today ?? [],
          '#fdab3d',
          Clock,
          'No tenés tareas programadas para hoy.',
        )}

        {renderSection(
          'this_week',
          'Esta Semana',
          'mywork-section-this-week',
          myWorkData?.this_week ?? [],
          '#0073ea',
          Calendar,
          'No tenés tareas para esta semana.',
        )}

        {renderSection(
          'upcoming',
          'Próximas y Sin Fecha',
          'mywork-section-upcoming',
          myWorkData?.upcoming_or_no_date ?? [],
          '#676879',
          CalendarRange,
          'No tenés tareas próximas o sin fecha programada.',
        )}

        {renderSection(
          'completed',
          'Completadas',
          'mywork-section-completed',
          myWorkData?.completed ?? [],
          '#00c875',
          CheckCircle2,
          'Aún no has completado tareas.',
        )}
      </div>

      {/* Panel Lateral de Detalle y Colaboración por Tarea */}
      <ItemDetailDrawer />
    </main>
  );
};
