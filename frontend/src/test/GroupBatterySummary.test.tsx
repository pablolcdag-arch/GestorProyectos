import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  GroupFooterSummary,
  calculateDateRange,
} from '../components/board/GroupFooterSummary';
import type { BoardStatusRead, TaskGroupRead, TaskItemRead } from '../types';

const MOCK_STATUSES: BoardStatusRead[] = [
  { id: 1, board_id: 1, key: 'done', label: 'Listo', color: '#00c875', position: 0 },
  { id: 2, board_id: 1, key: 'working', label: 'En Proceso', color: '#fdab3d', position: 1 },
  { id: 3, board_id: 1, key: 'blocked', label: 'Bloqueado', color: '#e2445c', position: 2 },
  { id: 4, board_id: 1, key: 'transferred', label: 'Traspasado', color: '#a25ddc', position: 3 },
  { id: 5, board_id: 1, key: 'not_started', label: 'Sin Empezar', color: '#c4c4c4', position: 4 },
];

function createMockItem(partial: Partial<TaskItemRead>): TaskItemRead {
  return {
    id: 1,
    group_id: 10,
    board_id: 1,
    title: 'Tarea de Prueba',
    status_key: 'working',
    priority: 'medium',
    assignee_id: null,
    assignee: null,
    start_date: null,
    due_date: null,
    estimated_hours: 10,
    budget: 500,
    notes: '',
    position: 0,
    comments_count: 0,
    checklist_total: 0,
    checklist_completed: 0,
    created_at: '2026-10-19T12:00:00Z',
    updated_at: '2026-10-19T12:00:00Z',
    ...partial,
  };
}

