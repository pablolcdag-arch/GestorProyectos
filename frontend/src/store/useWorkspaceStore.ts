import { create } from 'zustand';
import { api } from '../services/api';
import type {
  BoardCreate,
  BoardDetailRead,
  BoardStatusCreate,
  BoardStatusRead,
  BoardStatusUpdate,
  BoardSummaryRead,
  BoardUpdate,
  TaskGroupCreate,
  TaskGroupRead,
  TaskGroupUpdate,
  TaskItemCreate,
  TaskItemRead,
  TaskItemUpdate,
  UserRead,
  WorkspaceCreate,
  WorkspaceRead,
  WorkspaceUpdate,
} from '../types';

function cloneBoard(board: BoardDetailRead | null): BoardDetailRead | null {
  if (!board) return null;
  return {
    ...board,
    statuses: board.statuses.map((st) => ({ ...st })),
    groups: board.groups.map((grp) => ({
      ...grp,
      items: grp.items.map((item) => ({
        ...item,
        assignee: item.assignee ? { ...item.assignee } : item.assignee,
      })),
    })),
  };
}

interface WorkspaceState {
  workspaces: WorkspaceRead[];
  activeWorkspaceId: number | null;
  activeBoardId: number | null;
  activeBoard: BoardDetailRead | null;
  isLoadingWorkspaces: boolean;
  isLoadingBoard: boolean;
  error: string | null;

  loadWorkspaces: () => Promise<void>;
  selectWorkspace: (workspaceId: number) => Promise<void>;
  createWorkspace: (payload: WorkspaceCreate) => Promise<WorkspaceRead>;
  updateWorkspace: (
    workspaceId: number,
    payload: WorkspaceUpdate,
  ) => Promise<WorkspaceRead>;
  deleteWorkspace: (workspaceId: number) => Promise<void>;

  selectBoard: (boardId: number) => Promise<void>;
  createBoard: (payload: BoardCreate) => Promise<BoardDetailRead>;
  updateBoard: (
    boardId: number,
    payload: BoardUpdate,
  ) => Promise<BoardDetailRead>;
  deleteBoard: (boardId: number) => Promise<void>;

  createBoardStatus: (
    boardId: number,
    payload: BoardStatusCreate,
  ) => Promise<BoardStatusRead>;
  updateBoardStatus: (
    boardId: number,
    statusId: number,
    payload: BoardStatusUpdate,
  ) => Promise<BoardStatusRead>;
  deleteBoardStatus: (boardId: number, statusId: number) => Promise<void>;

  createGroup: (
    boardId: number,
    payload: TaskGroupCreate,
  ) => Promise<TaskGroupRead>;
  updateGroup: (
    groupId: number,
    payload: TaskGroupUpdate,
  ) => Promise<TaskGroupRead>;
  deleteGroup: (groupId: number) => Promise<void>;

  createItem: (
    groupId: number,
    payload: TaskItemCreate,
  ) => Promise<TaskItemRead>;
  updateItem: (
    itemId: number,
    payload: TaskItemUpdate,
    optimisticAssignee?: UserRead | null,
  ) => Promise<TaskItemRead>;
  deleteItem: (itemId: number) => Promise<void>;

  toggleGroupCollapse: (groupId: number) => void;
  clearError: () => void;
  resetStore: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  activeBoardId: null,
  activeBoard: null,
  isLoadingWorkspaces: false,
  isLoadingBoard: false,
  error: null,

