import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { BoardView } from '../components/board/BoardView';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useAuthStore } from '../store/useAuthStore';
import type {
  BoardDetailRead,
  BoardStatusRead,
  TaskGroupRead,
  TaskItemRead,
  UserRead,
} from '../types';

const MOCK_STATUSES: BoardStatusRead[] = [
  { id: 1, board_id: 1, key: 'done', label: 'Listo', color: '#00c875', position: 0 },
  { id: 2, board_id: 1, key: 'working', label: 'En Proceso', color: '#fdab3d', position: 1 },
  { id: 3, board_id: 1, key: 'blocked', label: 'Bloqueado', color: '#e2445c', position: 2 },
  { id: 4, board_id: 1, key: 'transferred', label: 'Traspasado', color: '#a25ddc', position: 3 },
  { id: 5, board_id: 1, key: 'not_started', label: 'Sin Empezar', color: '#c4c4c4', position: 4 },
];

const MOCK_USER: UserRead = {
  id: 1,
  email: 'ana@gestor.dev',
  full_name: 'Ana García',
  avatar_url: null,
  color: '#0073ea',
  auth_provider: 'google',
  provider_subject_id: 'google:1',
  role: 'admin',
  is_active: true,
  created_at: '2026-10-19T12:00:00Z',
};

