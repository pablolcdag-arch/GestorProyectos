import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Edit2,
  FolderKanban,
  Layers,
  Palette,
  Plus,
  Trash2,
  User as UserIcon,
  X,
} from 'lucide-react';
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
import { StatusManagerModal } from './StatusManagerModal';

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
  } = useWorkspaceStore();

  const { users, teamUsers } = useAuthStore();

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

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
      // En caso de fallo restauramos el texto para no perder lo escrito
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

  return (
    <main className="flex-1 overflow-y-auto bg-white p-6 space-y-6">
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

          <div className="flex items-center gap-2.5 flex-wrap">
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
              onClick={() => setIsStatusModalOpen(true)}
              data-testid="btn-open-status-modal"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0073ea] hover:bg-[#0060b9] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Palette className="w-4 h-4" />
              <span>Personalizar Estados</span>
            </button>
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

      {/* Grupos desplegables del Tablero */}
      <div className="space-y-8">
        {activeBoard.groups.map((group: TaskGroupRead) => {
          const totalGroupItems = group.items.length;
          const isEditingThisGroup = editingGroupId === group.id;

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
                          <th className="py-2.5 px-4 w-52 text-center border-l border-gray-200">
                            Responsable
                          </th>
                          <th className="py-2.5 px-4 w-44 text-center border-l border-gray-200">
                            Estado
                          </th>
                          <th className="py-2.5 px-4 w-36 text-center border-l border-gray-200">
                            Prioridad
                          </th>
                          <th className="py-2.5 px-4 w-44 text-center border-l border-gray-200">
                            Fecha límite
                          </th>
                          <th className="py-2.5 px-3 w-36 text-center border-l border-gray-200">
                            Acciones
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

                          const isEditingThisItem = editingItemId === item.id;
                          const isOverdue =
                            Boolean(item.due_date) &&
                            item.due_date! < todayIso &&
                            item.status_key !== 'done';

                          return (
                            <tr
                              key={item.id}
                              data-testid={`task-row-${item.id}`}
                              className="hover:bg-[#f5f9ff] transition-colors"
                            >
                              {/* Columna 1: Tarea (Edición inline de título y notas) */}
                              <td className="py-2.5 px-4">
                                {isEditingThisItem ? (
                                  <div className="space-y-1.5">
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
                                      className="w-full px-2.5 py-1 text-sm font-medium rounded-lg border border-[#0073ea] bg-white focus:outline-none"
                                      autoFocus
                                    />
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="text"
                                        data-testid={`task-notes-input-${item.id}`}
                                        aria-label={`Editar notas de tarea ${item.id}`}
                                        placeholder="Notas rápidas..."
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
                                        className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:border-[#0073ea]"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void handleSaveItemText(item.id)
                                        }
                                        data-testid={`task-title-save-${item.id}`}
                                        className="px-2.5 py-1 rounded-md bg-[#0073ea] text-white text-xs font-semibold cursor-pointer"
                                      >
                                        Guardar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingItemId(null)}
                                        className="px-2 py-1 rounded-md text-xs text-[#676879] hover:bg-gray-100 cursor-pointer"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    data-testid={`task-title-display-${item.id}`}
                                    onClick={() => handleStartEditItemText(item)}
                                    className="group/title cursor-pointer rounded-md -mx-1.5 px-1.5 py-0.5 hover:bg-white/90 transition-colors"
                                    title="Clic para editar título o notas"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-medium text-[#323338] group-hover/title:text-[#0073ea] transition-colors">
                                        {item.title}
                                      </span>
                                      <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover/title:opacity-100 shrink-0" />
                                    </div>
                                    {item.notes && (
                                      <div className="text-xs text-[#676879] mt-0.5 line-clamp-1">
                                        {item.notes}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* Columna 2: Responsable (Selector Inline) */}
                              <td className="py-2 px-3 border-l border-gray-100">
                                <div className="flex items-center gap-2">
                                  {item.assignee ? (
                                    <span
                                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-2xs"
                                      style={{
                                        backgroundColor:
                                          item.assignee.color || '#0073ea',
                                      }}
                                    >
                                      {getInitials(item.assignee.full_name)}
                                    </span>
                                  ) : (
                                    <span className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                                      <UserIcon className="w-3.5 h-3.5" />
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
                                    className="flex-1 min-w-0 text-xs font-medium text-[#323338] bg-transparent border border-transparent hover:border-gray-300 focus:border-[#0073ea] rounded-md px-1.5 py-1 focus:outline-none cursor-pointer truncate"
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

                              {/* Columna 3: Estado (Píldora Monday Interactiva) */}
                              <td className="p-1.5 border-l border-gray-100">
                                <div className="relative w-full">
                                  <div
                                    data-testid={`task-status-badge-${item.id}`}
                                    className="w-full py-2 px-3 rounded-md text-center text-xs font-semibold text-white shadow-2xs truncate pointer-events-none"
                                    style={{ backgroundColor: statusColor }}
                                  >
                                    {statusLabel}
                                  </div>
                                  <select
                                    data-testid={`task-status-select-${item.id}`}
                                    aria-label={`Estado de ${item.title}`}
                                    value={item.status_key}
                                    onChange={(e) =>
                                      void handleInlineUpdate(item.id, {
                                        status_key: e.target.value,
                                      })
                                    }
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  >
                                    {activeBoard.statuses.map((st) => (
                                      <option key={st.key} value={st.key}>
                                        {st.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </td>

                              {/* Columna 4: Prioridad (Píldora Interactiva) */}
                              <td className="p-1.5 border-l border-gray-100">
                                <div className="relative w-full">
                                  <div
                                    data-testid={`task-priority-badge-${item.id}`}
                                    className="w-full py-2 px-3 rounded-md text-center text-xs font-semibold shadow-2xs pointer-events-none"
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

                              {/* Columna 5: Fecha límite Inline + Alerta de vencimiento */}
                              <td className="py-2 px-3 border-l border-gray-100 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <div className="inline-flex items-center gap-1">
                                    <Calendar
                                      className={`w-3.5 h-3.5 shrink-0 ${
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
                                      className={`text-xs font-medium rounded-md px-1.5 py-0.5 border border-transparent hover:border-gray-300 focus:border-[#0073ea] focus:outline-none cursor-pointer ${
                                        isOverdue
                                          ? 'text-[#e2445c] font-semibold bg-red-50'
                                          : 'text-[#323338] bg-gray-100'
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
                                        className="p-0.5 rounded hover:bg-gray-200 text-gray-500 hover:text-[#323338] cursor-pointer"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                  {isOverdue && (
                                    <span
                                      data-testid={`task-overdue-badge-${item.id}`}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-red-100 text-[#e2445c] text-[10px] font-bold"
                                    >
                                      <AlertTriangle className="w-2.5 h-2.5" />
                                      <span>Vencida</span>
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Columna 6: Acciones de Fila (Mover de grupo y Eliminar) */}
                              <td className="py-2 px-2.5 border-l border-gray-100 text-center">
                                <div className="flex items-center justify-center gap-1.5">
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
                                      className="max-w-[92px] text-[11px] text-[#676879] bg-gray-50 border border-gray-200 rounded-md px-1.5 py-1 focus:outline-none focus:border-[#0073ea] cursor-pointer truncate"
                                    >
                                      {activeBoard.groups.map((g) => (
                                        <option key={g.id} value={String(g.id)}>
                                          Mover a: {g.title}
                                        </option>
                                      ))}
                                    </select>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => void handleDeleteItem(item.id)}
                                    data-testid={`btn-delete-task-${item.id}`}
                                    aria-label={`Eliminar tarea ${item.title}`}
                                    title="Eliminar tarea"
                                    className="p-1.5 rounded-md text-[#676879] hover:text-[#e2445c] hover:bg-red-50 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {group.items.length === 0 && (
                          <tr>
                            <td
                              colSpan={6}
                              className="py-4 px-4 text-center text-xs text-[#676879] italic"
                            >
                              Este grupo aún no tiene tareas registradas.
                            </td>
                          </tr>
                        )}

                        {/* Fila rápida estilo Monday: "+ Agregar tarea..." */}
                        <tr className="bg-[#fafbfc] hover:bg-[#f5f9ff] transition-colors">
                          <td colSpan={6} className="py-2 px-4">
                            <div className="flex items-center gap-2">
                              <Plus className="w-4 h-4 text-[#0073ea] shrink-0" />
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
                                className="flex-1 text-xs py-1.5 px-2.5 rounded-lg border border-transparent focus:border-[#0073ea] focus:bg-white bg-transparent text-[#323338] placeholder-[#676879] focus:outline-none transition-all"
                              />
                              <button
                                type="button"
                                onClick={() => void handleQuickAddItem(group.id)}
                                data-testid={`quick-add-item-submit-${group.id}`}
                                className="px-3 py-1 rounded-lg bg-[#0073ea] hover:bg-[#0060b9] text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
                              >
                                Agregar
                              </button>
                            </div>
                          </td>
                        </tr>
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
                            <td colSpan={3} className="border-l border-gray-200" />
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