  loadWorkspaces: async () => {
    set({ isLoadingWorkspaces: true, error: null });
    try {
      const workspaces = await api.getWorkspaces();
      const currentWsId = get().activeWorkspaceId;
      const targetWs =
        workspaces.find((w) => w.id === currentWsId) ?? workspaces[0] ?? null;

      if (!targetWs) {
        set({
          workspaces: [],
          activeWorkspaceId: null,
          activeBoardId: null,
          activeBoard: null,
          isLoadingWorkspaces: false,
        });
        return;
      }

      const firstBoardId = targetWs.boards[0]?.id ?? null;
      set({
        workspaces,
        activeWorkspaceId: targetWs.id,
        activeBoardId: firstBoardId,
        isLoadingWorkspaces: false,
      });

      if (firstBoardId !== null) {
        await get().selectBoard(firstBoardId);
      } else {
        set({ activeBoard: null });
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Error al cargar los espacios de trabajo.';
      set({ isLoadingWorkspaces: false, error: message });
    }
  },

  selectWorkspace: async (workspaceId: number) => {
    const ws = get().workspaces.find((w) => w.id === workspaceId);
    if (!ws) return;

    const firstBoardId = ws.boards[0]?.id ?? null;
    set({
      activeWorkspaceId: workspaceId,
      activeBoardId: firstBoardId,
      error: null,
    });

    if (firstBoardId !== null) {
      await get().selectBoard(firstBoardId);
    } else {
      set({ activeBoard: null });
    }
  },

  createWorkspace: async (payload: WorkspaceCreate) => {
    set({ error: null });
    try {
      const created = await api.createWorkspace(payload);
      const nextWorkspaces = [...get().workspaces, created];
      const firstBoardId = created.boards?.[0]?.id ?? null;
      set({
        workspaces: nextWorkspaces,
        activeWorkspaceId: created.id,
        activeBoardId: firstBoardId,
        activeBoard: null,
      });
      if (firstBoardId !== null) {
        await get().selectBoard(firstBoardId);
      }
      return created;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo crear el espacio de trabajo.';
      set({ error: message });
      throw err;
    }
  },

  updateWorkspace: async (workspaceId: number, payload: WorkspaceUpdate) => {
    const previousWorkspaces = get().workspaces;
    set({
      error: null,
      workspaces: previousWorkspaces.map((ws) =>
        ws.id === workspaceId ? { ...ws, ...payload } : ws,
      ),
    });

    try {
      const updated = await api.updateWorkspace(workspaceId, payload);
      set({
        workspaces: get().workspaces.map((ws) =>
          ws.id === workspaceId
            ? { ...ws, ...updated, boards: updated.boards ?? ws.boards }
            : ws,
        ),
      });
      return updated;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo actualizar el espacio de trabajo.';
      set({ workspaces: previousWorkspaces, error: message });
      throw err;
    }
  },

  deleteWorkspace: async (workspaceId: number) => {
    set({ error: null });
    try {
      await api.deleteWorkspace(workspaceId);
      const remaining = get().workspaces.filter((ws) => ws.id !== workspaceId);
      const wasActive = get().activeWorkspaceId === workspaceId;

      if (!wasActive) {
        set({ workspaces: remaining });
        return;
      }

      const nextWs = remaining[0] ?? null;
      const nextBoardId = nextWs?.boards[0]?.id ?? null;
      set({
        workspaces: remaining,
        activeWorkspaceId: nextWs?.id ?? null,
        activeBoardId: nextBoardId,
        activeBoard: null,
      });

      if (nextBoardId !== null) {
        await get().selectBoard(nextBoardId);
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo eliminar el espacio de trabajo.';
      set({ error: message });
      throw err;
    }
  },

  selectBoard: async (boardId: number) => {
    set({ activeBoardId: boardId, isLoadingBoard: true, error: null });
    try {
      const detail = await api.getBoardDetail(boardId);
      set({
        activeBoard: detail,
        activeBoardId: detail.id,
        activeWorkspaceId: detail.workspace_id,
        isLoadingBoard: false,
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo cargar el detalle del tablero.';
      set({ isLoadingBoard: false, error: message });
    }
  },

  createBoard: async (payload: BoardCreate) => {
    set({ error: null });
    try {
      const created = await api.createBoard(payload);
      const summary: BoardSummaryRead = {
        id: created.id,
        workspace_id: created.workspace_id,
        name: created.name,
        description: created.description,
        created_at: created.created_at,
      };

      const nextWorkspaces = get().workspaces.map((ws) =>
        ws.id === created.workspace_id
          ? { ...ws, boards: [...ws.boards, summary] }
          : ws,
      );

      set({
        workspaces: nextWorkspaces,
        activeWorkspaceId: created.workspace_id,
        activeBoardId: created.id,
        activeBoard: created,
      });
      return created;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo crear el tablero.';
      set({ error: message });
      throw err;
    }
  },

  updateBoard: async (boardId: number, payload: BoardUpdate) => {
    const prevBoard = cloneBoard(get().activeBoard);
    const prevWorkspaces = get().workspaces;

    if (prevBoard && prevBoard.id === boardId) {
      set({
        activeBoard: {
          ...prevBoard,
          name: payload.name ?? prevBoard.name,
          description: payload.description ?? prevBoard.description,
        },
      });
    }

    try {
      const updated = await api.updateBoard(boardId, payload);
      set({
        activeBoard:
          get().activeBoard?.id === boardId ? updated : get().activeBoard,
        workspaces: get().workspaces.map((ws) => ({
          ...ws,
          boards: ws.boards.map((b) =>
            b.id === boardId
              ? { ...b, name: updated.name, description: updated.description }
              : b,
          ),
        })),
      });
      return updated;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo actualizar el tablero.';
      set({
        activeBoard: prevBoard,
        workspaces: prevWorkspaces,
        error: message,
      });
      throw err;
    }
  },

  deleteBoard: async (boardId: number) => {
    set({ error: null });
    try {
      await api.deleteBoard(boardId);
      const nextWorkspaces = get().workspaces.map((ws) => ({
        ...ws,
        boards: ws.boards.filter((b) => b.id !== boardId),
      }));

      const activeWs = nextWorkspaces.find(
        (ws) => ws.id === get().activeWorkspaceId,
      );
      const wasActiveBoard = get().activeBoardId === boardId;

      if (!wasActiveBoard) {
        set({ workspaces: nextWorkspaces });
        return;
      }

      const nextBoardId = activeWs?.boards[0]?.id ?? null;
      set({
        workspaces: nextWorkspaces,
        activeBoardId: nextBoardId,
        activeBoard: null,
      });

      if (nextBoardId !== null) {
        await get().selectBoard(nextBoardId);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo eliminar el tablero.';
      set({ error: message });
      throw err;
    }
  },

  createBoardStatus: async (boardId: number, payload: BoardStatusCreate) => {
    set({ error: null });
    try {
      const createdStatus = await api.createBoardStatus(boardId, payload);
      const currentBoard = get().activeBoard;
      if (currentBoard && currentBoard.id === boardId) {
        const nextStatuses = [...currentBoard.statuses, createdStatus].sort(
          (a, b) => a.position - b.position || a.id - b.id,
        );
        set({
          activeBoard: {
            ...currentBoard,
            statuses: nextStatuses,
          },
        });
      }
      return createdStatus;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo crear el estado personalizado.';
      set({ error: message });
      throw err;
    }
  },

  updateBoardStatus: async (
    boardId: number,
    statusId: number,
    payload: BoardStatusUpdate,
  ) => {
    const previousBoard = cloneBoard(get().activeBoard);
    set({ error: null });

    const current = get().activeBoard;
    if (current && current.id === boardId) {
      set({
        activeBoard: {
          ...current,
          statuses: current.statuses.map((st) =>
            st.id === statusId
              ? {
                  ...st,
                  label: payload.label ?? st.label,
                  color: payload.color ?? st.color,
                  position: payload.position ?? st.position,
                }
              : st,
          ),
        },
      });
    }

    try {
      const updatedStatus = await api.updateBoardStatus(
        boardId,
        statusId,
        payload,
      );
      const currentBoard = get().activeBoard;
      if (currentBoard && currentBoard.id === boardId) {
        set({
          activeBoard: {
            ...currentBoard,
            statuses: currentBoard.statuses
              .map((st) => (st.id === statusId ? updatedStatus : st))
              .sort((a, b) => a.position - b.position || a.id - b.id),
          },
        });
      }
      return updatedStatus;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo actualizar el estado.';
      set({ activeBoard: previousBoard, error: message });
      throw err;
    }
  },

  deleteBoardStatus: async (boardId: number, statusId: number) => {
    const previousBoard = cloneBoard(get().activeBoard);
    const statusToDelete = previousBoard?.statuses.find(
      (st) => st.id === statusId,
    );
    set({ error: null });

    try {
      const res = await api.deleteBoardStatus(boardId, statusId);
      const currentBoard = get().activeBoard;
      if (currentBoard && currentBoard.id === boardId) {
        const deletedKey = statusToDelete?.key;
        set({
          activeBoard: {
            ...currentBoard,
            statuses: currentBoard.statuses.filter((st) => st.id !== statusId),
            groups: currentBoard.groups.map((grp) => ({
              ...grp,
              items: grp.items.map((item) =>
                deletedKey && item.status_key === deletedKey
                  ? { ...item, status_key: res.reassigned_to_key }
                  : item,
              ),
            })),
          },
        });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo eliminar el estado.';
      set({ activeBoard: previousBoard, error: message });
      throw err;
    }
  },

  createGroup: async (boardId: number, payload: TaskGroupCreate) => {
    set({ error: null });
    try {
      const createdGroup = await api.createTaskGroup(boardId, payload);
      const currentBoard = get().activeBoard;
      if (currentBoard && currentBoard.id === boardId) {
        const groupWithItems: TaskGroupRead = {
          ...createdGroup,
          items: createdGroup.items ?? [],
        };
        const nextGroups = [...currentBoard.groups, groupWithItems].sort(
          (a, b) => a.position - b.position || a.id - b.id,
        );
        set({
          activeBoard: {
            ...currentBoard,
            groups: nextGroups,
          },
        });
      }
      return createdGroup;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo crear el grupo.';
      set({ error: message });
      throw err;
    }
  },

  updateGroup: async (groupId: number, payload: TaskGroupUpdate) => {
    const previousBoard = cloneBoard(get().activeBoard);
    set({ error: null });

    const currentBoard = get().activeBoard;
    if (currentBoard) {
      set({
        activeBoard: {
          ...currentBoard,
          groups: currentBoard.groups.map((grp) =>
            grp.id === groupId
              ? {
                  ...grp,
                  title: payload.title ?? grp.title,
                  color: payload.color ?? grp.color,
                  position: payload.position ?? grp.position,
                  collapsed: payload.collapsed ?? grp.collapsed,
                }
              : grp,
          ),
        },
      });
    }

    try {
      const updatedGroup = await api.updateTaskGroup(groupId, payload);
      const latestBoard = get().activeBoard;
      if (latestBoard) {
        set({
          activeBoard: {
            ...latestBoard,
            groups: latestBoard.groups
              .map((grp) =>
                grp.id === groupId
                  ? {
                      ...grp,
                      ...updatedGroup,
                      items: updatedGroup.items ?? grp.items,
                    }
                  : grp,
              )
              .sort((a, b) => a.position - b.position || a.id - b.id),
          },
        });
      }
      return updatedGroup;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo actualizar el grupo.';
      set({ activeBoard: previousBoard, error: message });
      throw err;
    }
  },

  deleteGroup: async (groupId: number) => {
    const previousBoard = cloneBoard(get().activeBoard);
    set({ error: null });

    const currentBoard = get().activeBoard;
    if (currentBoard) {
      set({
        activeBoard: {
          ...currentBoard,
          groups: currentBoard.groups.filter((grp) => grp.id !== groupId),
        },
      });
    }

    try {
      await api.deleteTaskGroup(groupId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo eliminar el grupo.';
      set({ activeBoard: previousBoard, error: message });
      throw err;
    }
  },

  createItem: async (groupId: number, payload: TaskItemCreate) => {
    set({ error: null });
    try {
      const createdItem = await api.createTaskItem(groupId, payload);
      const currentBoard = get().activeBoard;
      if (currentBoard) {
        set({
          activeBoard: {
            ...currentBoard,
            groups: currentBoard.groups.map((grp) =>
              grp.id === groupId
                ? {
                    ...grp,
                    items: [...grp.items, createdItem].sort(
                      (a, b) => a.position - b.position || a.id - b.id,
                    ),
                  }
                : grp,
            ),
          },
        });
      }
      return createdItem;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo crear la tarea.';
      set({ error: message });
      throw err;
    }
  },

  updateItem: async (
    itemId: number,
    payload: TaskItemUpdate,
    optimisticAssignee?: UserRead | null,
  ) => {
    const previousBoard = cloneBoard(get().activeBoard);
    set({ error: null });

    const currentBoard = get().activeBoard;
    if (currentBoard) {
      let existingItem: TaskItemRead | undefined;
      for (const grp of currentBoard.groups) {
        const found = grp.items.find((i) => i.id === itemId);
        if (found) {
          existingItem = found;
          break;
        }
      }

      if (existingItem) {
        const hasAssigneeField = Object.prototype.hasOwnProperty.call(
          payload,
          'assignee_id',
        );
        const hasDueDateField = Object.prototype.hasOwnProperty.call(
          payload,
          'due_date',
        );

        const nextAssigneeId = hasAssigneeField
          ? (payload.assignee_id ?? null)
          : existingItem.assignee_id;

        const nextAssignee = hasAssigneeField
          ? payload.assignee_id === null
            ? null
            : optimisticAssignee !== undefined
              ? optimisticAssignee
              : existingItem.assignee
          : existingItem.assignee;

        const nextGroupId =
          payload.group_id !== undefined
            ? payload.group_id
            : existingItem.group_id;

        const optimisticItem: TaskItemRead = {
          ...existingItem,
          title: payload.title !== undefined ? payload.title : existingItem.title,
          group_id: nextGroupId,
          status_key:
            payload.status_key !== undefined
              ? payload.status_key
              : existingItem.status_key,
          priority:
            payload.priority !== undefined
              ? payload.priority
              : existingItem.priority,
          assignee_id: nextAssigneeId,
          assignee: nextAssignee,
          due_date: hasDueDateField
            ? (payload.due_date ?? null)
            : existingItem.due_date,
          notes:
            payload.notes !== undefined ? payload.notes : existingItem.notes,
          position:
            payload.position !== undefined
              ? payload.position
              : existingItem.position,
        };

        const movedGroup = nextGroupId !== existingItem.group_id;

        const nextGroups = currentBoard.groups.map((grp) => {
          if (!movedGroup) {
            if (grp.id !== existingItem!.group_id) return grp;
            return {
              ...grp,
              items: grp.items.map((item) =>
                item.id === itemId ? optimisticItem : item,
              ),
            };
          }

          if (grp.id === existingItem!.group_id) {
            return {
              ...grp,
              items: grp.items.filter((item) => item.id !== itemId),
            };
          }
          if (grp.id === nextGroupId) {
            return {
              ...grp,
              items: [...grp.items, optimisticItem],
            };
          }
          return grp;
        });

        set({
          activeBoard: {
            ...currentBoard,
            groups: nextGroups,
          },
        });
      }
    }

    try {
      const updatedItem = await api.updateTaskItem(itemId, payload);
      const latestBoard = get().activeBoard;
      if (latestBoard) {
        const nextGroups = latestBoard.groups.map((grp) => {
          const withoutItem = grp.items.filter((item) => item.id !== itemId);
          if (grp.id === updatedItem.group_id) {
            return {
              ...grp,
              items: [...withoutItem, updatedItem].sort(
                (a, b) => a.position - b.position || a.id - b.id,
              ),
            };
          }
          return {
            ...grp,
            items: withoutItem,
          };
        });

        set({
          activeBoard: {
            ...latestBoard,
            groups: nextGroups,
          },
        });
      }
      return updatedItem;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo actualizar la tarea.';
      set({ activeBoard: previousBoard, error: message });
      throw err;
    }
  },

  deleteItem: async (itemId: number) => {
    const previousBoard = cloneBoard(get().activeBoard);
    set({ error: null });

    const currentBoard = get().activeBoard;
    if (currentBoard) {
      set({
        activeBoard: {
          ...currentBoard,
          groups: currentBoard.groups.map((grp) => ({
            ...grp,
            items: grp.items.filter((item) => item.id !== itemId),
          })),
        },
      });
    }

    try {
      await api.deleteTaskItem(itemId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo eliminar la tarea.';
      set({ activeBoard: previousBoard, error: message });
      throw err;
    }
  },

  toggleGroupCollapse: (groupId: number) => {
    const currentBoard = get().activeBoard;
    if (!currentBoard) return;
    set({
      activeBoard: {
        ...currentBoard,
        groups: currentBoard.groups.map((grp) =>
          grp.id === groupId ? { ...grp, collapsed: !grp.collapsed } : grp,
        ),
      },
    });
  },

  clearError: () => set({ error: null }),

  resetStore: () =>
    set({
      workspaces: [],
      activeWorkspaceId: null,
      activeBoardId: null,
      activeBoard: null,
      isLoadingWorkspaces: false,
      isLoadingBoard: false,
      error: null,
    }),
}));
