import React, { useEffect, useRef, useState } from 'react';
import { Check, Edit2 } from 'lucide-react';
import type { BoardStatusRead } from '../../types';

interface StatusCellProps {
  itemId: number;
  itemTitle: string;
  statusKey: string;
  statuses: BoardStatusRead[];
  onSelectStatus: (newStatusKey: string) => void;
  onEditLabels: () => void;
}

export const StatusCell: React.FC<StatusCellProps> = ({
  itemId,
  itemTitle,
  statusKey,
  statuses,
  onSelectStatus,
  onEditLabels,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentStatus = statuses.find((st) => st.key === statusKey);
  const statusLabel = currentStatus?.label ?? statusKey;
  const statusColor = currentStatus?.color ?? '#c4c4c4';

  // Manejo de Click Outside y Escape para cerrar el popover flotante
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (key: string) => {
    onSelectStatus(key);
    setIsOpen(false);
  };

  const handleOpenEditLabels = () => {
    setIsOpen(false);
    onEditLabels();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center"
    >
      {/* Píldora visible auténtica de Monday.com (32px de alto, esquinas suaves rounded-[2px]) */}
      <button
        type="button"
        data-testid={`task-status-badge-${itemId}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full h-8 rounded-[2px] text-center text-xs font-bold text-white shadow-2xs truncate flex items-center justify-center px-2 cursor-pointer hover:opacity-90 transition-opacity"
        style={{ backgroundColor: statusColor }}
      >
        <span className="truncate">{statusLabel}</span>
      </button>

      {/* Selector nativo accesible en el DOM para compatibilidad 100% con tests existentes */}
      <select
        data-testid={`task-status-select-${itemId}`}
        aria-label={`Estado de ${itemTitle}`}
        value={statusKey}
        onChange={(e) => onSelectStatus(e.target.value)}
        tabIndex={-1}
        className="sr-only"
      >
        {statuses.map((st) => (
          <option key={st.key} value={st.key}>
            {st.label}
          </option>
        ))}
      </select>

      {/* Popover flotante: StatusPickerDropdown de Monday.com */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Seleccionar estado"
          className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-1 min-w-[160px] w-48 bg-white border border-[#d0d4e4] rounded-lg shadow-xl p-2 select-none animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Lista vertical de estados actuales como píldoras coloreadas de 32px */}
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {statuses.map((st) => {
              const isSelected = st.key === statusKey;
              return (
                <button
                  key={st.id}
                  type="button"
                  data-testid={`status-option-${st.key}`}
                  onClick={() => handleSelect(st.key)}
                  className="w-full h-8 rounded-[2px] text-xs font-bold text-white flex items-center justify-center relative hover:opacity-90 transition-opacity cursor-pointer shadow-xs px-2"
                  style={{ backgroundColor: st.color }}
                >
                  <span className="truncate">{st.label}</span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 absolute right-2 text-white/95" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Separador sutil */}
          <div className="border-t border-[#d0d4e4] my-2" />

          {/* Botón inferior: Editar etiquetas */}
          <button
            type="button"
            data-testid="edit-labels-button"
            onClick={handleOpenEditLabels}
            className="w-full py-1.5 px-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#323338] hover:bg-[#f6f7fb] rounded-[4px] cursor-pointer transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5 text-[#676879]" />
            <span>Editar etiquetas</span>
          </button>
        </div>
      )}
    </div>
  );
};
