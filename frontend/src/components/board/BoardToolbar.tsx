import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  Calendar,
  Check,
  CheckSquare,
  ChevronDown,
  Clock,
  DollarSign,
  EyeOff,
  Filter,
  FilterX,
  Search,
  User as UserIcon,
} from 'lucide-react';
import { PRIORITY_MAP, type BoardDetailRead, type UserRead } from '../../types';

export type ColumnKey =
  | 'assignee'
  | 'status'
  | 'due_date'
  | 'priority'
  | 'estimated_hours'
  | 'budget';

export type VisibleColumnsState = Record<ColumnKey, boolean>;

export type SortColumn =
  | 'none'
  | 'title'
  | 'status'
  | 'priority'
  | 'due_date'
  | 'estimated_hours'
  | 'budget'
  | 'assignee';

export type SortDirection = 'asc' | 'desc';

export interface BoardToolbarProps {
  board: BoardDetailRead;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterAssignee: string;
  onFilterAssigneeChange: (assignee: string) => void;
  filterStatus: string;
  onFilterStatusChange: (status: string) => void;
  filterPriority: string;
  onFilterPriorityChange: (priority: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  totalMatchingItems: number;
  availableUsers: UserRead[];
  visibleColumns: VisibleColumnsState;
  onToggleColumn: (key: ColumnKey) => void;
  onToggleAllColumns: (visible: boolean) => void;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSortChange: (column: SortColumn, direction: SortDirection) => void;
}

const COLUMN_DEFINITIONS: {
  key: ColumnKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: 'assignee', label: 'Responsable', icon: UserIcon },
  { key: 'status', label: 'Estado', icon: CheckSquare },
  { key: 'due_date', label: 'Vencimiento', icon: Calendar },
  { key: 'priority', label: 'Prioridad', icon: AlertTriangle },
  { key: 'estimated_hours', label: 'Horas', icon: Clock },
  { key: 'budget', label: 'Presupuesto', icon: DollarSign },
];

