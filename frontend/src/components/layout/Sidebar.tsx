import React, { useState } from 'react';
import {
  Briefcase,
  Check,
  CheckSquare,
  Edit2,
  FolderKanban,
  Plus,
  Rocket,
  Trash2,
  X,
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { MONDAY_COLOR_PALETTE } from '../../types';

interface SidebarProps {
  collapsed: boolean;
}

const WORKSPACE_COLORS = MONDAY_COLOR_PALETTE.slice(0, 8);

export const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const {
    workspaces,
    activeWorkspaceId,
    activeBoardId,
    selectWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    selectBoard,
    createBoard,
    updateBoard,
    deleteBoard,
    currentViewMode,
    setViewMode,
    myWorkData,
    loadMyWork,
  } = useWorkspaceStore();

  // Estados para crear Workspace
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceColor, setNewWorkspaceColor] = useState('#0073ea');

  // Estados para editar Workspace activo
  const [isEditingWorkspace, setIsEditingWorkspace] = useState(false);
  const [editWorkspaceName, setEditWorkspaceName] = useState('');
  const [editWorkspaceColor, setEditWorkspaceColor] = useState('#0073ea');

  // Estados para crear Board
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDescription, setNewBoardDescription] = useState('');

  // Estados para renombrar Board
  const [editingBoardId, setEditingBoardId] = useState<number | null>(null);
  const [editBoardName, setEditBoardName] = useState('');

  const activeWorkspace = workspaces.find((ws) => ws.id === activeWorkspaceId);

  if (collapsed) {
    return (
      <aside
        aria-label="Barra lateral colapsada"
        className="w-16 bg-[#f7f8fa] border-r border-gray-200 flex flex-col items-center py-4 gap-3 shrink-0"
      >
        {/* Acceso directo a Mi Trabajo en modo colapsado */}
        <button
          type="button"
          onClick={() => {
            setViewMode('my-work');
            void loadMyWork();
          }}
          data-testid="nav-my-work"
          title="Mi Trabajo"
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform cursor-pointer relative ${
            currentViewMode === 'my-work'
              ? 'bg-[#0073ea] text-white ring-2 ring-offset-2 ring-[#0073ea] scale-105'
              : 'bg-white border border-gray-200 text-[#323338] hover:bg-gray-100'
          }`}
        >
          <CheckSquare className="w-5 h-5" />
          {myWorkData?.summary && myWorkData.summary.total_assigned > 0 ? (
            <span className="absolute -top-1 -right-1 bg-[#e2445c] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
              {myWorkData.summary.total_assigned}
            </span>
          ) : null}
        </button>

        <div className="w-8 h-px bg-gray-200 my-1" />

        {workspaces.map((ws) => {
          const isSelected = ws.id === activeWorkspaceId;
          return (
            <button
              key={ws.id}
              type="button"
              onClick={() => void selectWorkspace(ws.id)}
              title={ws.name}
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm transition-transform cursor-pointer ${
                isSelected ? 'ring-2 ring-offset-2 ring-[#0073ea] scale-105' : 'opacity-80 hover:opacity-100'
              }`}
              style={{ backgroundColor: ws.color }}
            >
              {ws.name.slice(0, 1).toUpperCase()}
            </button>
          );
        })}
      </aside>
    );
  }

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newWorkspaceName.trim();
    if (!cleaned) return;
    await createWorkspace({
      name: cleaned,
      color: newWorkspaceColor,
      icon: 'Briefcase',
    });
    setNewWorkspaceName('');
    setNewWorkspaceColor('#0073ea');
    setIsCreatingWorkspace(false);
  };

  const handleStartEditWorkspace = () => {
    if (!activeWorkspace) return;
    setEditWorkspaceName(activeWorkspace.name);
    setEditWorkspaceColor(activeWorkspace.color);
    setIsEditingWorkspace(true);
  };

  const handleSaveEditWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) return;
    const cleaned = editWorkspaceName.trim();
    if (!cleaned) return;
    await updateWorkspace(activeWorkspace.id, {
      name: cleaned,
      color: editWorkspaceColor,
    });
    setIsEditingWorkspace(false);
  };

  const handleDeleteWorkspace = async () => {
    if (!activeWorkspace || workspaces.length <= 1) return;
    await deleteWorkspace(activeWorkspace.id);
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId) return;
    const cleaned = newBoardName.trim();
    if (!cleaned) return;
    await createBoard({
      workspace_id: activeWorkspaceId,
      name: cleaned,
      description: newBoardDescription.trim(),
    });
    setNewBoardName('');
    setNewBoardDescription('');
    setIsCreatingBoard(false);
  };

  const handleStartEditBoard = (boardId: number, currentName: string) => {
    setEditingBoardId(boardId);
    setEditBoardName(currentName);
  };

  const handleSaveEditBoard = async (boardId: number) => {
    const cleaned = editBoardName.trim();
    if (!cleaned) return;
    await updateBoard(boardId, { name: cleaned });
    setEditingBoardId(null);
    setEditBoardName('');
  };

  return (
    <aside
      aria-label="Navegación de Espacios y Tableros"
      className="w-72 bg-[#f7f8fa] border-r border-gray-200 flex flex-col shrink-0 select-none"
    >
      {/* Botón destacado: Mi Trabajo */}
      <div className="p-3 border-b border-gray-200">
        <button
          type="button"
          onClick={() => {
            setViewMode('my-work');
            void loadMyWork();
          }}
          data-testid="nav-my-work"
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            currentViewMode === 'my-work'
              ? 'bg-[#0073ea] text-white shadow-xs'
              : 'text-[#323338] bg-white hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-inherit" />
            <span>Mi Trabajo</span>
          </div>
          {myWorkData?.summary && myWorkData.summary.total_assigned > 0 ? (
            <span
              data-testid="my-work-badge"
              className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                currentViewMode === 'my-work'
                  ? 'bg-white text-[#0073ea]'
                  : 'bg-[#f0f7ff] text-[#0073ea] border border-[#cce5ff]'
              }`}
            >
              {myWorkData.summary.total_assigned}
            </span>
          ) : null}
        </button>
      </div>

      {/* Sección: Selector de Espacio de Trabajo */}
      <div className="p-4 border-b border-gray-200 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#676879]">
            Espacios de Trabajo
          </span>
          <button
            type="button"
            onClick={() => {
              setIsCreatingWorkspace((prev) => !prev);
              setIsEditingWorkspace(false);
            }}
            data-testid="btn-toggle-new-workspace"
            title="Nuevo Espacio de Trabajo"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#0073ea] hover:bg-[#e5f4ff] px-2 py-1 rounded-md transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Espacio</span>
          </button>
        </div>

        {/* Lista de Workspaces */}
        <div className="space-y-1">
          {workspaces.map((ws) => {
            const isSelected = ws.id === activeWorkspaceId;
            return (
              <div
                key={ws.id}
                className={`group flex items-center justify-between rounded-xl px-2.5 py-2 text-sm transition-all ${
                  isSelected
                    ? 'bg-white shadow-xs border border-gray-200 font-semibold text-[#323338]'
                    : 'text-[#676879] hover:bg-gray-200/60 hover:text-[#323338]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => void selectWorkspace(ws.id)}
                  data-testid={`workspace-item-${ws.id}`}
                  className="flex items-center gap-2.5 flex-1 text-left min-w-0 cursor-pointer"
                >
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs"
                    style={{ backgroundColor: ws.color }}
                  >
                    {ws.icon === 'Rocket' ? (
                      <Rocket className="w-3.5 h-3.5" />
                    ) : (
                      <Briefcase className="w-3.5 h-3.5" />
                    )}
                  </span>
                  <span className="truncate">{ws.name}</span>
                </button>

                {isSelected && (
                  <div className="flex items-center gap-1 ml-1">
                    <button
                      type="button"
                      onClick={handleStartEditWorkspace}
                      aria-label={`Editar espacio ${ws.name}`}
                      className="p-1 rounded hover:bg-gray-100 text-[#676879] hover:text-[#323338] cursor-pointer"
                      title="Editar Espacio de Trabajo"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {workspaces.length > 1 && (
                      <button
                        type="button"
                        onClick={() => void handleDeleteWorkspace()}
                        aria-label={`Eliminar espacio ${ws.name}`}
                        className="p-1 rounded hover:bg-red-50 text-[#676879] hover:text-[#e2445c] cursor-pointer"
                        title="Eliminar Espacio de Trabajo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Formulario inline para Crear Workspace */}
        {isCreatingWorkspace && (
          <form
            onSubmit={(e) => void handleCreateWorkspace(e)}
            className="p-3 bg-white rounded-xl border border-gray-200 shadow-xs space-y-2.5"
          >
            <p className="text-xs font-bold text-[#323338]">
              Crear Espacio de Trabajo
            </p>
            <input
              type="text"
              placeholder="Nombre del espacio"
              aria-label="Nombre del espacio"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-[#0073ea]"
              autoFocus
            />
            <div className="flex items-center gap-1.5 flex-wrap">
              {WORKSPACE_COLORS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setNewWorkspaceColor(hex)}
                  aria-label={`Color de espacio ${hex}`}
                  className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                    newWorkspaceColor === hex
                      ? 'ring-2 ring-offset-1 ring-[#323338] scale-110'
                      : ''
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
            <div className="flex justify-end gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setIsCreatingWorkspace(false)}
                className="px-2.5 py-1 text-xs rounded-md text-[#676879] hover:bg-gray-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-2.5 py-1 text-xs font-semibold rounded-md bg-[#0073ea] text-white hover:bg-[#0060b9] cursor-pointer"
              >
                Crear Espacio
              </button>
            </div>
          </form>
        )}

        {/* Formulario inline para Editar Workspace */}
        {isEditingWorkspace && activeWorkspace && (
          <form
            onSubmit={(e) => void handleSaveEditWorkspace(e)}
            className="p-3 bg-white rounded-xl border border-gray-200 shadow-xs space-y-2.5"
          >
            <p className="text-xs font-bold text-[#323338]">
              Editar Espacio de Trabajo
            </p>
            <input
              type="text"
              aria-label="Editar nombre del espacio"
              value={editWorkspaceName}
              onChange={(e) => setEditWorkspaceName(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-[#0073ea]"
              autoFocus
            />
            <div className="flex items-center gap-1.5 flex-wrap">
              {WORKSPACE_COLORS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setEditWorkspaceColor(hex)}
                  className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                    editWorkspaceColor === hex
                      ? 'ring-2 ring-offset-1 ring-[#323338] scale-110'
                      : ''
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
            <div className="flex justify-end gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setIsEditingWorkspace(false)}
                className="px-2.5 py-1 text-xs rounded-md text-[#676879] hover:bg-gray-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-2.5 py-1 text-xs font-semibold rounded-md bg-[#0073ea] text-white hover:bg-[#0060b9] cursor-pointer"
              >
                Guardar
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Sección: Tableros del Workspace activo */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#676879]">
            Tableros ({activeWorkspace?.boards.length ?? 0})
          </span>
          <button
            type="button"
            onClick={() => setIsCreatingBoard((prev) => !prev)}
            data-testid="btn-new-board"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#0073ea] hover:bg-[#e5f4ff] px-2 py-1 rounded-md transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Nuevo Tablero</span>
          </button>
        </div>

        {/* Formulario inline para crear un Nuevo Tablero */}
        {isCreatingBoard && (
          <form
            onSubmit={(e) => void handleCreateBoard(e)}
            data-testid="form-new-board"
            className="p-3 bg-white rounded-xl border border-gray-200 shadow-xs space-y-2"
          >
            <input
              type="text"
              placeholder="Nombre del nuevo tablero"
              aria-label="Nombre del nuevo tablero"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-[#0073ea]"
              autoFocus
            />
            <input
              type="text"
              placeholder="Descripción (opcional)"
              aria-label="Descripción del nuevo tablero"
              value={newBoardDescription}
              onChange={(e) => setNewBoardDescription(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-[#0073ea]"
            />
            <div className="flex justify-end gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setIsCreatingBoard(false)}
                className="px-2.5 py-1 text-xs rounded-md text-[#676879] hover:bg-gray-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                data-testid="btn-submit-new-board"
                className="px-2.5 py-1 text-xs font-semibold rounded-md bg-[#0073ea] text-white hover:bg-[#0060b9] cursor-pointer"
              >
                Crear Tablero
              </button>
            </div>
          </form>
        )}

        {/* Listado de tableros */}
        <div className="space-y-1">
          {activeWorkspace?.boards.map((board) => {
            const isSelected = board.id === activeBoardId;
            const isEditingThis = editingBoardId === board.id;

            if (isEditingThis) {
              return (
                <div
                  key={board.id}
                  className="flex items-center gap-1 p-1.5 bg-white rounded-lg border border-[#0073ea]"
                >
                  <input
                    type="text"
                    aria-label="Nuevo nombre del tablero"
                    value={editBoardName}
                    onChange={(e) => setEditBoardName(e.target.value)}
                    className="flex-1 px-2 py-1 text-xs focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => void handleSaveEditBoard(board.id)}
                    aria-label="Guardar nombre de tablero"
                    className="p-1 text-[#00c875] hover:bg-green-50 rounded cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingBoardId(null)}
                    aria-label="Cancelar edición de tablero"
                    className="p-1 text-[#676879] hover:bg-gray-100 rounded cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            }

            return (
              <div
                key={board.id}
                className={`group flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                  isSelected
                    ? 'bg-[#cce5ff]/70 text-[#0073ea] font-semibold'
                    : 'text-[#323338] hover:bg-gray-200/60'
                }`}
              >
                <button
                  type="button"
                  onClick={() => void selectBoard(board.id)}
                  data-testid={`board-item-${board.id}`}
                  className="flex items-center gap-2.5 flex-1 text-left min-w-0 cursor-pointer"
                >
                  <FolderKanban
                    className={`w-4 h-4 shrink-0 ${
                      isSelected ? 'text-[#0073ea]' : 'text-[#676879]'
                    }`}
                  />
                  <span className="truncate">{board.name}</span>
                </button>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => handleStartEditBoard(board.id, board.name)}
                    aria-label={`Renombrar tablero ${board.name}`}
                    className="p-1 rounded hover:bg-white/80 text-[#676879] hover:text-[#323338] cursor-pointer"
                    title="Renombrar tablero"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteBoard(board.id)}
                    aria-label={`Eliminar tablero ${board.name}`}
                    className="p-1 rounded hover:bg-red-50 text-[#676879] hover:text-[#e2445c] cursor-pointer"
                    title="Eliminar tablero"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {activeWorkspace && activeWorkspace.boards.length === 0 && (
            <p className="text-xs text-[#676879] italic px-2 py-3">
              No hay tableros en este espacio. Creá uno con &quot;+ Nuevo Tablero&quot;.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
};

