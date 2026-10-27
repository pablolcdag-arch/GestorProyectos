import React from 'react';
import type { BoardStatusRead, TaskGroupRead, TaskItemRead } from '../../types';

interface GroupFooterSummaryProps {
  group: TaskGroupRead;
  statuses: BoardStatusRead[];
  groupTotalHours: number;
  groupTotalBudget: number;
  visibleColumns?: Record<string, boolean>;
}

const ORDERED_PRIORITIES = [
  { key: 'critical', label: 'Crítica', color: '#333333' },
  { key: 'high', label: 'Alta', color: '#401694' },
  { key: 'medium', label: 'Media', color: '#5559df' },
  { key: 'low', label: 'Baja', color: '#579bfc' },
];

const SPANISH_MONTHS = [
  'ene.',
  'feb.',
  'mar.',
  'abr.',
  'may.',
  'jun.',
  'jul.',
  'ago.',
  'sep.',
  'oct.',
  'nov.',
  'dic.',
];

export function calculateDateRange(items: TaskItemRead[]): string | null {
  const dates: string[] = [];
  for (const item of items) {
    if (item.start_date && item.start_date.trim()) {
      dates.push(item.start_date.trim());
    }
    if (item.due_date && item.due_date.trim()) {
      dates.push(item.due_date.trim());
    }
  }

  if (dates.length === 0) return null;

  dates.sort();
  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];

  const [minY, minM, minD] = minDate.split('-').map(Number);
  const [maxY, maxM, maxD] = maxDate.split('-').map(Number);

  const minMonthStr = SPANISH_MONTHS[minM - 1] || '';
  const maxMonthStr = SPANISH_MONTHS[maxM - 1] || '';

  if (minDate === maxDate) {
    return `${minMonthStr} ${minD}`;
  }

  if (minY === maxY && minM === maxM) {
    return `${minMonthStr} ${minD} - ${maxD}`;
  }

  if (minY === maxY) {
    return `${minMonthStr} ${minD} - ${maxMonthStr} ${maxD}`;
  }

  return `${minMonthStr} ${minD}, ${minY} - ${maxMonthStr} ${maxD}, ${maxY}`;
}