export const BoardToolbar: React.FC<BoardToolbarProps> = ({
  board,
  searchQuery,
  onSearchChange,
  filterAssignee,
  onFilterAssigneeChange,
  filterStatus,
  onFilterStatusChange,
  filterPriority,
  onFilterPriorityChange,
  onClearFilters,
  hasActiveFilters,
  totalMatchingItems,
  availableUsers,
  visibleColumns,
  onToggleColumn,
  onToggleAllColumns,
  sortColumn,
  sortDirection,
  onSortChange,
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isHideColumnsOpen, setIsHideColumnsOpen] = useState(false);
  const [colSearchQuery, setColSearchQuery] = useState('');

  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const hideRef = useRef<HTMLDivElement>(null);

  // Cerrar popovers al hacer click fuera o presionar Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (filterRef.current && !filterRef.current.contains(target)) {
        setIsFilterOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(target)) {
        setIsSortOpen(false);
      }
      if (hideRef.current && !hideRef.current.contains(target)) {
        setIsHideColumnsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFilterOpen(false);
        setIsSortOpen(false);
        setIsHideColumnsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const allItems = board.groups.flatMap((g) => g.items);

  // Conteo de columnas visibles
  const visibleCount = Object.values(visibleColumns).filter(Boolean).length;
  const totalCols = COLUMN_DEFINITIONS.length;
  const allVisible = visibleCount === totalCols;
  const hiddenCount = totalCols - visibleCount;

  // Filtrar lista de columnas por buscador en el popover
  const filteredColDefs = COLUMN_DEFINITIONS.filter((c) =>
    c.label.toLowerCase().includes(colSearchQuery.trim().toLowerCase()),
  );

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 bg-[#f7f8fa] p-2.5 rounded-xl border border-gray-200 select-none">
      {/* Botones principales de la Toolbar estilo Monday.com */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* 1. Buscar */}
        <div className="relative min-w-[200px] flex-1 sm:flex-initial">
          <Search className="w-4 h-4 text-[#676879] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            data-testid="board-search-input"
            aria-label="Buscar tareas en el tablero"
            placeholder="Buscar tareas..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white text-[#323338] placeholder-[#676879] focus:outline-none focus:border-[#0073ea]"
          />
        </div>

        {/* 2. Botón y Popover de Filtros Rápidos */}
        <div ref={filterRef} className="relative">
          <button
            type="button"
            data-testid="toolbar-filter-btn"
            onClick={() => {
              setIsFilterOpen((prev) => !prev);
              setIsSortOpen(false);
              setIsHideColumnsOpen(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              hasActiveFilters || isFilterOpen
                ? 'bg-[#edf5ff] border-[#0073ea] text-[#0073ea] font-semibold'
                : 'bg-white border-gray-300 text-[#323338] hover:bg-[#f6f7fb]'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filtrar</span>
            <ChevronDown className="w-3 h-3 text-[#676879]" />
          </button>

          {isFilterOpen && (
            <div
              data-testid="quick-filters-popover"
              className="absolute z-50 left-0 top-full mt-2 w-[540px] max-w-[92vw] bg-white border border-[#d0d4e4] rounded-xl shadow-2xl p-4 select-none animate-in fade-in zoom-in-95 duration-100 text-xs text-[#323338]"
            >
              {/* Cabecera del Popover */}
              <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#323338]">
                    Filtros rápidos
                  </span>
                  <span className="text-[11px] text-[#676879]">
                    (Se muestra un total de {totalMatchingItems} tareas)
                  </span>
                </div>
                {hasActiveFilters && (
                  <button
                    type="button"
                    data-testid="quick-filter-clear-all"
                    onClick={onClearFilters}
                    className="text-xs text-[#0073ea] hover:underline font-semibold cursor-pointer"
                  >
                    Borrar todo
                  </button>
                )}
              </div>

              {/* Tarjetas Scrollables Horizontales */}
              <div className="flex gap-3 overflow-x-auto pb-2">
                {/* Tarjeta Responsable */}
                <div className="w-44 shrink-0 bg-[#f7f8fa] p-2.5 rounded-lg border border-gray-200 flex flex-col gap-1.5">
                  <div className="font-bold text-[11px] text-[#323338] flex items-center justify-between">
                    <span>Responsable</span>
                    {filterAssignee && (
                      <button
                        type="button"
                        onClick={() => onFilterAssigneeChange('')}
                        className="text-[10px] text-[#0073ea] hover:underline"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                    <button
                      type="button"
                      data-testid="quick-filter-assignee-all"
                      onClick={() => onFilterAssigneeChange('')}
                      className={`text-left px-2 py-1 rounded text-xs transition-colors cursor-pointer flex items-center justify-between ${
                        filterAssignee === ''
                          ? 'bg-[#0073ea] text-white font-semibold'
                          : 'hover:bg-white text-[#323338]'
                      }`}
                    >
                      <span>Todos</span>
                      <span className="text-[10px] opacity-80">
                        {allItems.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      data-testid="quick-filter-assignee-unassigned"
                      onClick={() =>
                        onFilterAssigneeChange(
                          filterAssignee === 'unassigned' ? '' : 'unassigned',
                        )
                      }
                      className={`text-left px-2 py-1 rounded text-xs transition-colors cursor-pointer flex items-center justify-between ${
                        filterAssignee === 'unassigned'
                          ? 'bg-[#0073ea] text-white font-semibold'
                          : 'hover:bg-white text-[#323338]'
                      }`}
                    >
                      <span className="truncate">Sin asignar</span>
                      <span className="text-[10px] opacity-80">
                        {
                          allItems.filter(
                            (i) =>
                              i.assignee_id === null ||
                              i.assignee_id === undefined,
                          ).length
                        }
                      </span>
                    </button>
                    {availableUsers.map((u) => {
                      const count = allItems.filter(
                        (i) => i.assignee_id === u.id,
                      ).length;
                      const isSelected = filterAssignee === String(u.id);
                      return (
                        <button
                          key={u.id}
                          type="button"
                          data-testid={`quick-filter-assignee-${u.id}`}
                          onClick={() =>
                            onFilterAssigneeChange(
                              isSelected ? '' : String(u.id),
                            )
                          }
                          className={`text-left px-2 py-1 rounded text-xs transition-colors cursor-pointer flex items-center justify-between gap-1.5 ${
                            isSelected
                              ? 'bg-[#0073ea] text-white font-semibold'
                              : 'hover:bg-white text-[#323338]'
                          }`}
                        >
                          <span className="truncate">{u.full_name}</span>
                          <span className="text-[10px] opacity-80 shrink-0">
                            ({count})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tarjeta Estado */}
                <div className="w-44 shrink-0 bg-[#f7f8fa] p-2.5 rounded-lg border border-gray-200 flex flex-col gap-1.5">
                  <div className="font-bold text-[11px] text-[#323338] flex items-center justify-between">
                    <span>Estado</span>
                    {filterStatus && (
                      <button
                        type="button"
                        onClick={() => onFilterStatusChange('')}
                        className="text-[10px] text-[#0073ea] hover:underline"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                    <button
                      type="button"
                      data-testid="quick-filter-status-all"
                      onClick={() => onFilterStatusChange('')}
                      className={`text-left px-2 py-1 rounded text-xs transition-colors cursor-pointer flex items-center justify-between ${
                        filterStatus === ''
                          ? 'bg-[#0073ea] text-white font-semibold'
                          : 'hover:bg-white text-[#323338]'
                      }`}
                    >
                      <span>Todos</span>
                      <span className="text-[10px] opacity-80">
                        {allItems.length}
                      </span>
                    </button>
                    {board.statuses.map((st) => {
                      const count = allItems.filter(
                        (i) => i.status_key === st.key,
                      ).length;
                      const isSelected = filterStatus === st.key;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          data-testid={`quick-filter-status-${st.key}`}
                          onClick={() =>
                            onFilterStatusChange(isSelected ? '' : st.key)
                          }
                          className={`text-left px-2 py-1 rounded text-xs transition-colors cursor-pointer flex items-center justify-between gap-1.5 ${
                            isSelected
                              ? 'ring-2 ring-[#0073ea] bg-white font-bold'
                              : 'hover:bg-white text-[#323338]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: st.color }}
                            />
                            <span className="truncate">{st.label}</span>
                          </div>
                          <span className="text-[10px] opacity-75 shrink-0">
                            ({count})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tarjeta Prioridad */}
                <div className="w-44 shrink-0 bg-[#f7f8fa] p-2.5 rounded-lg border border-gray-200 flex flex-col gap-1.5">
                  <div className="font-bold text-[11px] text-[#323338] flex items-center justify-between">
                    <span>Prioridad</span>
                    {filterPriority && (
                      <button
                        type="button"
                        onClick={() => onFilterPriorityChange('')}
                        className="text-[10px] text-[#0073ea] hover:underline"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                    <button
                      type="button"
                      data-testid="quick-filter-priority-all"
                      onClick={() => onFilterPriorityChange('')}
                      className={`text-left px-2 py-1 rounded text-xs transition-colors cursor-pointer flex items-center justify-between ${
                        filterPriority === ''
                          ? 'bg-[#0073ea] text-white font-semibold'
                          : 'hover:bg-white text-[#323338]'
                      }`}
                    >
                      <span>Todas</span>
                      <span className="text-[10px] opacity-80">
                        {allItems.length}
                      </span>
                    </button>
                    {(['critical', 'high', 'medium', 'low'] as const).map(
                      (pKey) => {
                        const meta = PRIORITY_MAP[pKey];
                        const count = allItems.filter(
                          (i) => i.priority.toLowerCase() === pKey,
                        ).length;
                        const isSelected =
                          filterPriority.toLowerCase() === pKey;
                        return (
                          <button
                            key={pKey}
                            type="button"
                            data-testid={`quick-filter-priority-${pKey}`}
                            onClick={() =>
                              onFilterPriorityChange(isSelected ? '' : pKey)
                            }
                            className={`text-left px-2 py-1 rounded text-xs transition-colors cursor-pointer flex items-center justify-between gap-1.5 ${
                              isSelected
                                ? 'ring-2 ring-[#0073ea] bg-white font-bold'
                                : 'hover:bg-white text-[#323338]'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: meta.bgColor }}
                              />
                              <span className="truncate">{meta.label}</span>
                            </div>
                            <span className="text-[10px] opacity-75 shrink-0">
                              ({count})
                            </span>
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Botón y Popover de Ordenamiento Multi-Criterio */}
        <div ref={sortRef} className="relative">
          <button
            type="button"
            data-testid="toolbar-sort-btn"
            onClick={() => {
              setIsSortOpen((prev) => !prev);
              setIsFilterOpen(false);
              setIsHideColumnsOpen(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              sortColumn !== 'none' || isSortOpen
                ? 'bg-[#edf5ff] border-[#0073ea] text-[#0073ea] font-semibold'
                : 'bg-white border-gray-300 text-[#323338] hover:bg-[#f6f7fb]'
            }`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Ordenar</span>
            {sortColumn !== 'none' && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#0073ea]" />
            )}
          </button>

          {isSortOpen && (
            <div
              data-testid="sort-popover"
              className="absolute z-50 left-0 top-full mt-2 w-72 bg-white border border-[#d0d4e4] rounded-xl shadow-2xl p-3.5 select-none animate-in fade-in zoom-in-95 duration-100 text-xs text-[#323338]"
            >
              <div className="font-bold text-xs text-[#323338] mb-2.5 flex items-center justify-between border-b border-gray-100 pb-2">
                <span>Ordenar tareas</span>
                {sortColumn !== 'none' && (
                  <button
                    type="button"
                    data-testid="sort-clear-btn"
                    onClick={() => onSortChange('none', 'asc')}
                    className="text-[11px] text-[#e2445c] hover:underline font-semibold cursor-pointer"
                  >
                    Borrar orden
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] text-[#676879] font-medium mb-1">
                    Ordenar por columna:
                  </label>
                  <select
                    data-testid="sort-column-select"
                    value={sortColumn}
                    onChange={(e) =>
                      onSortChange(e.target.value as SortColumn, sortDirection)
                    }
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white text-[#323338] focus:outline-none focus:border-[#0073ea] cursor-pointer"
                  >
                    <option value="none">Predeterminado (orden manual)</option>
                    <option value="title">Nombre de tarea</option>
                    <option value="status">Estado</option>
                    <option value="priority">Prioridad</option>
                    <option value="due_date">Fecha límite</option>
                    <option value="estimated_hours">Horas estimadas</option>
                    <option value="budget">Presupuesto</option>
                    <option value="assignee">Responsable</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-[#676879] font-medium mb-1">
                    Dirección:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      data-testid="sort-dir-asc-btn"
                      onClick={() => onSortChange(sortColumn, 'asc')}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                        sortDirection === 'asc'
                          ? 'bg-[#0073ea] text-white border-[#0073ea]'
                          : 'bg-white border-gray-300 text-[#323338] hover:bg-[#f6f7fb]'
                      }`}
                    >
                      <span>Ascendente</span>
                      {sortDirection === 'asc' && (
                        <Check className="w-3 h-3" />
                      )}
                    </button>
                    <button
                      type="button"
                      data-testid="sort-dir-desc-btn"
                      onClick={() => onSortChange(sortColumn, 'desc')}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                        sortDirection === 'desc'
                          ? 'bg-[#0073ea] text-white border-[#0073ea]'
                          : 'bg-white border-gray-300 text-[#323338] hover:bg-[#f6f7fb]'
                      }`}
                    >
                      <span>Descendente</span>
                      {sortDirection === 'desc' && (
                        <Check className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. Botón y Popover de Ocultar / Mostrar Columnas */}
        <div ref={hideRef} className="relative">
          <button
            type="button"
            data-testid="toolbar-hide-columns-btn"
            onClick={() => {
              setIsHideColumnsOpen((prev) => !prev);
              setIsFilterOpen(false);
              setIsSortOpen(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              hiddenCount > 0 || isHideColumnsOpen
                ? 'bg-[#edf5ff] border-[#0073ea] text-[#0073ea] font-semibold'
                : 'bg-white border-gray-300 text-[#323338] hover:bg-[#f6f7fb]'
            }`}
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>Ocultar</span>
            {hiddenCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#0073ea] text-white font-bold shrink-0">
                {hiddenCount}
              </span>
            )}
          </button>

          {isHideColumnsOpen && (
            <div
              data-testid="hide-columns-popover"
              className="absolute z-50 left-0 top-full mt-2 w-72 bg-white border border-[#d0d4e4] rounded-xl shadow-2xl p-3.5 select-none animate-in fade-in zoom-in-95 duration-100 text-xs text-[#323338]"
            >
              <div className="font-bold text-xs text-[#323338] mb-2">
                Mostrar / Ocultar columnas
              </div>

              {/* Buscador de columnas */}
              <input
                type="text"
                data-testid="hide-columns-search"
                placeholder="Buscar columnas..."
                value={colSearchQuery}
                onChange={(e) => setColSearchQuery(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 bg-white mb-2.5 focus:outline-none focus:border-[#0073ea]"
              />

              {/* Master toggle */}
              <label className="flex items-center justify-between p-1.5 hover:bg-[#f6f7fb] rounded-lg cursor-pointer font-semibold border-b border-gray-100 pb-2 mb-1.5">
                <span>Todas las columnas ({visibleCount} visibles)</span>
                <input
                  type="checkbox"
                  data-testid="toggle-all-columns-visibility"
                  checked={allVisible}
                  onChange={() => onToggleAllColumns(!allVisible)}
                  className="w-4 h-4 rounded text-[#0073ea] focus:ring-[#0073ea] cursor-pointer"
                />
              </label>

              {/* Checklist con iconos temáticos */}
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {filteredColDefs.map((col) => {
                  const Icon = col.icon;
                  const isVisible = visibleColumns[col.key];
                  return (
                    <label
                      key={col.key}
                      data-testid={`col-item-${col.key}`}
                      className="flex items-center justify-between p-1.5 hover:bg-[#f6f7fb] rounded-lg cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 text-[#676879]" />
                        <span>{col.label}</span>
                      </div>
                      <input
                        type="checkbox"
                        data-testid={`col-toggle-${col.key}`}
                        checked={isVisible}
                        onChange={() => onToggleColumn(col.key)}
                        className="w-4 h-4 rounded text-[#0073ea] focus:ring-[#0073ea] cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Botón Limpiar Filtros visible directo si hay filtros activos */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            data-testid="btn-clear-filters"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-[#e2445c] hover:bg-red-100 text-xs font-semibold transition-colors cursor-pointer"
          >
            <FilterX className="w-3.5 h-3.5" />
            <span>Limpiar filtros</span>
          </button>
        )}
      </div>

      {/* Selects accesibles sincronizados para retrocompatibilidad total con suites existentes */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          data-testid="board-filter-assignee"
          aria-label="Filtrar por responsable"
          value={filterAssignee}
          onChange={(e) => onFilterAssigneeChange(e.target.value)}
          className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-300 bg-white text-[#323338] focus:outline-none focus:border-[#0073ea] cursor-pointer"
        >
          <option value="">Persona: Todos</option>
          <option value="unassigned">Persona: Sin asignar</option>
          {availableUsers.map((u) => (
            <option key={u.id} value={String(u.id)}>
              Persona: {u.full_name}
            </option>
          ))}
        </select>

        <select
          data-testid="board-filter-status"
          aria-label="Filtrar por estado"
          value={filterStatus}
          onChange={(e) => onFilterStatusChange(e.target.value)}
          className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-300 bg-white text-[#323338] focus:outline-none focus:border-[#0073ea] cursor-pointer"
        >
          <option value="">Estado: Todos</option>
          {board.statuses.map((st) => (
            <option key={st.key} value={st.key}>
              Estado: {st.label}
            </option>
          ))}
        </select>

        <select
          data-testid="board-filter-priority"
          aria-label="Filtrar por prioridad"
          value={filterPriority}
          onChange={(e) => onFilterPriorityChange(e.target.value)}
          className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-300 bg-white text-[#323338] focus:outline-none focus:border-[#0073ea] cursor-pointer"
        >
          <option value="">Prioridad: Todas</option>
          <option value="critical">Prioridad: Crítica</option>
          <option value="high">Prioridad: Alta</option>
          <option value="medium">Prioridad: Media</option>
          <option value="low">Prioridad: Baja</option>
        </select>
      </div>
    </div>
  );
};
