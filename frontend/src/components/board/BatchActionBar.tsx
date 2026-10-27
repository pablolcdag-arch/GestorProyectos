import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRightLeft,
  Copy,
  Download,
  Trash2,
  X,
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import type { BoardDetailRead, TaskItemRead } from '../../types';

export interface BatchActionBarProps {
  selectedItemIds: Set<number>;
  board: BoardDetailRead;
  onClearSelection: () => void;
  onDuplicateSelected?: (itemIds: number[]) => Promise<void>;
  onDeleteSelected?: (itemIds: number[]) => Promise<void>;
  onMoveSelected?: (itemIds: number[], targetGroupId: number) => Promise<void>;
  onExportSelected?: (itemIds: number[]) => void;
}

export const BatchActionBar: React.FC<BatchActionBarProps> = ({
  selectedItemIds,
  board,
  onClearSelection,
  onDuplicateSelected,
  onDeleteSelected,
  onMoveSelected,
  onExportSelected,
}) => {
  const { duplicateItem, deleteItem, updateItem } = useWorkspaceStore();
  const [isMoveDropdownOpen, setIsMoveDropdownOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const moveDropdownRef = useRef<HTMLDivElement>(null);

  const selectedCount = selectedItemIds.size;
  const selectedIdsArray = Array.from(selectedItemIds);

  // Click outside y escape para cerrar dropdown de mover
  useEffect(() => {
    if (!isMoveDropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        moveDropdownRef.current &&
        !moveDropdownRef.current.contains(e.target as Node)
      ) {
        setIsMoveDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMoveDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMoveDropdownOpen]);

  if (selectedCount === 0) {
    return null;
  }

  const handleDuplicate = async () => {
    setIsProcessing(true);
    try {
      if (onDuplicateSelected) {
        await onDuplicateSelected(selectedIdsArray);
      } else {
        for (const id of selectedIdsArray) {
          await duplicateItem(id);
        }
      }
      onClearSelection();
    } catch {
      // Error manejado en el store
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    setIsProcessing(true);
    try {
      if (onDeleteSelected) {
        await onDeleteSelected(selectedIdsArray);
      } else {
        for (const id of selectedIdsArray) {
          await deleteItem(id);
        }
      }
      onClearSelection();
    } catch {
      // Error manejado en el store
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMove = async (targetGroupId: number) => {
    setIsProcessing(true);
    setIsMoveDropdownOpen(false);
    try {
      if (onMoveSelected) {
        await onMoveSelected(selectedIdsArray, targetGroupId);
      } else {
        for (const id of selectedIdsArray) {
          await updateItem(id, { group_id: targetGroupId });
        }
      }
      onClearSelection();
    } catch {
      // Error manejado en el store
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    if (onExportSelected) {
      onExportSelected(selectedIdsArray);
      return;
    }

    const selectedSet = new Set(selectedItemIds);
    const selectedItemsWithGroup: { item: TaskItemRead; groupTitle: string }[] =
      [];

    for (const grp of board.groups) {
      for (const it of grp.items) {
        if (selectedSet.has(it.id)) {
          selectedItemsWithGroup.push({ item: it, groupTitle: grp.title });
        }
      }
    }

    const statusMap = new Map<string, string>();
    for (const st of board.statuses) {
      statusMap.set(st.key, st.label);
    }

    const header =
      'ID,Grupo,Tarea,Estado,Prioridad,Responsable,Fecha Inicio,Fecha Limite,Horas Estimadas,Presupuesto,Notas';
    const rows = selectedItemsWithGroup.map(({ item, groupTitle }) => {
      const stLabel = statusMap.get(item.status_key) ?? item.status_key;
      const assigneeName = item.assignee?.full_name ?? 'Sin asignar';
      const hours = (item.estimated_hours ?? 0).toFixed(2);
      const budget = (item.budget ?? 0).toFixed(2);
      return `${item.id},"${groupTitle}","${item.title}","${stLabel}","${item.priority}","${assigneeName}","${item.start_date ?? ''}","${item.due_date ?? ''}",${hours},${budget},"${item.notes ?? ''}"`;
    });

    const csvContent = [header, ...rows].join('\n');

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
        link.setAttribute('download', `selected_items_${board.id}_export.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch {
      // En entorno jsdom/testing ignoramos errores del navegador
    }
  };

  return (
    <div
      data-testid="batch-action-bar"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.18)] border border-gray-200 px-4 py-2.5 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-150 select-none"
    >
      {/* 1. Insignia de Contador Azul */}
      <div className="flex items-center gap-2 pr-2">
        <span
          data-testid="batch-selected-count"
          className="w-6 h-6 rounded-full bg-[#0073ea] text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs"
        >
          {selectedCount}
        </span>
        <span className="text-xs font-semibold text-[#323338] whitespace-nowrap">
          {selectedCount}{' '}
          {selectedCount === 1
            ? 'Elemento seleccionado'
            : 'Elementos seleccionados'}
        </span>
      </div>

      <div className="h-5 w-px bg-gray-200" />

      {/* 2. Botón Duplicar */}
      <button
        type="button"
        data-testid="batch-duplicate-btn"
        disabled={isProcessing}
        onClick={() => void handleDuplicate()}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#323338] hover:bg-[#f6f7fb] active:bg-[#edf5ff] transition-colors cursor-pointer disabled:opacity-50"
      >
        <Copy className="w-3.5 h-3.5 text-[#676879]" />
        <span>Duplicar</span>
      </button>

      {/* 3. Botón Eliminar */}
      <button
        type="button"
        data-testid="batch-delete-btn"
        disabled={isProcessing}
        onClick={() => void handleDelete()}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#e2445c] hover:bg-red-50 active:bg-red-100 transition-colors cursor-pointer disabled:opacity-50"
      >
        <Trash2 className="w-3.5 h-3.5 text-[#e2445c]" />
        <span>Eliminar</span>
      </button>

      {/* 4. Botón Mover (con menú de grupos) */}
      <div ref={moveDropdownRef} className="relative">
        <button
          type="button"
          data-testid="batch-move-btn"
          disabled={isProcessing}
          onClick={() => setIsMoveDropdownOpen((prev) => !prev)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#323338] hover:bg-[#f6f7fb] active:bg-[#edf5ff] transition-colors cursor-pointer disabled:opacity-50"
        >
          <ArrowRightLeft className="w-3.5 h-3.5 text-[#676879]" />
          <span>Mover</span>
        </button>

        {isMoveDropdownOpen && (
          <div
            data-testid="batch-move-dropdown"
            className="absolute bottom-full left-0 mb-2 w-52 bg-white border border-[#d0d4e4] rounded-xl shadow-xl py-1.5 z-50 text-xs text-[#323338] animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="px-3 py-1.5 font-bold uppercase tracking-wider text-[10px] text-[#676879] border-b border-gray-100">
              Mover a grupo
            </div>
            {board.groups.map((grp) => (
              <button
                key={grp.id}
                type="button"
                data-testid={`batch-move-to-group-${grp.id}`}
                onClick={() => void handleMove(grp.id)}
                className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-[#f6f7fb] transition-colors cursor-pointer truncate"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: grp.color }}
                />
                <span className="truncate font-medium">{grp.title}</span>
              </button>
            ))}
            {board.groups.length === 0 && (
              <div className="px-3 py-2 text-gray-400 italic text-center">
                No hay otros grupos
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Botón Exportar */}
      <button
        type="button"
        data-testid="batch-export-btn"
        disabled={isProcessing}
        onClick={handleExport}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#323338] hover:bg-[#f6f7fb] active:bg-[#edf5ff] transition-colors cursor-pointer disabled:opacity-50"
      >
        <Download className="w-3.5 h-3.5 text-[#676879]" />
        <span>Exportar</span>
      </button>

      <div className="h-5 w-px bg-gray-200" />

      {/* 6. Botón Cerrar X */}
      <button
        type="button"
        data-testid="batch-close-btn"
        aria-label="Deseleccionar tareas"
        onClick={onClearSelection}
        className="p-1 rounded-md text-[#676879] hover:text-[#323338] hover:bg-gray-100 transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
