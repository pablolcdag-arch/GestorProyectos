import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GroupHeader } from '../components/board/GroupHeader';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import {
  GROUP_COLOR_PALETTE,
  type BoardDetailRead,
  type BoardStatusRead,
  type TaskGroupRead,
  type TaskItemRead,
} from '../types';

const OFFICIAL_18_COLORS = [
  '#579bfc',
  '#00c875',
  '#fdab3d',
  '#df2f4a',
  '#a25ddc',
  '#4eccc6',
  '#ff5ac4',
  '#cab641',
  '#808080',
  '#784bd1',
  '#007eb5',
  '#037f4c',
  '#bb3354',
  '#ff6d3b',
  '#5559df',
  '#66ccff',
  '#9cd326',
  '#7f5347',
];

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

describe('GroupManagementAndColors — Sprint 4: Gestión de Grupos, Colapso y Paleta Oficial 18 Colores', () => {
  it('1. Paleta Oficial de 18 Colores para Grupos: exportada con los 18 valores hexadecimales exactos', () => {
    expect(GROUP_COLOR_PALETTE).toHaveLength(18);
    expect(GROUP_COLOR_PALETTE).toEqual(OFFICIAL_18_COLORS);
  });

  it('2. Menú Contextual de 3 puntos (...): abre popover, despliega paleta de 18 colores y selecciona nuevo color', async () => {
    const onRenameGroup = vi.fn().mockResolvedValue(undefined);
    const onDeleteGroup = vi.fn().mockResolvedValue(undefined);
    const onUpdateColor = vi.fn().mockResolvedValue(undefined);
    const onToggleCollapse = vi.fn();
    const onCollapseAll = vi.fn();

    const group: TaskGroupRead = {
      id: 10,
      board_id: 1,
      title: 'Sprint 4 Frontend',
      color: '#579bfc',
      position: 0,
      collapsed: false,
      items: [
        createMockItem({ id: 101, title: 'Item A', status_key: 'done' }),
        createMockItem({ id: 102, title: 'Item B', status_key: 'working' }),
      ],
    };

    render(
      <GroupHeader
        group={group}
        statuses={MOCK_STATUSES}
        onRenameGroup={onRenameGroup}
        onDeleteGroup={onDeleteGroup}
        onUpdateColor={onUpdateColor}
        onToggleCollapse={onToggleCollapse}
        onCollapseAll={onCollapseAll}
      />,
    );

    // Cabecera expandida visible con título y conteo de tareas
    expect(screen.getByText('Sprint 4 Frontend')).toBeInTheDocument();
    expect(screen.getByText('(2 tareas)')).toBeInTheDocument();

    // Botón de menú de 3 puntos
    const menuBtn = screen.getByTestId('group-menu-btn-10');
    expect(menuBtn).toBeInTheDocument();

    // Al hacer clic abre el popover con opciones de Monday.com
    fireEvent.click(menuBtn);
    expect(screen.getByTestId('group-menu-10')).toBeInTheDocument();
    expect(screen.getByTestId('group-menu-toggle-collapse-10')).toHaveTextContent('Contraer este grupo');
    expect(screen.getByTestId('group-menu-collapse-all-10')).toHaveTextContent('Contraer todos los grupos');
    expect(screen.getByTestId('group-menu-expand-all-10')).toHaveTextContent('Expandir todos los grupos');
    expect(screen.getByTestId('group-menu-color-btn-10')).toHaveTextContent('Cambiar color del grupo');
    expect(screen.getByTestId('group-menu-rename-10')).toHaveTextContent('Renombrar grupo');
    expect(screen.getByTestId('btn-delete-group-10')).toHaveTextContent('Eliminar grupo');

    // Desplegar paleta de 18 colores
    fireEvent.click(screen.getByTestId('group-menu-color-btn-10'));
    const palette = screen.getByTestId('group-palette-10');
    expect(palette).toBeInTheDocument();

    // Seleccionar color '#00c875' (done_green)
    const greenBtn = screen.getByTestId('group-palette-color-00c875');
    expect(greenBtn).toBeInTheDocument();
    fireEvent.click(greenBtn);

    expect(onUpdateColor).toHaveBeenCalledWith('#00c875');
  });

  it('3. Fila de Grupo Contraído (1:1 Monday.com): altura 36px, borde 4px, chevron derecho y mini-batería de estados (18px)', () => {
    const onRenameGroup = vi.fn().mockResolvedValue(undefined);
    const onDeleteGroup = vi.fn().mockResolvedValue(undefined);
    const onUpdateColor = vi.fn().mockResolvedValue(undefined);
    const onToggleCollapse = vi.fn();
    const onCollapseAll = vi.fn();

    const group: TaskGroupRead = {
      id: 20,
      board_id: 1,
      title: 'Grupo Contraído',
      color: '#df2f4a',
      position: 1,
      collapsed: true,
      items: [
        createMockItem({ id: 201, title: 'Item 1', status_key: 'done' }),
        createMockItem({ id: 202, title: 'Item 2', status_key: 'working' }),
        createMockItem({ id: 203, title: 'Item 3', status_key: 'blocked' }),
        createMockItem({ id: 204, title: 'Item 4', status_key: 'done' }),
      ],
    };

    render(
      <GroupHeader
        group={group}
        statuses={MOCK_STATUSES}
        onRenameGroup={onRenameGroup}
        onDeleteGroup={onDeleteGroup}
        onUpdateColor={onUpdateColor}
        onToggleCollapse={onToggleCollapse}
        onCollapseAll={onCollapseAll}
      />,
    );

    // Contenedor de fila compacta contraída de 36px
    const collapsedRow = screen.getByTestId('group-collapsed-row-20');
    expect(collapsedRow).toBeInTheDocument();
    expect(collapsedRow).toHaveClass('h-9');
    expect(collapsedRow).toHaveStyle({
      borderLeftWidth: '4px',
      borderLeftColor: '#df2f4a',
    });

    // Título y contador de tareas
    expect(screen.getByText('Grupo Contraído')).toBeInTheDocument();
    expect(screen.getByText('(4 tareas)')).toBeInTheDocument();

    // Mini-batería de resumen de estados de altura 18px
    const miniBattery = screen.getByTestId('mini-battery-summary-20');
    expect(miniBattery).toBeInTheDocument();
    expect(miniBattery).toHaveClass('h-[18px]');

    // Segmentos proporcionales: 2 done (50%), 1 working (25%), 1 blocked (25%)
    const doneSegment = screen.getByTestId('mini-battery-segment-20-done');
    expect(doneSegment).toHaveStyle({ width: '50%' });

    const workingSegment = screen.getByTestId('mini-battery-segment-20-working');
    expect(workingSegment).toHaveStyle({ width: '25%' });

    const blockedSegment = screen.getByTestId('mini-battery-segment-20-blocked');
    expect(blockedSegment).toHaveStyle({ width: '25%' });

    // Clic en chevron de expansión invoca onToggleCollapse
    fireEvent.click(screen.getByTestId('toggle-group-20'));
    expect(onToggleCollapse).toHaveBeenCalledTimes(1);
  });

  it('4. Conmutación masiva en el store: collapseAllGroups colapsa y expande todos los grupos del tablero activo', () => {
    const mockBoard: BoardDetailRead = {
      id: 1,
      workspace_id: 1,
      name: 'Tablero de Prueba',
      description: '',
      created_at: '2026-10-19T12:00:00Z',
      statuses: MOCK_STATUSES,
      groups: [
        {
          id: 1,
          board_id: 1,
          title: 'Grupo 1',
          color: '#579bfc',
          position: 0,
          collapsed: false,
          items: [],
        },
        {
          id: 2,
          board_id: 1,
          title: 'Grupo 2',
          color: '#00c875',
          position: 1,
          collapsed: false,
          items: [],
        },
      ],
    };

    useWorkspaceStore.setState({ activeBoard: mockBoard });

    // Contraer todos los grupos
    useWorkspaceStore.getState().collapseAllGroups(true);
    const collapsedBoard = useWorkspaceStore.getState().activeBoard;
    expect(collapsedBoard?.groups.every((g) => g.collapsed)).toBe(true);

    // Expandir todos los grupos
    useWorkspaceStore.getState().collapseAllGroups(false);
    const expandedBoard = useWorkspaceStore.getState().activeBoard;
    expect(expandedBoard?.groups.every((g) => !g.collapsed)).toBe(true);
  });
});
