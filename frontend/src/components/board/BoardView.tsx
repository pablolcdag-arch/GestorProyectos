import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Calendar,
  CalendarRange,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Edit2,
  FilterX,
  FolderKanban,
  Kanban,
  Layers,
  MessageSquare,
  Palette,
  Plus,
  Search,
  Table2,
  Trash2,
  User as UserIcon,
  X,
  Zap,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import {
  MONDAY_COLOR_PALETTE,
  PRIORITY_MAP,
  type BoardStatusRead,
  type TaskGroupRead,
  type TaskItemRead,
  type TaskItemUpdate,
  type UserRead,
} from '../../types';
import { AutomationsModal } from './AutomationsModal';
import { DashboardView } from './DashboardView';
import { GroupFooterSummary } from './GroupFooterSummary';
import { ItemDetailDrawer } from './ItemDetailDrawer';
import { KanbanView } from './KanbanView';
import { StatusCell } from './StatusCell';
import { StatusManagerModal } from './StatusManagerModal';
import { TimelineCalendarView } from './TimelineCalendarView';

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

export const BoardView: React.FC = () => {
  const {
    activeBoard,
    isLoadingBoard,
    error,
    clearError,
    toggleGroupCollapse,
    createGroup,
    updateGroup,
    deleteGroup,
    createItem,
    updateItem,
    deleteItem,
    duplicateItem,
    openItemDrawer,
  } = useWorkspaceStore();

  const { users, teamUsers } = useAuthStore();

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isAutomationsModalOpen, setIsAutomationsModalOpen] = useState(false);

  // Conmutador de 4 Vistas: Tabla Principal | Kanban | Cronograma | Dashboard
  const [viewMode, setViewMode] = useState<
    'table' | 'kanban' | 'timeline' | 'dashboard'
  >('table');

  // Búsqueda y Filtros en Vivo
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  // Estado para crear un nuevo grupo
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#579bfc');

  // Estado para editar cabecera de un grupo existente
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editGroupTitle, setEditGroupTitle] = useState('');
  const [editGroupColor, setEditGroupColor] = useState('#579bfc');

  // Estado para edición inline de título y notas de una tarea
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [draftItemTitle, setDraftItemTitle] = useState('');
  const [draftItemNotes, setDraftItemNotes] = useState('');

  // Estado para fila rápida "+ Agregar tarea" por grupo
  const [quickAddTitles, setQuickAddTitles] = useState<Record<number, string>>(
    {},
  );

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
  const todayIso = getTodayIsoDate();

  // Consolidar usuarios disponibles para el selector de responsable
  const availableUsersMap = new Map<number, UserRead>();
  for (const u of users.length > 0 ? users : teamUsers) {
    availableUsersMap.set(u.id, u);
  }
  for (const item of allItems) {
    if (item.assignee) {
      availableUsersMap.set(item.assignee.id, item.assignee);
    }
  }
  const availableUsers = Array.from(availableUsersMap.values());

  // Función de filtrado en vivo aplicable a Tabla, Kanban y Cronograma
  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    Boolean(filterAssignee) ||
    Boolean(filterStatus) ||
    Boolean(filterPriority);

  const matchesFilter = (item: TaskItemRead): boolean => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const inTitle = item.title.toLowerCase().includes(q);
      const inNotes = (item.notes || '').toLowerCase().includes(q);
      if (!inTitle && !inNotes) {
        return false;
      }
    }

    if (filterAssignee === 'unassigned') {
      if (item.assignee_id !== null && item.assignee_id !== undefined) {
        return false;
      }
    } else if (filterAssignee) {
      if (String(item.assignee_id) !== filterAssignee) {
        return false;
      }
    }

    if (filterStatus && item.status_key !== filterStatus) {
      return false;
    }

    if (
      filterPriority &&
      item.priority.toLowerCase() !== filterPriority.toLowerCase()
    ) {
      return false;
    }

    return true;
  };

  const filteredAllItems = allItems.filter(matchesFilter);

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterAssignee('');
    setFilterStatus('');
    setFilterPriority('');
  };

  // Exportación CSV del Tablero
  const handleExportCsv = async () => {
    let csvContent = '';
    try {
      csvContent = await api.exportBoardCsv(activeBoard.id);
    } catch {
      // Respaldo de generación CSV en cliente en caso de entorno desconectado
      const header =
        'ID,Grupo,Tarea,Estado,Prioridad,Responsable,Fecha Inicio,Fecha Limite,Horas Estimadas,Presupuesto,Notas';
      const rows = activeBoard.groups.flatMap((grp) =>
        grp.items.map((item) => {
          const stLabel = statusMap.get(item.status_key)?.label ?? item.status_key;
          const assigneeName = item.assignee?.full_name ?? 'Sin asignar';
          const hours = (item.estimated_hours ?? 0).toFixed(2);
          const budget = (item.budget ?? 0).toFixed(2);
          return `${item.id},"${grp.title}","${item.title}","${stLabel}","${item.priority}","${assigneeName}","${item.start_date ?? ''}","${item.due_date ?? ''}",${hours},${budget},"${item.notes ?? ''}"`;
        }),
      );
      csvContent = [header, ...rows].join('\n');
    }

    try {
      if (
        typeof window !== 'undefined' &&
        typeof URL !== 'undefined' &&
        typeof URL.createObjectURL === 'function'
      ) {
        const blob = new Blob([csvContent], {
          type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `board_${activeBoard.id}_export.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch {
      // En entorno jsdom de testing ignoramos errores de descarga nativa del navegador
    }
  };

  // Handlers de Grupos
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newGroupTitle.trim();
    if (!cleaned) return;
    try {
      await createGroup(activeBoard.id, {
        title: cleaned,
        color: newGroupColor,
      });
      setNewGroupTitle('');
      setNewGroupColor('#579bfc');
      setIsCreatingGroup(false);
    } catch {
      // El store ya gestiona el estado de error
    }
  };

  const handleStartEditGroup = (group: TaskGroupRead) => {
    setEditingGroupId(group.id);
    setEditGroupTitle(group.title);
    setEditGroupColor(group.color);
  };

  const handleSaveEditGroup = async (groupId: number) => {
    const cleaned = editGroupTitle.trim();
    if (!cleaned) return;
    setEditingGroupId(null);
    try {
      await updateGroup(groupId, {
        title: cleaned,
        color: editGroupColor,
      });
    } catch {
      // Rollback y error ya manejados por el store
    }
  };

  const handleDeleteGroup = async (groupId: number) => {
    try {
      await deleteGroup(groupId);
    } catch {
      // Rollback y error ya manejados por el store
    }
  };

  // Handlers de Tareas (Items)
  const handleQuickAddItem = async (groupId: number) => {
    const rawTitle = quickAddTitles[groupId] ?? '';
    const cleaned = rawTitle.trim();
    if (!cleaned) return;

    setQuickAddTitles((prev) => ({ ...prev, [groupId]: '' }));
    try {
      await createItem(groupId, { title: cleaned });
    } catch {
      setQuickAddTitles((prev) => ({ ...prev, [groupId]: rawTitle }));
    }
  };

  const handleStartEditItemText = (item: TaskItemRead) => {
    setEditingItemId(item.id);
    setDraftItemTitle(item.title);
    setDraftItemNotes(item.notes || '');
  };

  const handleSaveItemText = async (itemId: number) => {
    const cleanedTitle = draftItemTitle.trim();
    if (!cleanedTitle) return;
    const notesToSave = draftItemNotes.trim();
    setEditingItemId(null);
    try {
      await updateItem(itemId, {
        title: cleanedTitle,
        notes: notesToSave,
      });
    } catch {
      // Rollback automático en store
    }
  };

  const handleInlineUpdate = async (
    itemId: number,
    payload: TaskItemUpdate,
    optimisticAssignee?: UserRead | null,
  ) => {
    try {
      await updateItem(itemId, payload, optimisticAssignee);
    } catch {
      // Rollback automático en store
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    try {
      await deleteItem(itemId);
    } catch {
      // Rollback automático en store
    }
  };

  const handleDuplicateItem = async (itemId: number) => {
    try {
      await duplicateItem(itemId);
    } catch {
      // Error gestionado en store
    }
  };

  return (
    <main
      data-testid="board-main-container"
      className="flex-1 overflow-y-auto bg-white p-6 space-y-6 font-sans font-['Figtree',Roboto,-apple-system,BlinkMacSystemFont,sans-serif]"
    >
      {/* Banner de Error Descartable (Optimistic Rollback Feedback) */}
      {error && (
        <div
          role="alert"
          data-testid="board-error-banner"
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm shadow-2xs"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-[#e2445c] shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button
            type="button"
            onClick={clearError}
            data-testid="btn-dismiss-board-error"
            aria-label="Cerrar alerta de error"
            className="p-1 rounded-lg text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cabecera del Tablero */}
      <div className="border-b border-gray-200 pb-5 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
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

          <div className="flex items-center gap-2 flex-wrap">
            {/* Conmutador de 4 Vistas: Tabla Principal | Kanban | Cronograma | Dashboard */}
            <div
              role="group"
              aria-label="Selector de vista del tablero"
              className="inline-flex items-center p-1 rounded-xl bg-[#f5f6f8] border border-gray-200 flex-wrap"
            >
              <button
                type="button"
                onClick={() => setViewMode('table')}
                data-testid="view-tab-table"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-[#0073ea] shadow-2xs'
                    : 'text-[#676879] hover:text-[#323338]'
                }`}
              >
                <Table2 className="w-3.5 h-3.5" />
                <span data-testid="btn-view-table">Tabla Principal</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                data-testid="view-tab-kanban"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-white text-[#0073ea] shadow-2xs'
                    : 'text-[#676879] hover:text-[#323338]'
                }`}
              >
                <Kanban className="w-3.5 h-3.5" />
                <span data-testid="btn-view-kanban">Kanban</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                data-testid="view-tab-timeline"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'timeline'
                    ? 'bg-white text-[#0073ea] shadow-2xs'
                    : 'text-[#676879] hover:text-[#323338]'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5" />
                <span>Cronograma</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('dashboard')}
                data-testid="view-tab-dashboard"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'dashboard'
                    ? 'bg-white text-[#0073ea] shadow-2xs'
                    : 'text-[#676879] hover:text-[#323338]'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => void handleExportCsv()}
              data-testid="btn-export-csv"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-300 text-[#323338] hover:bg-gray-50 text-xs font-semibold transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#0073ea]" />
              <span>Exportar CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCreatingGroup((prev) => !prev)}
              data-testid="btn-new-group"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#0073ea] text-[#0073ea] hover:bg-[#f0f7ff] text-xs font-semibold transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nuevo Grupo</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAutomationsModalOpen(true)}
              data-testid="btn-open-automations-modal"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50/70 hover:bg-amber-100 text-amber-900 text-xs font-semibold transition-all cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
              <span>Automatizaciones</span>
            </button>

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

        {/* Barra de Búsqueda y Filtros en Vivo */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 bg-[#f7f8fa] p-3 rounded-xl border border-gray-200">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-[#676879] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              data-testid="board-search-input"
              aria-label="Buscar tareas en el tablero"
              placeholder="Buscar tareas por título o notas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white text-[#323338] placeholder-[#676879] focus:outline-none focus:border-[#0073ea]"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              data-testid="board-filter-assignee"
              aria-label="Filtrar por responsable"
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
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
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-300 bg-white text-[#323338] focus:outline-none focus:border-[#0073ea] cursor-pointer"
            >
              <option value="">Estado: Todos</option>
              {activeBoard.statuses.map((st) => (
                <option key={st.key} value={st.key}>
                  Estado: {st.label}
                </option>
              ))}
            </select>

            <select
              data-testid="board-filter-priority"
              aria-label="Filtrar por prioridad"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-300 bg-white text-[#323338] focus:outline-none focus:border-[#0073ea] cursor-pointer"
            >
              <option value="">Prioridad: Todas</option>
              <option value="critical">Prioridad: Crítica</option>
              <option value="high">Prioridad: Alta</option>
              <option value="medium">Prioridad: Media</option>
              <option value="low">Prioridad: Baja</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                data-testid="btn-clear-filters"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-[#e2445c] hover:bg-red-100 text-xs font-semibold transition-colors cursor-pointer"
              >
                <FilterX className="w-3.5 h-3.5" />
                <span>Limpiar filtros</span>
              </button>
            )}
          </div>
        </div>

        {/* Formulario inline para crear un Nuevo Grupo */}
        {isCreatingGroup && (
          <form
            onSubmit={(e) => void handleCreateGroup(e)}
            data-testid="form-new-group"
            className="p-4 rounded-xl bg-[#f7f8fa] border border-gray-200 flex flex-col sm:flex-row sm:items-center gap-3"
          >
            <input
              type="text"
              placeholder="Nombre del nuevo grupo (ej: Backlog Q4)"
              aria-label="Título del nuevo grupo"
              data-testid="input-new-group-title"
              value={newGroupTitle}
              onChange={(e) => setNewGroupTitle(e.target.value)}
              className="flex-1 px-3 py-2 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:border-[#0073ea]"
              autoFocus
            />

            <div className="flex items-center gap-1.5 flex-wrap">
              {MONDAY_COLOR_PALETTE.slice(0, 8).map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setNewGroupColor(hex)}
                  aria-label={`Color de grupo ${hex}`}
                  className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                    newGroupColor.toLowerCase() === hex.toLowerCase()
                      ? 'ring-2 ring-offset-1 ring-[#323338] scale-110'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCreatingGroup(false)}
                className="px-3 py-1.5 text-xs font-medium text-[#676879] hover:bg-gray-200/60 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                data-testid="btn-submit-new-group"
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#0073ea] hover:bg-[#0060b9] text-white cursor-pointer"
              >
                Crear Grupo
              </button>
            </div>
          </form>
        )}

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

      {/* Renderizado Condicional de las 4 Vistas */}
      {viewMode === 'kanban' ? (
        <KanbanView board={activeBoard} filteredItems={filteredAllItems} />
      ) : viewMode === 'timeline' ? (
        <TimelineCalendarView
          board={activeBoard}
          filteredItems={filteredAllItems}
        />
      ) : viewMode === 'dashboard' ? (
        <DashboardView board={activeBoard} />
      ) : (
        <div className="space-y-8">
          {activeBoard.groups.map((group: TaskGroupRead) => {
            const visibleItems = group.items.filter(matchesFilter);
            const totalGroupItems = group.items.length;
            const isEditingThisGroup = editingGroupId === group.id;

            const groupTotalHours =
              Math.round(
                group.items.reduce(
                  (acc, i) => acc + (i.estimated_hours ?? 0),
                  0,
                ) * 100,
              ) / 100;
            const groupTotalBudget =
              Math.round(
                group.items.reduce((acc, i) => acc + (i.budget ?? 0), 0) * 100,
              ) / 100;

            return (
              <section
                key={group.id}
                data-testid={`task-group-${group.id}`}
                className="space-y-2"
              >
                {/* Cabecera del Grupo */}
                <div className="flex items-center justify-between gap-2">
                  {isEditingThisGroup ? (
                    <div className="flex items-center gap-2 flex-wrap bg-[#f7f8fa] px-3 py-1.5 rounded-xl border border-[#0073ea]">
                      <input
                        type="text"
                        aria-label={`Editar título del grupo ${group.title}`}
                        data-testid={`input-edit-group-title-${group.id}`}
                        value={editGroupTitle}
                        onChange={(e) => setEditGroupTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void handleSaveEditGroup(group.id);
                          }
                        }}
                        className="px-2.5 py-1 text-sm font-bold rounded-lg border border-gray-300 bg-white focus:outline-none focus:border-[#0073ea]"
                        autoFocus
                      />

                      <div className="flex items-center gap-1">
                        {MONDAY_COLOR_PALETTE.slice(0, 6).map((hex) => (
                          <button
                            key={hex}
                            type="button"
                            onClick={() => setEditGroupColor(hex)}
                            className={`w-4 h-4 rounded-full cursor-pointer ${
                              editGroupColor.toLowerCase() === hex.toLowerCase()
                                ? 'ring-2 ring-offset-1 ring-[#323338]'
                                : ''
                            }`}
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleSaveEditGroup(group.id)}
                        data-testid={`btn-save-group-${group.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#00c875] text-white text-xs font-semibold cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Guardar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingGroupId(null)}
                        className="p-1 text-[#676879] hover:text-[#323338] cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
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

                      <div className="flex items-center gap-1 ml-2">
                        <button
                          type="button"
                          onClick={() => handleStartEditGroup(group)}
                          data-testid={`btn-edit-group-${group.id}`}
                          aria-label={`Editar grupo ${group.title}`}
                          title="Editar grupo"
                          className="p-1 rounded-md text-[#676879] hover:text-[#323338] hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleDeleteGroup(group.id)}
                          data-testid={`btn-delete-group-${group.id}`}
                          aria-label={`Eliminar grupo ${group.title}`}
                          title="Eliminar grupo"
                          className="p-1 rounded-md text-[#676879] hover:text-[#e2445c] hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tabla de Filas (Items) estilo Monday Work OS */}
                {!group.collapsed && (
                  <div
                    className="rounded-xl border border-[#d0d4e4] overflow-hidden shadow-2xs bg-white"
                    style={{
                      borderLeftWidth: '4px',
                      borderLeftColor: group.color,
                    }}
                  >
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left font-sans">
                        <thead>
                          <tr className="bg-[#f7f8fa] border-b border-[#d0d4e4] text-[11px] font-bold uppercase tracking-wider text-[#676879] h-9 min-h-[36px] max-h-[36px] leading-[36px]">
                            {/* Columna 0: Checkbox y menú lateral de fila */}
                            <th className="w-10 min-w-[40px] max-w-[40px] h-9 min-h-[36px] max-h-[36px] p-0 text-center border-r border-[#d0d4e4] bg-[#f7f8fa]">
                              <div className="flex items-center justify-center h-full">
                                <input
                                  type="checkbox"
                                  aria-label="Seleccionar todas las tareas"
                                  className="w-3.5 h-3.5 rounded border-[#d0d4e4] text-[#0073ea] focus:ring-[#0073ea] cursor-pointer"
                                />
                              </div>
                            </th>

                            {/* Columna 1: Nombre de Tarea (Sticky) */}
                            <th className="w-[331px] min-w-[331px] h-9 min-h-[36px] max-h-[36px] px-3 text-left border-r border-[#d0d4e4] sticky left-10 z-10 bg-[#f7f8fa] truncate">
                              Tarea
                            </th>

                            {/* Columna 2: Responsable */}
                            <th className="w-[98px] min-w-[98px] h-9 min-h-[36px] max-h-[36px] px-2 text-center border-r border-[#d0d4e4] truncate">
                              Responsable
                            </th>

                            {/* Columna 3: Estado */}
                            <th className="w-[134px] min-w-[134px] h-9 min-h-[36px] max-h-[36px] px-2 text-center border-r border-[#d0d4e4] truncate">
                              Estado
                            </th>

                            {/* Columna 4: Prioridad */}
                            <th className="w-[140px] min-w-[140px] h-9 min-h-[36px] max-h-[36px] px-2 text-center border-r border-[#d0d4e4] truncate">
                              Prioridad
                            </th>

                            {/* Columna 5: Fecha límite */}
                            <th className="w-[140px] min-w-[140px] h-9 min-h-[36px] max-h-[36px] px-2 text-center border-r border-[#d0d4e4] truncate">
                              Fecha límite
                            </th>

                            {/* Columna 6: Horas */}
                            <th className="w-[140px] min-w-[140px] h-9 min-h-[36px] max-h-[36px] px-2 text-center border-r border-[#d0d4e4] truncate">
                              Horas
                            </th>

                            {/* Columna 7: Presupuesto */}
                            <th className="w-[140px] min-w-[140px] h-9 min-h-[36px] max-h-[36px] px-2 text-center border-r border-[#d0d4e4] truncate">
                              Presupuesto
                            </th>

                            {/* Columna 8: Acciones */}
                            <th className="w-[140px] min-w-[140px] h-9 min-h-[36px] max-h-[36px] px-2 text-center border-r border-[#d0d4e4] truncate">
                              Acciones
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#d0d4e4] text-xs">
                          {visibleItems.map((item) => {
                            const priorityMeta = PRIORITY_MAP[
                              item.priority.toLowerCase()
                            ] ?? {
                              key: item.priority,
                              label: item.priority,
                              bgColor: '#579bfc',
                              textColor: '#ffffff',
                            };

                            const isEditingThisItem = editingItemId === item.id;
                            const isOverdue =
                              Boolean(item.due_date) &&
                              item.due_date! < todayIso &&
                              item.status_key !== 'done';

                            const commentsCount = item.comments_count ?? 0;
                            const checklistTotal = item.checklist_total ?? 0;
                            const checklistCompleted =
                              item.checklist_completed ?? 0;

                            return (
                              <tr
                                key={item.id}
                                data-testid={`task-row-${item.id}`}
                                className="h-9 min-h-[36px] max-h-[36px] leading-[36px] border-b border-[#d0d4e4] hover:bg-[#f6f7fb] transition-colors group/row"
                              >
                                {/* Checkbox y menú lateral de fila */}
                                <td className="w-10 min-w-[40px] max-w-[40px] h-9 min-h-[36px] max-h-[36px] border-r border-[#d0d4e4] p-0 text-center bg-white group-hover/row:bg-[#f6f7fb]">
                                  <div className="flex items-center justify-center h-full">
                                    <input
                                      type="checkbox"
                                      aria-label={`Seleccionar tarea ${item.title}`}
                                      className="w-3.5 h-3.5 rounded border-[#d0d4e4] text-[#0073ea] focus:ring-[#0073ea] cursor-pointer"
                                    />
                                  </div>
                                </td>

                                {/* Columna 1: Tarea (Sticky) */}
                                <td className="w-[331px] min-w-[331px] h-9 min-h-[36px] max-h-[36px] px-3 border-r border-[#d0d4e4] sticky left-10 z-10 bg-white group-hover/row:bg-[#f6f7fb] focus-within:border-[#0073ea] focus-within:ring-1 focus-within:ring-[#0073ea]">
                                  {isEditingThisItem ? (
                                    <div className="flex items-center gap-1.5 h-full">
                                      <input
                                        type="text"
                                        data-testid={`task-title-input-${item.id}`}
                                        aria-label={`Editar título de tarea ${item.id}`}
                                        value={draftItemTitle}
                                        onChange={(e) =>
                                          setDraftItemTitle(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            void handleSaveItemText(item.id);
                                          } else if (e.key === 'Escape') {
                                            setEditingItemId(null);
                                          }
                                        }}
                                        className="flex-1 h-7 px-2 text-xs font-medium rounded border border-[#0073ea] ring-1 ring-[#0073ea] bg-white focus:outline-none"
                                        autoFocus
                                      />
                                      <input
                                        type="text"
                                        data-testid={`task-notes-input-${item.id}`}
                                        aria-label={`Editar notas de tarea ${item.id}`}
                                        placeholder="Notas..."
                                        value={draftItemNotes}
                                        onChange={(e) =>
                                          setDraftItemNotes(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            void handleSaveItemText(item.id);
                                          }
                                        }}
                                        className="w-24 h-7 px-2 text-xs rounded border border-[#d0d4e4] bg-white focus:outline-none focus:border-[#0073ea] focus:ring-1 focus:ring-[#0073ea]"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void handleSaveItemText(item.id)
                                        }
                                        data-testid={`task-title-save-${item.id}`}
                                        className="px-2 h-7 rounded bg-[#0073ea] text-white text-xs font-semibold cursor-pointer shrink-0"
                                      >
                                        Guardar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingItemId(null)}
                                        className="px-1.5 h-7 rounded text-xs text-[#676879] hover:bg-gray-100 cursor-pointer shrink-0"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between gap-2 h-full">
                                      <div
                                        data-testid={`task-title-display-${item.id}`}
                                        onClick={() =>
                                          handleStartEditItemText(item)
                                        }
                                        className="group/title flex-1 min-w-0 cursor-pointer rounded -mx-1 px-1 py-0.5 hover:bg-white/90 transition-colors flex items-center gap-1.5"
                                        title="Clic para editar título o notas"
                                      >
                                        <span className="font-medium text-[#323338] group-hover/title:text-[#0073ea] transition-colors truncate text-xs">
                                          {item.title}
                                        </span>
                                        <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover/title:opacity-100 shrink-0" />
                                        {item.notes && (
                                          <span className="text-[11px] text-[#676879] truncate max-w-[90px]">
                                            — {item.notes}
                                          </span>
                                        )}
                                      </div>

                                      {/* Botón de Colaboración (Comentarios, Checklist e Historial) */}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void openItemDrawer(item.id)
                                        }
                                        data-testid={`btn-open-drawer-${item.id}`}
                                        aria-label={`Abrir panel de colaboración de ${item.title}`}
                                        title="Comentarios, Checklist y Actividad"
                                        className="inline-flex items-center gap-1.5 px-2 h-6 rounded border border-[#d0d4e4] bg-white hover:border-[#0073ea] hover:text-[#0073ea] text-[11px] font-semibold text-[#676879] transition-colors cursor-pointer shrink-0"
                                      >
                                        {checklistTotal > 0 && (
                                          <span
                                            data-testid={`task-checklist-badge-${item.id}`}
                                            className={`inline-flex items-center gap-0.5 ${
                                              checklistCompleted ===
                                              checklistTotal
                                                ? 'text-[#00c875]'
                                                : ''
                                            }`}
                                          >
                                            <CheckSquare className="w-3 h-3" />
                                            <span>
                                              {checklistCompleted}/
                                              {checklistTotal}
                                            </span>
                                          </span>
                                        )}
                                        <span className="inline-flex items-center gap-0.5">
                                          <MessageSquare className="w-3 h-3" />
                                          <span
                                            data-testid={`task-comments-count-${item.id}`}
                                          >
                                            {commentsCount}
                                          </span>
                                        </span>
                                      </button>
                                    </div>
                                  )}
                                </td>

                                {/* Columna 2: Responsable */}
                                <td className="w-[98px] min-w-[98px] h-9 min-h-[36px] max-h-[36px] px-1.5 border-r border-[#d0d4e4] text-center focus-within:border-[#0073ea] focus-within:ring-1 focus-within:ring-[#0073ea]">
                                  <div className="flex items-center justify-center gap-1 h-full">
                                    {item.assignee ? (
                                      <span
                                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-2xs"
                                        style={{
                                          backgroundColor:
                                            item.assignee.color || '#0073ea',
                                        }}
                                        title={item.assignee.full_name}
                                      >
                                        {getInitials(item.assignee.full_name)}
                                      </span>
                                    ) : (
                                      <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                                        <UserIcon className="w-3 h-3" />
                                      </span>
                                    )}

                                    <select
                                      data-testid={`task-assignee-select-${item.id}`}
                                      aria-label={`Responsable de ${item.title}`}
                                      value={
                                        item.assignee_id !== null &&
                                        item.assignee_id !== undefined
                                          ? String(item.assignee_id)
                                          : ''
                                      }
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (!val) {
                                          void handleInlineUpdate(
                                            item.id,
                                            { assignee_id: null },
                                            null,
                                          );
                                        } else {
                                          const uid = Number(val);
                                          const foundUser =
                                            availableUsers.find(
                                              (u) => u.id === uid,
                                            ) ?? null;
                                          void handleInlineUpdate(
                                            item.id,
                                            { assignee_id: uid },
                                            foundUser,
                                          );
                                        }
                                      }}
                                      className="flex-1 min-w-0 text-[11px] font-medium text-[#323338] bg-transparent border border-transparent hover:border-[#d0d4e4] focus:border-[#0073ea] focus:ring-1 focus:ring-[#0073ea] rounded px-1 py-0.5 focus:outline-none cursor-pointer truncate"
                                    >
                                      <option value="">Sin asignar</option>
                                      {availableUsers.map((u) => (
                                        <option key={u.id} value={String(u.id)}>
                                          {u.full_name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </td>

                                {/* Columna 3: Estado */}
                                <td className="w-[134px] min-w-[134px] h-9 min-h-[36px] max-h-[36px] p-0.5 border-r border-[#d0d4e4] text-center focus-within:border-[#0073ea] focus-within:ring-1 focus-within:ring-[#0073ea]">
                                  <StatusCell
                                    itemId={item.id}
                                    itemTitle={item.title}
                                    statusKey={item.status_key}
                                    statuses={activeBoard.statuses}
                                    onSelectStatus={(newKey) =>
                                      void handleInlineUpdate(item.id, {
                                        status_key: newKey,
                                      })
                                    }
                                    onEditLabels={() => setIsStatusModalOpen(true)}
                                  />
                                </td>

                                {/* Columna 4: Prioridad */}
                                <td className="w-[140px] min-w-[140px] h-9 min-h-[36px] max-h-[36px] p-0.5 border-r border-[#d0d4e4] text-center focus-within:border-[#0073ea] focus-within:ring-1 focus-within:ring-[#0073ea]">
                                  <div className="relative w-full h-full flex items-center justify-center">
                                    <div
                                      data-testid={`task-priority-badge-${item.id}`}
                                      className="w-full h-7 rounded text-center text-xs font-semibold shadow-2xs truncate flex items-center justify-center px-2 pointer-events-none"
                                      style={{
                                        backgroundColor: priorityMeta.bgColor,
                                        color: priorityMeta.textColor,
                                      }}
                                    >
                                      {priorityMeta.label}
                                    </div>
                                    <select
                                      data-testid={`task-priority-select-${item.id}`}
                                      aria-label={`Prioridad de ${item.title}`}
                                      value={item.priority.toLowerCase()}
                                      onChange={(e) =>
                                        void handleInlineUpdate(item.id, {
                                          priority: e.target.value,
                                        })
                                      }
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    >
                                      <option value="critical">Crítica</option>
                                      <option value="high">Alta</option>
                                      <option value="medium">Media</option>
                                      <option value="low">Baja</option>
                                    </select>
                                  </div>
                                </td>

                                {/* Columna 5: Fecha límite */}
                                <td className="w-[140px] min-w-[140px] h-9 min-h-[36px] max-h-[36px] px-1 border-r border-[#d0d4e4] text-center focus-within:border-[#0073ea] focus-within:ring-1 focus-within:ring-[#0073ea]">
                                  <div className="flex items-center justify-center gap-1 h-full">
                                    <Calendar
                                      className={`w-3 h-3 shrink-0 ${
                                        isOverdue
                                          ? 'text-[#e2445c]'
                                          : 'text-[#0073ea]'
                                      }`}
                                    />
                                    <input
                                      type="date"
                                      data-testid={`task-duedate-input-${item.id}`}
                                      aria-label={`Fecha límite de ${item.title}`}
                                      value={item.due_date ?? ''}
                                      onChange={(e) =>
                                        void handleInlineUpdate(item.id, {
                                          due_date: e.target.value || null,
                                        })
                                      }
                                      className={`text-[11px] font-medium rounded px-1 h-6 border border-transparent hover:border-[#d0d4e4] focus:border-[#0073ea] focus:ring-1 focus:ring-[#0073ea] focus:outline-none cursor-pointer ${
                                        isOverdue
                                          ? 'text-[#e2445c] font-semibold bg-red-50'
                                          : 'text-[#323338] bg-transparent'
                                      }`}
                                    />
                                    {item.due_date && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void handleInlineUpdate(item.id, {
                                            due_date: null,
                                          })
                                        }
                                        data-testid={`task-duedate-clear-${item.id}`}
                                        aria-label={`Limpiar fecha de ${item.title}`}
                                        title="Limpiar fecha límite"
                                        className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-[#323338] cursor-pointer"
                                      >
                                        <X className="w-2.5 h-2.5" />
                                      </button>
                                    )}
                                    {isOverdue && (
                                      <span
                                        data-testid={`task-overdue-badge-${item.id}`}
                                        className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-red-100 text-[#e2445c] text-[9px] font-bold"
                                      >
                                        <AlertTriangle className="w-2.5 h-2.5" />
                                        <span>Vencida</span>
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Columna 6: Horas */}
                                <td className="w-[140px] min-w-[140px] h-9 min-h-[36px] max-h-[36px] px-2 border-r border-[#d0d4e4] text-center focus-within:border-[#0073ea] focus-within:ring-1 focus-within:ring-[#0073ea]">
                                  <div className="inline-flex items-center justify-center gap-1 h-full">
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.5"
                                      data-testid={`task-hours-input-${item.id}`}
                                      aria-label={`Horas estimadas de ${item.title}`}
                                      value={item.estimated_hours ?? 0}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        if (!Number.isNaN(val) && val >= 0) {
                                          void handleInlineUpdate(item.id, {
                                            estimated_hours: val,
                                          });
                                        }
                                      }}
                                      className="w-16 h-7 text-right text-xs font-semibold text-[#323338] bg-transparent border border-transparent hover:border-[#d0d4e4] focus:border-[#0073ea] focus:ring-1 focus:ring-[#0073ea] rounded px-1.5 focus:outline-none"
                                    />
                                    <span className="text-[11px] font-medium text-[#676879]">
                                      h
                                    </span>
                                  </div>
                                </td>

                                {/* Columna 7: Presupuesto */}
                                <td className="w-[140px] min-w-[140px] h-9 min-h-[36px] max-h-[36px] px-2 border-r border-[#d0d4e4] text-center focus-within:border-[#0073ea] focus-within:ring-1 focus-within:ring-[#0073ea]">
                                  <div className="inline-flex items-center justify-center gap-1 h-full">
                                    <span className="text-[11px] font-semibold text-[#676879]">
                                      $
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="100"
                                      data-testid={`task-budget-input-${item.id}`}
                                      aria-label={`Presupuesto de ${item.title}`}
                                      value={item.budget ?? 0}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        if (!Number.isNaN(val) && val >= 0) {
                                          void handleInlineUpdate(item.id, {
                                            budget: val,
                                          });
                                        }
                                      }}
                                      className="w-20 h-7 text-right text-xs font-semibold text-[#323338] bg-transparent border border-transparent hover:border-[#d0d4e4] focus:border-[#0073ea] focus:ring-1 focus:ring-[#0073ea] rounded px-1.5 focus:outline-none"
                                    />
                                  </div>
                                </td>

                                {/* Columna 8: Acciones */}
                                <td className="w-[140px] min-w-[140px] h-9 min-h-[36px] max-h-[36px] px-1 border-r border-[#d0d4e4] text-center focus-within:border-[#0073ea] focus-within:ring-1 focus-within:ring-[#0073ea]">
                                  <div className="flex items-center justify-center gap-1 h-full">
                                    {activeBoard.groups.length > 1 && (
                                      <select
                                        data-testid={`task-move-group-select-${item.id}`}
                                        aria-label={`Mover ${item.title} a otro grupo`}
                                        value={String(item.group_id)}
                                        onChange={(e) =>
                                          void handleInlineUpdate(item.id, {
                                            group_id: Number(e.target.value),
                                          })
                                        }
                                        title="Mover a otro grupo"
                                        className="max-w-[76px] h-6 text-[10px] text-[#676879] bg-gray-50 border border-[#d0d4e4] rounded px-1 focus:outline-none focus:border-[#0073ea] focus:ring-1 focus:ring-[#0073ea] cursor-pointer truncate"
                                      >
                                        {activeBoard.groups.map((g) => (
                                          <option
                                            key={g.id}
                                            value={String(g.id)}
                                          >
                                            Mover: {g.title}
                                          </option>
                                        ))}
                                      </select>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleDuplicateItem(item.id)
                                      }
                                      data-testid={`btn-duplicate-task-${item.id}`}
                                      aria-label={`Duplicar tarea ${item.title}`}
                                      title="Duplicar tarea"
                                      className="p-1 rounded text-[#676879] hover:text-[#0073ea] hover:bg-[#e6f1fd] transition-colors cursor-pointer"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleDeleteItem(item.id)
                                      }
                                      data-testid={`btn-delete-task-${item.id}`}
                                      aria-label={`Eliminar tarea ${item.title}`}
                                      title="Eliminar tarea"
                                      className="p-1 rounded text-[#676879] hover:text-[#e2445c] hover:bg-red-50 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}

                          {visibleItems.length === 0 && (
                            <tr className="h-9 min-h-[36px] max-h-[36px] border-b border-[#d0d4e4]">
                              <td
                                colSpan={9}
                                className="h-9 min-h-[36px] max-h-[36px] py-1 px-4 text-center text-xs text-[#676879] italic border-r border-[#d0d4e4]"
                              >
                                {hasActiveFilters
                                  ? 'No hay tareas que coincidan con los filtros aplicados en este grupo.'
                                  : 'Este grupo aún no tiene tareas registradas.'}
                              </td>
                            </tr>
                          )}

                          {/* Fila rápida estilo Monday: "+ Agregar tarea..." */}
                          <tr className="h-9 min-h-[36px] max-h-[36px] leading-[36px] bg-[#fafbfc] hover:bg-[#f6f7fb] transition-colors border-b border-[#d0d4e4]">
                            <td
                              colSpan={9}
                              className="h-9 min-h-[36px] max-h-[36px] py-0 px-3 border-r border-[#d0d4e4]"
                            >
                              <div className="flex items-center gap-2 h-full">
                                <Plus className="w-3.5 h-3.5 text-[#0073ea] shrink-0" />
                                <input
                                  type="text"
                                  data-testid={`quick-add-item-input-${group.id}`}
                                  placeholder={`+ Agregar tarea en ${group.title}...`}
                                  aria-label={`Agregar tarea en ${group.title}`}
                                  value={quickAddTitles[group.id] ?? ''}
                                  onChange={(e) =>
                                    setQuickAddTitles((prev) => ({
                                      ...prev,
                                      [group.id]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      void handleQuickAddItem(group.id);
                                    }
                                  }}
                                  className="flex-1 text-xs h-7 px-2 rounded border border-transparent focus:border-[#0073ea] focus:ring-1 focus:ring-[#0073ea] focus:bg-white bg-transparent text-[#323338] placeholder-[#676879] focus:outline-none transition-all"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleQuickAddItem(group.id)
                                  }
                                  data-testid={`quick-add-item-submit-${group.id}`}
                                  className="px-2.5 h-6 rounded bg-[#0073ea] hover:bg-[#0060b9] text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
                                >
                                  Agregar
                                </button>
                              </div>
                            </td>
                          </tr>
                        </tbody>

                        {/* Fila inferior de resumen visual con Battery Summary y Sumatorias 1:1 Monday.com */}
                        <GroupFooterSummary
                          group={group}
                          statuses={activeBoard.statuses}
                          groupTotalHours={groupTotalHours}
                          groupTotalBudget={groupTotalBudget}
                        />
                      </table>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Modal Personalizador de Estados */}
      <StatusManagerModal
        boardId={activeBoard.id}
        statuses={activeBoard.statuses}
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
      />

      {/* Modal Automatizaciones de Tablero */}
      <AutomationsModal
        boardId={activeBoard.id}
        boardName={activeBoard.name}
        isOpen={isAutomationsModalOpen}
        onClose={() => setIsAutomationsModalOpen(false)}
      />

      {/* Panel Lateral de Detalle y Colaboración por Tarea */}
      <ItemDetailDrawer />
    </main>
  );
};