describe('GroupBatterySummary — Sprint 3: Battery Summary y Acumuladores 1:1 Monday.com', () => {
  it('1. Barra de Batería de Estados y Prioridades: calcula anchos proporcionales y tooltips exactos', () => {
    const items: TaskItemRead[] = [
      createMockItem({ id: 101, status_key: 'working', priority: 'critical' }),
      createMockItem({ id: 102, status_key: 'working', priority: 'high' }),
      createMockItem({ id: 103, status_key: 'done', priority: 'medium' }),
      createMockItem({ id: 104, status_key: 'blocked', priority: 'low' }),
    ];

    const group: TaskGroupRead = {
      id: 10,
      board_id: 1,
      title: 'Grupo Beta',
      color: '#579bfc',
      position: 0,
      collapsed: false,
      items,
    };

    render(
      <table>
        <GroupFooterSummary
          group={group}
          statuses={MOCK_STATUSES}
          groupTotalHours={40}
          groupTotalBudget={2000}
        />
      </table>,
    );

    // Batería de Estados: 2 working (50%), 1 done (25%), 1 blocked (25%)
    const workingSegment = screen.getByTestId('battery-segment-status-10-working');
    expect(workingSegment).toBeInTheDocument();
    expect(workingSegment).toHaveStyle({ width: '50%', backgroundColor: '#fdab3d' });
    expect(workingSegment).toHaveAttribute('title', 'En Proceso: 2 tareas (50%)');

    const doneSegment = screen.getByTestId('battery-segment-status-10-done');
    expect(doneSegment).toBeInTheDocument();
    expect(doneSegment).toHaveStyle({ width: '25%', backgroundColor: '#00c875' });
    expect(doneSegment).toHaveAttribute('title', 'Listo: 1 tarea (25%)');

    const blockedSegment = screen.getByTestId('battery-segment-status-10-blocked');
    expect(blockedSegment).toBeInTheDocument();
    expect(blockedSegment).toHaveStyle({ width: '25%', backgroundColor: '#e2445c' });
    expect(blockedSegment).toHaveAttribute('title', 'Bloqueado: 1 tarea (25%)');

    // Batería de Prioridades: 1 critical (25%), 1 high (25%), 1 medium (25%), 1 low (25%)
    const criticalSegment = screen.getByTestId('battery-segment-priority-10-critical');
    expect(criticalSegment).toBeInTheDocument();
    expect(criticalSegment).toHaveStyle({ width: '25%', backgroundColor: '#333333' });
    expect(criticalSegment).toHaveAttribute('title', 'Crítica: 1 tarea (25%)');

    const highSegment = screen.getByTestId('battery-segment-priority-10-high');
    expect(highSegment).toBeInTheDocument();
    expect(highSegment).toHaveStyle({ width: '25%', backgroundColor: '#401694' });
    expect(highSegment).toHaveAttribute('title', 'Alta: 1 tarea (25%)');
  });

  it('2. Píldora de Rango Acumulado de Fechas: calcula mínimo y máximo correctamente', () => {
    // Caso A: Tareas en el mismo mes
    const itemsSameMonth: TaskItemRead[] = [
      createMockItem({ id: 1, start_date: '2026-10-25', due_date: '2026-10-26' }),
      createMockItem({ id: 2, start_date: '2026-10-27', due_date: '2026-10-27' }),
    ];
    expect(calculateDateRange(itemsSameMonth)).toBe('oct. 25 - 27');

    // Caso B: Tareas en meses diferentes
    const itemsDiffMonths: TaskItemRead[] = [
      createMockItem({ id: 1, due_date: '2026-10-28' }),
      createMockItem({ id: 2, due_date: '2026-11-04' }),
    ];
    expect(calculateDateRange(itemsDiffMonths)).toBe('oct. 28 - nov. 4');

    // Caso C: Misma fecha única
    const itemsSingleDate: TaskItemRead[] = [
      createMockItem({ id: 1, due_date: '2026-10-25' }),
      createMockItem({ id: 2, due_date: '2026-10-25' }),
    ];
    expect(calculateDateRange(itemsSingleDate)).toBe('oct. 25');

    // Caso D: Sin fechas
    const itemsNoDates: TaskItemRead[] = [
      createMockItem({ id: 1, start_date: null, due_date: null }),
    ];
    expect(calculateDateRange(itemsNoDates)).toBeNull();

    // Render en componente para verificar píldora y guion
    const groupWithDates: TaskGroupRead = {
      id: 11,
      board_id: 1,
      title: 'Con Fechas',
      color: '#579bfc',
      position: 0,
      collapsed: false,
      items: itemsSameMonth,
    };

    const { rerender } = render(
      <table>
        <GroupFooterSummary
          group={groupWithDates}
          statuses={MOCK_STATUSES}
          groupTotalHours={10}
          groupTotalBudget={500}
        />
      </table>,
    );

    const dateRangePill = screen.getByTestId('group-date-range-11');
    expect(dateRangePill).toHaveTextContent('oct. 25 - 27');
    expect(dateRangePill.className).toContain('bg-[#0073ea]');
    expect(dateRangePill.className).toContain('text-white');

    // Rerender sin fechas: muestra guion
    const groupWithoutDates: TaskGroupRead = {
      id: 12,
      board_id: 1,
      title: 'Sin Fechas',
      color: '#579bfc',
      position: 1,
      collapsed: false,
      items: itemsNoDates,
    };

    rerender(
      <table>
        <GroupFooterSummary
          group={groupWithoutDates}
          statuses={MOCK_STATUSES}
          groupTotalHours={0}
          groupTotalBudget={0}
        />
      </table>,
    );

    expect(screen.getByTestId('group-date-range-12')).toHaveTextContent('-');
  });

  it('3. Sumatorias Numéricas de Horas y Presupuesto: preservan test-ids y formato legible con Total', () => {
    const group: TaskGroupRead = {
      id: 15,
      board_id: 1,
      title: 'Grupo Finanzas',
      color: '#00c875',
      position: 0,
      collapsed: false,
      items: [createMockItem({ id: 1, estimated_hours: 24, budget: 1600 })],
    };

    render(
      <table>
        <GroupFooterSummary
          group={group}
          statuses={MOCK_STATUSES}
          groupTotalHours={24}
          groupTotalBudget={1600}
        />
      </table>,
    );

    const hoursEl = screen.getByTestId('group-sum-hours-15');
    expect(hoursEl).toBeInTheDocument();
    expect(hoursEl).toHaveTextContent('24 h');
    expect(hoursEl).toHaveTextContent('Total');

    const budgetEl = screen.getByTestId('group-sum-budget-15');
    expect(budgetEl).toBeInTheDocument();
    expect(budgetEl).toHaveTextContent('$1,600');
    expect(budgetEl).toHaveTextContent('Total');
  });
});

