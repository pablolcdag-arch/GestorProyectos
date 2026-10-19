import React, { useEffect } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  DollarSign,
  FolderKanban,
  Users,
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import {
  PRIORITY_MAP,
  type AssigneeWorkloadItem,
  type BoardAnalyticsRead,
  type BoardDetailRead,
  type GroupMetricsItem,
  type PriorityBreakdownItem,
  type StatusBreakdownItem,
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

function computeLocalAnalytics(board: BoardDetailRead): BoardAnalyticsRead {
  const allItems = board.groups.flatMap((g) => g.items);
  const totalItems = allItems.length;
  const completedItems = allItems.filter((i) => i.status_key === 'done').length;
  const completionRate =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 10000) / 100 : 0;

  const todayIso = getTodayIsoDate();
  const overdueItems = allItems.filter(
    (i) => Boolean(i.due_date) && i.due_date! < todayIso && i.status_key !== 'done',
  ).length;
  const unassignedItems = allItems.filter(
    (i) => i.assignee_id === null || i.assignee_id === undefined,
  ).length;

  const totalEstimatedHours =
    Math.round(
      allItems.reduce((acc, i) => acc + (i.estimated_hours ?? 0), 0) * 100,
    ) / 100;
  const totalBudget =
    Math.round(allItems.reduce((acc, i) => acc + (i.budget ?? 0), 0) * 100) /
    100;

  const byStatus: StatusBreakdownItem[] = board.statuses.map((st) => {
    const count = allItems.filter((i) => i.status_key === st.key).length;
    const percentage =
      totalItems > 0 ? Math.round((count / totalItems) * 10000) / 100 : 0;
    return {
      key: st.key,
      label: st.label,
      color: st.color,
      count,
      percentage,
    };
  });

  const priorityOrder = ['critical', 'high', 'medium', 'low'];
  const byPriority: PriorityBreakdownItem[] = priorityOrder.map((p) => ({
    priority: p,
    count: allItems.filter((i) => i.priority.toLowerCase() === p).length,
  }));

  const assigneeMap = new Map<string, AssigneeWorkloadItem>();
  for (const item of allItems) {
    const key =
      item.assignee_id !== null && item.assignee_id !== undefined
        ? String(item.assignee_id)
        : 'unassigned';
    const existing = assigneeMap.get(key);
    const isDone = item.status_key === 'done' ? 1 : 0;
    const hours = item.estimated_hours ?? 0;
    const budget = item.budget ?? 0;

    if (!existing) {
      assigneeMap.set(key, {
        user_id: item.assignee_id ?? null,
        full_name: item.assignee?.full_name ?? 'Sin asignar',
        color: item.assignee?.color ?? '#c4c4c4',
        total_items: 1,
        completed_items: isDone,
        estimated_hours: Math.round(hours * 100) / 100,
        budget: Math.round(budget * 100) / 100,
      });
    } else {
      existing.total_items += 1;
      existing.completed_items += isDone;
      existing.estimated_hours =
        Math.round((existing.estimated_hours + hours) * 100) / 100;
      existing.budget = Math.round((existing.budget + budget) * 100) / 100;
    }
  }

  const byGroup: GroupMetricsItem[] = board.groups.map((g) => {
    const gTotal = g.items.length;
    const gDone = g.items.filter((i) => i.status_key === 'done').length;
    const gHours =
      Math.round(
        g.items.reduce((acc, i) => acc + (i.estimated_hours ?? 0), 0) * 100,
      ) / 100;
    const gBudget =
      Math.round(g.items.reduce((acc, i) => acc + (i.budget ?? 0), 0) * 100) /
      100;
    return {
      group_id: g.id,
      title: g.title,
      color: g.color,
      total_items: gTotal,
      completed_items: gDone,
      total_estimated_hours: gHours,
      total_budget: gBudget,
    };
  });

  return {
    board_id: board.id,
    total_items: totalItems,
    completed_items: completedItems,
    completion_rate: completionRate,
    overdue_items: overdueItems,
    unassigned_items: unassignedItems,
    total_estimated_hours: totalEstimatedHours,
    total_budget: totalBudget,
    by_status: byStatus,
    by_priority: byPriority,
    by_assignee: Array.from(assigneeMap.values()),
    by_group: byGroup,
  };
}