function createMockItem(partial: Partial<TaskItemRead>): TaskItemRead {
  return {
    id: 1,
    group_id: 10,
    board_id: 1,
    title: 'Tarea Base',
    status_key: 'working',
    priority: 'medium',
    assignee_id: null,
    assignee: null,
    start_date: null,
    due_date: '2026-10-30',
    estimated_hours: 4,
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

function buildMockBoard(): BoardDetailRead {
  const items: TaskItemRead[] = [
    createMockItem({
      id: 101,
      group_id: 10,
      title: 'B - Implementar API',
      status_key: 'working',
      priority: 'high',
      budget: 800,
    }),
    createMockItem({
      id: 102,
      group_id: 10,
      title: 'A - Diseñar arquitectura',
      status_key: 'done',
      priority: 'critical',
      budget: 1200,
    }),
    createMockItem({
      id: 103,
      group_id: 10,
      title: 'C - Revisar despliegue',
      status_key: 'blocked',
      priority: 'low',
      budget: 300,
    }),
  ];

  const groups: TaskGroupRead[] = [
    {
      id: 10,
      board_id: 1,
      title: 'Sprint 6 Features',
      color: '#579bfc',
      position: 0,
      collapsed: false,
      items,
    },
  ];

  return {
    id: 1,
    workspace_id: 1,
    name: 'Tablero Toolbar Testing',
    description: 'Sprint 6 Popovers',
    created_at: '2026-10-19T12:00:00Z',
    statuses: MOCK_STATUSES,
    groups,
  };
}

describe('BoardToolbarPopovers — Sprint 6: Toolbar, Filtros Rápidos, Ocultar y Ordenamiento 1:1 Monday.com', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: MOCK_USER, users: [MOCK_USER] });
  });

  it('1. Popover de Filtros Rápidos: botón Filtrar abre popover horizontal con conteos y filtra reactivamente', () => {
    const board = buildMockBoard();
    useWorkspaceStore.setState({ activeBoard: board });

    render(<BoardView />);

    // Inicialmente se ven las 3 tareas
    expect(screen.getByText('B - Implementar API')).toBeInTheDocument();
    expect(screen.getByText('A - Diseñar arquitectura')).toBeInTheDocument();
    expect(screen.getByText('C - Revisar despliegue')).toBeInTheDocument();
    expect(screen.queryByTestId('quick-filters-popover')).not.toBeInTheDocument();

    // Clic en botón "Filtrar" abre el popover
    const filterBtn = screen.getByTestId('toolbar-filter-btn');
    fireEvent.click(filterBtn);

    const popover = screen.getByTestId('quick-filters-popover');
    expect(popover).toBeInTheDocument();
    expect(within(popover).getByText(/Se muestra un total de 3 tareas/i)).toBeInTheDocument();

    // Clic en chip de estado "Listo" filtra solo tareas terminadas
    const doneChip = screen.getByTestId('quick-filter-status-done');
    fireEvent.click(doneChip);

    // Solo se ve la tarea 'A - Diseñar arquitectura'
    expect(screen.getByText('A - Diseñar arquitectura')).toBeInTheDocument();
    expect(screen.queryByText('B - Implementar API')).not.toBeInTheDocument();
    expect(screen.queryByText('C - Revisar despliegue')).not.toBeInTheDocument();

    // Botón "Borrar todo" dentro del popover resetea los filtros
    const clearAllBtn = screen.getByTestId('quick-filter-clear-all');
    fireEvent.click(clearAllBtn);

    // Se vuelven a ver todas las tareas
    expect(screen.getByText('B - Implementar API')).toBeInTheDocument();
    expect(screen.getByText('A - Diseñar arquitectura')).toBeInTheDocument();
    expect(screen.getByText('C - Revisar despliegue')).toBeInTheDocument();
  });

  it('2. Popover de Ocultar / Mostrar Columnas: desmarcar una columna la oculta inmediatamente de la tabla y persistencia', () => {
    const board = buildMockBoard();
    useWorkspaceStore.setState({ activeBoard: board });

    render(<BoardView />);

    // La columna Presupuesto y Horas están visibles por defecto
    expect(screen.getByRole('columnheader', { name: 'Presupuesto' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Horas' })).toBeInTheDocument();

    // Abrir popover de ocultar columnas
    const hideBtn = screen.getByTestId('toolbar-hide-columns-btn');
    fireEvent.click(hideBtn);

    const hidePopover = screen.getByTestId('hide-columns-popover');
    expect(hidePopover).toBeInTheDocument();

    // Desmarcar columna Presupuesto
    const budgetToggle = screen.getByTestId('col-toggle-budget');
    expect(budgetToggle).toBeChecked();
    fireEvent.click(budgetToggle);
    expect(budgetToggle).not.toBeChecked();

    // La columna Presupuesto ya no se renderiza en la tabla
    expect(screen.queryByRole('columnheader', { name: 'Presupuesto' })).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Horas' })).toBeInTheDocument();

    // Volver a marcar Presupuesto
    fireEvent.click(budgetToggle);
    expect(screen.getByRole('columnheader', { name: 'Presupuesto' })).toBeInTheDocument();

    // Master toggle para ocultar todas
    const masterToggle = screen.getByTestId('toggle-all-columns-visibility');
    fireEvent.click(masterToggle);
    expect(screen.queryByRole('columnheader', { name: 'Presupuesto' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Horas' })).not.toBeInTheDocument();
  });

  it('3. Popover de Ordenamiento: ordena reactivamente las tareas de forma ascendente y descendente', () => {
    const board = buildMockBoard();
    useWorkspaceStore.setState({ activeBoard: board });

    render(<BoardView />);

    // Abrir popover de ordenamiento
    const sortBtn = screen.getByTestId('toolbar-sort-btn');
    fireEvent.click(sortBtn);

    const sortPopover = screen.getByTestId('sort-popover');
    expect(sortPopover).toBeInTheDocument();

    // Seleccionar ordenar por título
    const colSelect = screen.getByTestId('sort-column-select');
    fireEvent.change(colSelect, { target: { value: 'title' } });

    // Orden Ascendente (A -> B -> C)
    const ascBtn = screen.getByTestId('sort-dir-asc-btn');
    fireEvent.click(ascBtn);

    let rows = screen.getAllByTestId(/task-row-/);
    expect(rows[0]).toHaveTextContent('A - Diseñar arquitectura');
    expect(rows[1]).toHaveTextContent('B - Implementar API');
    expect(rows[2]).toHaveTextContent('C - Revisar despliegue');

    // Orden Descendente (C -> B -> A)
    const descBtn = screen.getByTestId('sort-dir-desc-btn');
    fireEvent.click(descBtn);

    rows = screen.getAllByTestId(/task-row-/);
    expect(rows[0]).toHaveTextContent('C - Revisar despliegue');
    expect(rows[1]).toHaveTextContent('B - Implementar API');
    expect(rows[2]).toHaveTextContent('A - Diseñar arquitectura');

    // Limpiar ordenamiento
    const clearSortBtn = screen.getByTestId('sort-clear-btn');
    fireEvent.click(clearSortBtn);

    // Vuelve al orden original
    rows = screen.getAllByTestId(/task-row-/);
    expect(rows[0]).toHaveTextContent('B - Implementar API');
    expect(rows[1]).toHaveTextContent('A - Diseñar arquitectura');
  });
});

