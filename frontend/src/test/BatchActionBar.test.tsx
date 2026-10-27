import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BatchActionBar } from '../components/board/BatchActionBar';
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
    title: 'Tarea Mock',
    status_key: 'working',
    priority: 'medium',
    assignee_id: null,
    assignee: null,
    start_date: null,
    due_date: null,
    estimated_hours: 4,
    budget: 300,
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
  const itemsGroup1: TaskItemRead[] = [
    createMockItem({ id: 101, group_id: 10, title: 'Diseñar arquitectura' }),
    createMockItem({ id: 102, group_id: 10, title: 'Implementar API' }),
  ];

  const itemsGroup2: TaskItemRead[] = [
    createMockItem({ id: 201, group_id: 20, title: 'Pruebas E2E' }),
  ];

  const groups: TaskGroupRead[] = [
    {
      id: 10,
      board_id: 1,
      title: 'En Desarrollo',
      color: '#579bfc',
      position: 0,
      collapsed: false,
      items: itemsGroup1,
    },
    {
      id: 20,
      board_id: 1,
      title: 'QA y Lanzamiento',
      color: '#00c875',
      position: 1,
      collapsed: false,
      items: itemsGroup2,
    },
  ];

  return {
    id: 1,
    workspace_id: 1,
    name: 'Tablero Batch Actions',
    description: 'Sprint 5 Testing',
    created_at: '2026-10-19T12:00:00Z',
    statuses: MOCK_STATUSES,
    groups,
  };
}

describe('BatchActionBar — Sprint 5: Floating Batch Action Bar 1:1 Monday.com', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: MOCK_USER, users: [MOCK_USER] });
  });

  it('1. Checkboxes y Resaltado: marcar un checkbox tiñe la fila con bg-[#edf5ff] y activa selección', () => {
    const board = buildMockBoard();
    useWorkspaceStore.setState({ activeBoard: board });

    render(<BoardView />);

    const row101 = screen.getByTestId('task-row-101');
    const checkbox101 = screen.getByTestId('item-checkbox-101');

    // Inicialmente no está seleccionada
    expect(checkbox101).not.toBeChecked();
    expect(row101).not.toHaveClass('bg-[#edf5ff]');
    expect(screen.queryByTestId('batch-action-bar')).not.toBeInTheDocument();

    // Al marcar checkbox 101 se tiñe de azul suave Monday
    fireEvent.click(checkbox101);
    expect(checkbox101).toBeChecked();
    expect(row101).toHaveClass('bg-[#edf5ff]');

    // Aparece la barra flotante con contador 1
    expect(screen.getByTestId('batch-action-bar')).toBeInTheDocument();
    expect(screen.getByTestId('batch-selected-count')).toHaveTextContent('1');
    expect(screen.getByText('1 Elemento seleccionado')).toBeInTheDocument();
  });

  it('2. Selección de Grupo y Contador en Lote: checkbox de cabecera selecciona todas las tareas visibles del grupo', () => {
    const board = buildMockBoard();
    useWorkspaceStore.setState({ activeBoard: board });

    render(<BoardView />);

    const selectAllGroup10 = screen.getByTestId('select-all-group-10');
    fireEvent.click(selectAllGroup10);

    // Ambas filas del grupo 10 están seleccionadas y resaltadas
    expect(screen.getByTestId('item-checkbox-101')).toBeChecked();
    expect(screen.getByTestId('item-checkbox-102')).toBeChecked();
    expect(screen.getByTestId('task-row-101')).toHaveClass('bg-[#edf5ff]');
    expect(screen.getByTestId('task-row-102')).toHaveClass('bg-[#edf5ff]');

    // Contador muestra 2 elementos
    expect(screen.getByTestId('batch-selected-count')).toHaveTextContent('2');
    expect(screen.getByText('2 Elementos seleccionados')).toBeInTheDocument();

    // Fila del grupo 20 no está seleccionada
    expect(screen.getByTestId('item-checkbox-201')).not.toBeChecked();
    expect(screen.getByTestId('task-row-201')).not.toHaveClass('bg-[#edf5ff]');
  });

  it('3. Botón Cerrar (X): deselecciona todas las tareas y oculta la barra flotante', () => {
    const board = buildMockBoard();
    useWorkspaceStore.setState({ activeBoard: board });

    render(<BoardView />);

    fireEvent.click(screen.getByTestId('item-checkbox-101'));
    expect(screen.getByTestId('batch-action-bar')).toBeInTheDocument();

    // Clic en botón cerrar X
    const closeBtn = screen.getByTestId('batch-close-btn');
    fireEvent.click(closeBtn);

    // Barra desaparece y fila vuelve a estado normal
    expect(screen.queryByTestId('batch-action-bar')).not.toBeInTheDocument();
    expect(screen.getByTestId('item-checkbox-101')).not.toBeChecked();
    expect(screen.getByTestId('task-row-101')).not.toHaveClass('bg-[#edf5ff]');
  });

  it('4. Operaciones en lote: Duplicar, Eliminar y Mover invocan las funciones del store o callbacks', async () => {
    const board = buildMockBoard();
    const onDuplicateSelected = vi.fn().mockResolvedValue(undefined);
    const onDeleteSelected = vi.fn().mockResolvedValue(undefined);
    const onMoveSelected = vi.fn().mockResolvedValue(undefined);
    const onClearSelection = vi.fn();

    const selectedIds = new Set([101, 102]);

    render(
      <BatchActionBar
        selectedItemIds={selectedIds}
        board={board}
        onClearSelection={onClearSelection}
        onDuplicateSelected={onDuplicateSelected}
        onDeleteSelected={onDeleteSelected}
        onMoveSelected={onMoveSelected}
      />,
    );

    // A) Duplicar
    const duplicateBtn = screen.getByTestId('batch-duplicate-btn');
    fireEvent.click(duplicateBtn);
    await waitFor(() => {
      expect(onDuplicateSelected).toHaveBeenCalledWith([101, 102]);
      expect(onClearSelection).toHaveBeenCalled();
    });

    // B) Eliminar
    onClearSelection.mockClear();
    const deleteBtn = screen.getByTestId('batch-delete-btn');
    fireEvent.click(deleteBtn);
    await waitFor(() => {
      expect(onDeleteSelected).toHaveBeenCalledWith([101, 102]);
      expect(onClearSelection).toHaveBeenCalled();
    });

    // C) Mover a otro grupo vía dropdown
    onClearSelection.mockClear();
    const moveBtn = screen.getByTestId('batch-move-btn');
    fireEvent.click(moveBtn);

    // Dropdown aparece listando los grupos
    const moveToGroup20Btn = screen.getByTestId('batch-move-to-group-20');
    expect(moveToGroup20Btn).toBeInTheDocument();
    fireEvent.click(moveToGroup20Btn);

    await waitFor(() => {
      expect(onMoveSelected).toHaveBeenCalledWith([101, 102], 20);
      expect(onClearSelection).toHaveBeenCalled();
    });
  });
});