interface DashboardViewProps {
  board: BoardDetailRead;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ board }) => {
  const { boardAnalytics, loadBoardAnalytics } = useWorkspaceStore();

  useEffect(() => {
    void loadBoardAnalytics(board.id);
  }, [board.id, loadBoardAnalytics]);

  const localAnalytics = computeLocalAnalytics(board);
  const analytics: BoardAnalyticsRead =
    boardAnalytics && boardAnalytics.board_id === board.id
      ? boardAnalytics
      : localAnalytics;

  return (
    <div data-testid="board-dashboard-view" className="space-y-6">
      {/* 1. Tarjetas KPI Ejecutivas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Tasa de Avance */}
        <div
          data-testid="kpi-completion-rate"
          className="p-5 rounded-2xl border border-gray-200 bg-white shadow-2xs flex items-start justify-between gap-3"
        >
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[#676879]">
              Avance del Tablero
            </p>
            <p className="text-2xl font-extrabold text-[#323338]">
              {analytics.completion_rate}%
            </p>
            <p className="text-xs text-[#676879]">
              {analytics.completed_items} de {analytics.total_items} tareas
              listas
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#00c875] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Tareas Vencidas y Sin Asignar */}
        <div
          data-testid="kpi-overdue-items"
          className="p-5 rounded-2xl border border-gray-200 bg-white shadow-2xs flex items-start justify-between gap-3"
        >
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[#676879]">
              Tareas Vencidas
            </p>
            <p className="text-2xl font-extrabold text-[#e2445c]">
              {analytics.overdue_items}
            </p>
            <p className="text-xs text-[#676879]">
              {analytics.unassigned_items} tareas sin asignar
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 text-[#e2445c] flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Esfuerzo Total Estimado */}
        <div
          data-testid="kpi-total-hours"
          className="p-5 rounded-2xl border border-gray-200 bg-white shadow-2xs flex items-start justify-between gap-3"
        >
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[#676879]">
              Esfuerzo Estimado
            </p>
            <p className="text-2xl font-extrabold text-[#0073ea]">
              {analytics.total_estimated_hours} h
            </p>
            <p className="text-xs text-[#676879]">
              Horas acumuladas del proyecto
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#e6f1fd] text-[#0073ea] flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Presupuesto Total Acumulado */}
        <div
          data-testid="kpi-total-budget"
          className="p-5 rounded-2xl border border-gray-200 bg-white shadow-2xs flex items-start justify-between gap-3"
        >
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[#676879]">
              Presupuesto Total
            </p>
            <p className="text-2xl font-extrabold text-[#323338]">
              ${analytics.total_budget.toLocaleString('en-US')}
            </p>
            <p className="text-xs text-[#676879]">
              Inversión planificada en tareas
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#a25ddc] flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. Gráficos de Distribución por Estado y Prioridad */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución por Estado */}
        <section
          data-testid="dashboard-status-chart"
          className="p-5 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-4"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#0073ea]" />
            <h3 className="text-sm font-bold text-[#323338]">
              Distribución por Estado
            </h3>
          </div>

          <div className="space-y-3">
            {analytics.by_status.map((st) => (
              <div key={st.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-2 font-semibold text-[#323338]">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: st.color }}
                    />
                    <span>{st.label}</span>
                  </span>
                  <span className="font-bold text-[#676879]">
                    {st.count} ({st.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, st.percentage)}%`,
                      backgroundColor: st.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Distribución por Prioridad */}
        <section
          data-testid="dashboard-priority-chart"
          className="p-5 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-4"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#a25ddc]" />
            <h3 className="text-sm font-bold text-[#323338]">
              Distribución por Prioridad
            </h3>
          </div>

          <div className="space-y-3">
            {analytics.by_priority.map((pr) => {
              const meta = PRIORITY_MAP[pr.priority.toLowerCase()] ?? {
                key: pr.priority,
                label: pr.priority,
                bgColor: '#579bfc',
                textColor: '#ffffff',
              };
              const pct =
                analytics.total_items > 0
                  ? Math.round((pr.count / analytics.total_items) * 100)
                  : 0;

              return (
                <div key={pr.priority} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-2 font-semibold text-[#323338]">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold"
                        style={{
                          backgroundColor: meta.bgColor,
                          color: meta.textColor,
                        }}
                      >
                        {meta.label}
                      </span>
                    </span>
                    <span className="font-bold text-[#676879]">
                      {pr.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, pct)}%`,
                        backgroundColor: meta.bgColor,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* 3. Carga de Trabajo por Responsable y Resumen por Grupo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tabla de Carga por Miembro del Equipo */}
        <section
          data-testid="dashboard-assignee-table"
          className="p-5 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-4"
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0073ea]" />
            <h3 className="text-sm font-bold text-[#323338]">
              Carga de Trabajo y Presupuesto por Responsable
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-[#676879] uppercase text-[10px] font-bold">
                  <th className="py-2 pr-3">Responsable</th>
                  <th className="py-2 px-2 text-center">Tareas</th>
                  <th className="py-2 px-2 text-center">Listas</th>
                  <th className="py-2 px-2 text-right">Horas</th>
                  <th className="py-2 pl-2 text-right">Presupuesto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {analytics.by_assignee.map((a, idx) => (
                  <tr key={a.user_id ?? `unassigned-${idx}`}>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                          style={{ backgroundColor: a.color || '#0073ea' }}
                        >
                          {getInitials(a.full_name)}
                        </span>
                        <span className="font-semibold text-[#323338]">
                          {a.full_name}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-[#323338]">
                      {a.total_items}
                    </td>
                    <td className="py-2.5 px-2 text-center font-semibold text-[#00c875]">
                      {a.completed_items}
                    </td>
                    <td className="py-2.5 px-2 text-right font-semibold text-[#0073ea]">
                      {a.estimated_hours} h
                    </td>
                    <td className="py-2.5 pl-2 text-right font-bold text-[#323338]">
                      ${a.budget.toLocaleString('en-US')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Resumen Financiero y de Avance por Grupo */}
        <section
          data-testid="dashboard-group-summary"
          className="p-5 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-4"
        >
          <div className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-[#00c875]" />
            <h3 className="text-sm font-bold text-[#323338]">
              Resumen Financiero y de Esfuerzo por Grupo
            </h3>
          </div>

          <div className="space-y-3">
            {analytics.by_group.map((g) => (
              <div
                key={g.group_id}
                className="p-3.5 rounded-xl bg-[#f7f8fa] border border-gray-200 flex items-center justify-between gap-3"
                style={{
                  borderLeftWidth: '5px',
                  borderLeftColor: g.color,
                }}
              >
                <div>
                  <h4
                    className="text-xs font-bold"
                    style={{ color: g.color }}
                  >
                    {g.title}
                  </h4>
                  <p className="text-[11px] text-[#676879] mt-0.5">
                    {g.completed_items}/{g.total_items} tareas completadas
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 font-bold text-[#0073ea]">
                    {g.total_estimated_hours} h
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 font-bold text-[#323338]">
                    ${g.total_budget.toLocaleString('en-US')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

