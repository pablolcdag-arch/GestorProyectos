import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsDown,
  ChevronsRight,
  Edit2,
  MoreHorizontal,
  Palette,
  Trash2,
  X,
} from 'lucide-react';
import {
  GROUP_COLOR_PALETTE,
  type BoardStatusRead,
  type TaskGroupRead,
} from '../../types';

interface GroupHeaderProps {
  group: TaskGroupRead;
  statuses: BoardStatusRead[];
  onRenameGroup: (title: string, color?: string) => Promise<void>;
  onDeleteGroup: () => Promise<void>;
  onUpdateColor: (color: string) => Promise<void>;
  onToggleCollapse: () => void;
  onCollapseAll: (collapse: boolean) => void;
}

export const GroupHeader: React.FC<GroupHeaderProps> = ({
  group,
  statuses,
  onRenameGroup,
  onDeleteGroup,
  onUpdateColor,
  onToggleCollapse,
  onCollapseAll,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(group.title);
  const [editColor, setEditColor] = useState(group.color);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isColorPaletteOpen, setIsColorPaletteOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const totalGroupItems = group.items.length;

  useEffect(() => {
    setEditTitle(group.title);
    setEditColor(group.color);
  }, [group.title, group.color]);

  // Click outside y escape para cerrar el menú contextual y la paleta
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
        setIsColorPaletteOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
        setIsColorPaletteOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const handleSaveEdit = async () => {
    const cleaned = editTitle.trim();
    if (!cleaned) return;
    setIsEditing(false);
    await onRenameGroup(cleaned, editColor);
  };

  const handleSelectColor = async (hex: string) => {
    setEditColor(hex);
    await onUpdateColor(hex);
    setIsColorPaletteOpen(false);
    setIsMenuOpen(false);
  };

  // 1. MODO EDICIÓN INLINE DE CABECERA
  if (isEditing) {
    return (
      <div className="flex items-center gap-2 flex-wrap bg-[#f7f8fa] px-3 py-1.5 rounded-xl border border-[#0073ea]">
        <input
          type="text"
          aria-label={`Editar título del grupo ${group.title}`}
          data-testid={`input-edit-group-title-${group.id}`}
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void handleSaveEdit();
            }
          }}
          className="px-2.5 py-1 text-sm font-bold rounded-lg border border-gray-300 bg-white focus:outline-none focus:border-[#0073ea]"
          autoFocus
        />

        <div className="flex items-center gap-1">
          {GROUP_COLOR_PALETTE.slice(0, 8).map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => setEditColor(hex)}
              className={`w-4 h-4 rounded-full cursor-pointer ${
                editColor.toLowerCase() === hex.toLowerCase()
                  ? 'ring-2 ring-offset-1 ring-[#323338]'
                  : ''
              }`}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => void handleSaveEdit()}
          data-testid={`btn-save-group-${group.id}`}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#00c875] text-white text-xs font-semibold cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Guardar</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setIsEditing(false);
            setEditTitle(group.title);
            setEditColor(group.color);
          }}
          className="p-1 text-[#676879] hover:text-[#323338] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // 2. VISTA DE GRUPO CONTRAÍDO (Fila compacta única de 36px 1:1 Monday.com)
  if (group.collapsed) {
    return (
      <div
        data-testid={`group-collapsed-row-${group.id}`}
        className="h-9 min-h-[36px] max-h-[36px] rounded-lg border border-[#d0d4e4] bg-white flex items-center justify-between px-3 shadow-2xs hover:bg-[#f6f7fb] transition-colors select-none"
        style={{
          borderLeftWidth: '4px',
          borderLeftColor: group.color,
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onToggleCollapse}
            data-testid={`toggle-group-${group.id}`}
            aria-label={`Expandir grupo ${group.title}`}
            className="p-1 rounded-md text-white transition-transform cursor-pointer shrink-0"
            style={{ backgroundColor: group.color }}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <span
            className="font-bold text-sm tracking-tight truncate cursor-pointer hover:underline"
            style={{ color: group.color }}
            onClick={onToggleCollapse}
          >
            {group.title}
          </span>

          <span className="text-xs text-[#676879] font-medium shrink-0">
            ({totalGroupItems} {totalGroupItems === 1 ? 'tarea' : 'tareas'})
          </span>
        </div>

        {/* Lado derecho: Mini-batería de estados (18px) y Menú contextual */}
        <div className="flex items-center gap-3 shrink-0 ml-4">
          {totalGroupItems > 0 && (
            <div
              data-testid={`mini-battery-summary-${group.id}`}
              aria-label={`Resumen de estados de ${group.title}`}
              className="w-40 sm:w-56 h-[18px] rounded-[3px] overflow-hidden flex bg-[#e5e7eb] shadow-2xs"
            >
              {statuses.map((st) => {
                const count = group.items.filter(
                  (i) => i.status_key === st.key,
                ).length;
                if (count === 0) return null;
                const pct = (count / totalGroupItems) * 100;
                return (
                  <div
                    key={st.id}
                    data-testid={`mini-battery-segment-${group.id}-${st.key}`}
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
          )}

          {/* Menú contextual de 3 puntos */}
          {renderMenuPopover()}
        </div>
      </div>
    );
  }

  // 3. VISTA DE CABECERA EXPANDIDA
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleCollapse}
          data-testid={`toggle-group-${group.id}`}
          className="flex items-center gap-2 text-left group cursor-pointer"
        >
          <span
            className="p-1 rounded-md text-white transition-transform"
            style={{ backgroundColor: group.color }}
          >
            <ChevronDown className="w-4 h-4" />
          </span>
          <h2
            className="text-base font-bold tracking-tight"
            style={{ color: group.color }}
          >
            {group.title}
          </h2>
          <span className="text-xs text-[#676879] font-medium ml-1">
            ({totalGroupItems} {totalGroupItems === 1 ? 'tarea' : 'tareas'})
          </span>
        </button>

        {/* Menú contextual de 3 puntos y acciones */}
        <div className="relative flex items-center ml-1">
          {renderMenuPopover()}
        </div>
      </div>
    </div>
  );

  function renderMenuPopover() {
    return (
      <div ref={menuRef} className="relative inline-flex items-center">
        {/* Botones accesibles de retrocompatibilidad (para tests directos sin abrir menú) */}
        {!isMenuOpen && (
          <>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              data-testid={`btn-edit-group-${group.id}`}
              aria-label={`Editar grupo ${group.title}`}
              className="sr-only"
            >
              Editar grupo
            </button>
            <button
              type="button"
              onClick={() => void onDeleteGroup()}
              data-testid={`btn-delete-group-${group.id}`}
              aria-label={`Eliminar grupo ${group.title}`}
              className="sr-only"
            >
              Eliminar grupo
            </button>
          </>
        )}

        {/* Botón de 3 puntos auténtico de Monday.com */}
        <button
          type="button"
          onClick={() => {
            setIsMenuOpen((prev) => !prev);
            setIsColorPaletteOpen(false);
          }}
          data-testid={`group-menu-btn-${group.id}`}
          aria-label={`Menú de opciones de ${group.title}`}
          aria-haspopup="true"
          aria-expanded={isMenuOpen}
          className="p-1 rounded-md text-[#676879] hover:text-[#323338] hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {/* Popover flotante del menú contextual */}
        {isMenuOpen && (
          <div
            role="menu"
            data-testid={`group-menu-${group.id}`}
            className="absolute z-50 left-0 top-full mt-1 w-56 bg-white border border-[#d0d4e4] rounded-xl shadow-xl py-1.5 select-none animate-in fade-in zoom-in-95 duration-100 text-xs text-[#323338]"
          >
            {/* Contraer / Expandir este grupo */}
            <button
              type="button"
              data-testid={`group-menu-toggle-collapse-${group.id}`}
              onClick={() => {
                onToggleCollapse();
                setIsMenuOpen(false);
              }}
              className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-[#f6f7fb] cursor-pointer"
            >
              {group.collapsed ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-[#676879]" />
                  <span>Expandir este grupo</span>
                </>
              ) : (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-[#676879]" />
                  <span>Contraer este grupo</span>
                </>
              )}
            </button>

            {/* Contraer todos los grupos */}
            <button
              type="button"
              data-testid={`group-menu-collapse-all-${group.id}`}
              onClick={() => {
                onCollapseAll(true);
                setIsMenuOpen(false);
              }}
              className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-[#f6f7fb] cursor-pointer"
            >
              <ChevronsRight className="w-3.5 h-3.5 text-[#676879]" />
              <span>Contraer todos los grupos</span>
            </button>

            {/* Expandir todos los grupos */}
            <button
              type="button"
              data-testid={`group-menu-expand-all-${group.id}`}
              onClick={() => {
                onCollapseAll(false);
                setIsMenuOpen(false);
              }}
              className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-[#f6f7fb] cursor-pointer"
            >
              <ChevronsDown className="w-3.5 h-3.5 text-[#676879]" />
              <span>Expandir todos los grupos</span>
            </button>

            <div className="border-t border-[#d0d4e4] my-1" />

            {/* Cambiar color del grupo (paleta oficial de 18 colores) */}
            <button
              type="button"
              data-testid={`group-menu-color-btn-${group.id}`}
              onClick={() => setIsColorPaletteOpen((prev) => !prev)}
              className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-[#f6f7fb] cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Palette className="w-3.5 h-3.5 text-[#676879]" />
                <span>Cambiar color del grupo</span>
              </div>
              <span
                className="w-3.5 h-3.5 rounded-full border border-gray-300 shadow-2xs"
                style={{ backgroundColor: group.color }}
              />
            </button>

            {/* Cuadrícula desplegable de 18 colores */}
            {isColorPaletteOpen && (
              <div
                data-testid={`group-palette-${group.id}`}
                className="p-2.5 mx-2 my-1 bg-[#f7f8fa] border border-[#d0d4e4] rounded-lg space-y-1.5"
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#676879]">
                  Paleta oficial (18 colores)
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {GROUP_COLOR_PALETTE.map((hex) => {
                    const isSelected =
                      group.color.toLowerCase() === hex.toLowerCase();
                    return (
                      <button
                        key={hex}
                        type="button"
                        data-testid={`group-palette-color-${hex.replace('#', '')}`}
                        aria-label={`Color ${hex}`}
                        onClick={() => void handleSelectColor(hex)}
                        className={`w-6 h-6 rounded-full cursor-pointer transition-transform hover:scale-110 shadow-2xs relative flex items-center justify-center ${
                          isSelected
                            ? 'ring-2 ring-offset-1 ring-[#323338] scale-105'
                            : ''
                        }`}
                        style={{ backgroundColor: hex }}
                      >
                        {isSelected && (
                          <Check className="w-3 h-3 text-white drop-shadow-xs" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Renombrar grupo */}
            <button
              type="button"
              data-testid={`group-menu-rename-${group.id}`}
              onClick={() => {
                setIsEditing(true);
                setIsMenuOpen(false);
              }}
              className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-[#f6f7fb] cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-[#676879]" />
              <span>Renombrar grupo</span>
            </button>

            <div className="border-t border-[#d0d4e4] my-1" />

            {/* Eliminar grupo */}
            <button
              type="button"
              data-testid={`btn-delete-group-${group.id}`}
              onClick={() => {
                void onDeleteGroup();
                setIsMenuOpen(false);
              }}
              className="w-full px-3 py-2 text-left flex items-center gap-2 text-[#e2445c] hover:bg-red-50 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-[#e2445c]" />
              <span>Eliminar grupo</span>
            </button>
          </div>
        )}
      </div>
    );
  }
};