export const GroupFooterSummary: React.FC<GroupFooterSummaryProps> = ({
  group,
  statuses,
  groupTotalHours,
  groupTotalBudget,
  visibleColumns,
}) => {
  const isColVisible = (k: string) =>
    !visibleColumns || visibleColumns[k] !== false;
  const totalItems = group.items.length;
  if (totalItems === 0) return null;

  const dateRangeText = calculateDateRange(group.items);

  // Segmentos de Estados (Battery Summary)
  const statusSegments = statuses
    .map((st) => {
      const count = group.items.filter((i) => i.status_key === st.key).length;
      if (count === 0) return null;
      const pct = (count / totalItems) * 100;
      const roundedPct = Math.round(pct);
      return {
        key: st.key,
        label: st.label,
        color: st.color,
        count,
        pct,
        roundedPct,
      };
    })
    .filter(Boolean);

  // Segmentos de Prioridades (Battery Summary)
  const prioritySegments = ORDERED_PRIORITIES.map((p) => {
    const count = group.items.filter(
      (i) => (i.priority || '').toLowerCase() === p.key,
    ).length;
    if (count === 0) return null;
    const pct = (count / totalItems) * 100;
    const roundedPct = Math.round(pct);
    return {
      key: p.key,
      label: p.label,
      color: p.color,
      count,
      pct,
      roundedPct,
    };
  }).filter(Boolean);

  return (
    <tfoot>
      <tr className="h-9 min-h-[36px] max-h-[36px] bg-[#fafbfc] border-t border-[#d0d4e4] select-none text-xs">
        {/* Columna 0: Checkbox */}
        <td className="w-10 min-w-[40px] max-w-[40px] h-9 min-h-[36px] max-h-[36px] p-0 border-r border-[#d0d4e4] bg-[#fafbfc]" />

        {/* Columna 1: Tarea (Sticky) */}
        <td className="w-[331px] min-w-[331px] h-9 min-h-[36px] max-h-[36px] px-3 text-left border-r border-[#d0d4e4] sticky left-10 z-10 bg-[#fafbfc] truncate text-xs font-semibold text-[#676879]" />

        {/* Columna 2: Responsable */}
        {isColVisible('assignee') && (
          <td className="w-[98px] min-w-[98px] h-9 min-h-[36px] max-h-[36px] px-2 border-r border-[#d0d4e4] bg-[#fafbfc]" />
        )}

        {/* Columna 3: Estado (Battery Summary 1:1 Monday.com) */}
        {isColVisible('status') && (
          <td className="w-[134px] min-w-[134px] h-9 min-h-[36px] max-h-[36px] p-1.5 border-r border-[#d0d4e4]">
            <div
              data-testid={`battery-summary-status-${group.id}`}
              aria-label={`Barra de distribución de estados de ${group.title}`}
              className="w-full h-[22px] rounded-[3px] overflow-hidden flex bg-[#e5e7eb] shadow-2xs"
            >
              {statusSegments.map((seg) => (
                <div
                  key={seg!.key}
                  data-testid={`battery-segment-status-${group.id}-${seg!.key}`}
                  title={`${seg!.label}: ${seg!.count} ${seg!.count === 1 ? 'tarea' : 'tareas'} (${seg!.roundedPct}%)`}
                  style={{
                    width: `${seg!.pct}%`,
                    backgroundColor: seg!.color,
                  }}
                  className="h-full transition-all cursor-pointer hover:opacity-90 first:rounded-l-[3px] last:rounded-r-[3px]"
                />
              ))}
            </div>
          </td>
        )}

        {/* Columna 4: Prioridad (Battery Summary 1:1 Monday.com) */}
        {isColVisible('priority') && (
          <td className="w-[140px] min-w-[140px] h-9 min-h-[36px] max-h-[36px] p-1.5 border-r border-[#d0d4e4]">
            <div
              data-testid={`battery-summary-priority-${group.id}`}
              aria-label={`Barra de distribución de prioridades de ${group.title}`}
              className="w-full h-[22px] rounded-[3px] overflow-hidden flex bg-[#e5e7eb] shadow-2xs"
            >
              {prioritySegments.map((seg) => (
                <div
                  key={seg!.key}
                  data-testid={`battery-segment-priority-${group.id}-${seg!.key}`}
                  title={`${seg!.label}: ${seg!.count} ${seg!.count === 1 ? 'tarea' : 'tareas'} (${seg!.roundedPct}%)`}
                  style={{
                    width: `${seg!.pct}%`,
                    backgroundColor: seg!.color,
                  }}
                  className="h-full transition-all cursor-pointer hover:opacity-90 first:rounded-l-[3px] last:rounded-r-[3px]"
                />
              ))}
            </div>
          </td>
        )}

        {/* Columna 5: Fecha límite / Cronograma (Píldora de Rango Acumulado) */}
        {isColVisible('due_date') && (
          <td className="w-[140px] min-w-[140px] h-9 min-h-[36px] max-h-[36px] px-2 text-center border-r border-[#d0d4e4]">
            {dateRangeText ? (
              <span
                data-testid={`group-date-range-${group.id}`}
                className="inline-block text-xs font-semibold px-2 py-0.5 rounded-[4px] bg-[#0073ea] text-white shadow-2xs truncate max-w-[130px]"
                title={dateRangeText}
              >
                {dateRangeText}
              </span>
            ) : (
              <span
                data-testid={`group-date-range-${group.id}`}
                className="text-xs text-[#676879]"
              >
                -
              </span>
            )}
          </td>
        )}

        {/* Columna 6: Horas (Sumatoria con etiqueta sutil) */}
        {isColVisible('estimated_hours') && (
          <td className="w-[140px] min-w-[140px] h-9 min-h-[36px] max-h-[36px] px-2 text-center border-r border-[#d0d4e4]">
            <span
              data-testid={`group-sum-hours-${group.id}`}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#323338]"
            >
              <span>{groupTotalHours} h</span>
              <span className="text-[10px] text-[#676879] font-normal">Total</span>
            </span>
          </td>
        )}

        {/* Columna 7: Presupuesto (Sumatoria con etiqueta sutil) */}
        {isColVisible('budget') && (
          <td className="w-[140px] min-w-[140px] h-9 min-h-[36px] max-h-[36px] px-2 text-center border-r border-[#d0d4e4]">
            <span
              data-testid={`group-sum-budget-${group.id}`}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#323338]"
            >
              <span>${groupTotalBudget.toLocaleString('en-US')}</span>
              <span className="text-[10px] text-[#676879] font-normal">Total</span>
            </span>
          </td>
        )}

        {/* Columna 8: Acciones */}
        <td className="w-[140px] min-w-[140px] h-9 min-h-[36px] max-h-[36px] border-r border-[#d0d4e4] bg-[#fafbfc]" />
      </tr>
    </tfoot>
  );
};
