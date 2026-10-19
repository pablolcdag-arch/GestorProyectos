import { create } from 'zustand';
import { api } from '../services/api';
import type {
  BoardAnalyticsRead,
  BoardAutomationRead,
  BoardCreate,
  BoardDetailRead,
  BoardStatusCreate,
  BoardStatusRead,
  BoardStatusUpdate,
  BoardSummaryRead,
  BoardUpdate,
  MyWorkResponse,
  TaskChecklistItemRead,
  TaskChecklistUpdate,
  TaskCommentRead,
  TaskGroupCreate,
  TaskGroupRead,
  TaskGroupUpdate,
  TaskItemCreate,
  TaskItemDetailRead,
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

function updateItemCountersInBoard(
  board: BoardDetailRead | null,
  itemId: number,
  counters: {
    comments_count?: number;
    checklist_total?: number;
    checklist_completed?: number;
  },
): BoardDetailRead | null {
  if (!board) return null;
  return {
    ...board,
    groups: board.groups.map((grp) => ({
      ...grp,
      items: grp.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              comments_count:
                counters.comments_count !== undefined
                  ? counters.comments_count
                  : item.comments_count,
              checklist_total:
                counters.checklist_total !== undefined
                  ? counters.checklist_total
                  : item.checklist_total,
              checklist_completed:
                counters.checklist_completed !== undefined
                  ? counters.checklist_completed
                  : item.checklist_completed,
            }
          : item,
      ),
    })),
  };
}

interface WorkspaceState {
  workspaces: WorkspaceRead[];
  activeWorkspaceId: number | null;
  activeBoardId: number | null;
  activeBoard: BoardDetailRead | null;
  activeItemDetail: TaskItemDetailRead | null;
  boardAnalytics: BoardAnalyticsRead | null;
  currentViewMode: 'board' | 'my-work';
  myWorkData: MyWorkResponse | null;
  isLoadingMyWork: boolean;
  boardAutomations: BoardAutomationRead[];
  isLoadingAutomations: boolean;
  isLoadingWorkspaces: boolean;
  isLoadingBoard: boolean;
  isLoadingItemDetail: boolean;
  isLoadingAnalytics: boolean;
  error: string | null;

  setViewMode: (mode: 'board' | 'my-work') => void;
  loadMyWork: () => Promise<MyWorkResponse | null>;
  loadBoardAutomations: (boardId: number) => Promise<BoardAutomationRead[]>;
  toggleAutomation: (
    boardId: number,
    ruleType: string,
    currentActive: boolean,
    existingId?: number,
  ) => Promise<void>;

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
  loadBoardAnalytics: (boardId: number) => Promise<BoardAnalyticsRead | null>;

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
  duplicateItem: (itemId: number) => Promise<TaskItemRead>;

  openItemDrawer: (itemId: number) => Promise<void>;
  closeItemDrawer: () => void;
  addComment: (itemId: number, content: string) => Promise<TaskCommentRead>;
  removeComment: (commentId: number) => Promise<void>;
  addChecklistItem: (
    itemId: number,
    title: string,
  ) => Promise<TaskChecklistItemRead>;
  toggleOrUpdateChecklistItem: (
    checklistId: number,
    payload: TaskChecklistUpdate,
  ) => Promise<TaskChecklistItemRead>;
  removeChecklistItem: (checklistId: number) => Promise<void>;

  toggleGroupCollapse: (groupId: number) => void;
  clearError: () => void;
  resetStore: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  activeBoardId: null,
  activeBoard: null,
  activeItemDetail: null,
  boardAnalytics: null,
  currentViewMode: 'board',
  myWorkData: null,
  isLoadingMyWork: false,
  boardAutomations: [],
  isLoadingAutomations: false,
  isLoadingWorkspaces: false,
  isLoadingBoard: false,
  isLoadingItemDetail: false,
  isLoadingAnalytics: false,
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
          activeItemDetail: null,
          boardAnalytics: null,
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
        set({
          activeBoard: null,
          activeItemDetail: null,
          boardAnalytics: null,
        });
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
      activeItemDetail: null,
      boardAnalytics: null,
      currentViewMode: 'board',
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
        activeItemDetail: null,
        boardAnalytics: null,
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
        activeItemDetail: null,
        boardAnalytics: null,
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
    set({
      activeBoardId: boardId,
      activeItemDetail: null,
      boardAnalytics: null,
      currentViewMode: 'board',
      isLoadingBoard: true,
      error: null,
    });
    try {
      const detail = await api.getBoardDetail(boardId);
      set({
        activeBoard: cloneBoard(detail),
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

  loadBoardAnalytics: async (boardId: number) => {
    set({ isLoadingAnalytics: true });
    try {
      const analytics = await api.getBoardAnalytics(boardId);
      if (analytics && typeof analytics.board_id === 'number') {
        set({ boardAnalytics: analytics, isLoadingAnalytics: false });
        return analytics;
      }
      set({ isLoadingAnalytics: false });
      return null;
    } catch {
      // Si el endpoint no está mockeado en un test parcial, el Dashboard usa el cálculo reactivo local
      set({ isLoadingAnalytics: false });
      return null;
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
        activeItemDetail: null,
        boardAnalytics: null,
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
        activeItemDetail: null,
        boardAnalytics: null,
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
    const previousItemDetail = get().activeItemDetail
      ? { ...get().activeItemDetail! }
      : null;
    set({ error: null });

    let existingItem: TaskItemRead | undefined;
    const currentBoard = get().activeBoard;
    if (currentBoard) {
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
        const hasStartDateField = Object.prototype.hasOwnProperty.call(
          payload,
          'start_date',
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
          start_date: hasStartDateField
            ? (payload.start_date || null)
            : existingItem.start_date,
          due_date: hasDueDateField
            ? (payload.due_date || null)
            : existingItem.due_date,
          estimated_hours:
            payload.estimated_hours !== undefined
              ? payload.estimated_hours
              : existingItem.estimated_hours,
          budget:
            payload.budget !== undefined ? payload.budget : existingItem.budget,
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

        const currentDetail = get().activeItemDetail;
        set({
          activeBoard: {
            ...currentBoard,
            groups: nextGroups,
          },
          activeItemDetail:
            currentDetail && currentDetail.id === itemId
              ? { ...currentDetail, ...optimisticItem }
              : currentDetail,
        });
      }
    }

    try {
      const updatedItem = await api.updateTaskItem(itemId, payload);
      const latestBoard = get().activeBoard;
      if (latestBoard && updatedItem) {
        const mergedItem: TaskItemRead = {
          ...(existingItem ?? updatedItem),
          ...updatedItem,
        };
        const nextGroups = latestBoard.groups.map((grp) => {
          const withoutItem = grp.items.filter((item) => item.id !== itemId);
          if (grp.id === mergedItem.group_id) {
            return {
              ...grp,
              items: [...withoutItem, mergedItem].sort(
                (a, b) => a.position - b.position || a.id - b.id,
              ),
            };
          }
          return {
            ...grp,
            items: withoutItem,
          };
        });

        const currentDetail = get().activeItemDetail;
        set({
          activeBoard: {
            ...latestBoard,
            groups: nextGroups,
          },
          activeItemDetail:
            currentDetail && currentDetail.id === itemId
              ? { ...currentDetail, ...mergedItem }
              : currentDetail,
        });
        return mergedItem;
      }
      return updatedItem;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo actualizar la tarea.';
      set({
        activeBoard: previousBoard,
        activeItemDetail: previousItemDetail,
        error: message,
      });
      throw err;
    }
  },

  deleteItem: async (itemId: number) => {
    const previousBoard = cloneBoard(get().activeBoard);
    const previousItemDetail = get().activeItemDetail;
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
        activeItemDetail:
          previousItemDetail?.id === itemId ? null : previousItemDetail,
      });
    }

    try {
      await api.deleteTaskItem(itemId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo eliminar la tarea.';
      set({
        activeBoard: previousBoard,
        activeItemDetail: previousItemDetail,
        error: message,
      });
      throw err;
    }
  },

  duplicateItem: async (itemId: number) => {
    set({ error: null });
    try {
      const duplicatedItem = await api.duplicateTaskItem(itemId);
      const currentBoard = get().activeBoard;
      if (currentBoard && duplicatedItem) {
        set({
          activeBoard: {
            ...currentBoard,
            groups: currentBoard.groups.map((grp) =>
              grp.id === duplicatedItem.group_id
                ? {
                    ...grp,
                    items: [
                      ...grp.items.filter((i) => i.id !== duplicatedItem.id),
                      duplicatedItem,
                    ].sort((a, b) => a.position - b.position || a.id - b.id),
                  }
                : grp,
            ),
          },
        });
      }
      return duplicatedItem;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'No se pudo duplicar la tarea.';
      set({ error: message });
      throw err;
    }
  },

  openItemDrawer: async (itemId: number) => {
    set({ isLoadingItemDetail: true, error: null });
    try {
      const detail = await api.getTaskItemDetail(itemId);
      const nextBoard = updateItemCountersInBoard(get().activeBoard, itemId, {
        comments_count: detail.comments.length,
        checklist_total: detail.checklist_items.length,
        checklist_completed: detail.checklist_items.filter((c) => c.is_completed)
          .length,
      });
      set({
        activeItemDetail: detail,
        activeBoard: nextBoard,
        isLoadingItemDetail: false,
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo cargar el detalle de la tarea.';
      set({ isLoadingItemDetail: false, error: message });
    }
  },

  closeItemDrawer: () => {
    set({ activeItemDetail: null, isLoadingItemDetail: false });
  },

  addComment: async (itemId: number, content: string) => {
    set({ error: null });
    try {
      const createdComment = await api.createTaskComment(itemId, { content });
      const detail = get().activeItemDetail;
      const nextComments = detail
        ? [createdComment, ...detail.comments]
        : [createdComment];
      const nextCount = nextComments.length;

      set({
        activeItemDetail:
          detail && detail.id === itemId
            ? {
                ...detail,
                comments: nextComments,
                comments_count: nextCount,
              }
            : detail,
        activeBoard: updateItemCountersInBoard(get().activeBoard, itemId, {
          comments_count: nextCount,
        }),
      });
      return createdComment;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo publicar el comentario.';
      set({ error: message });
      throw err;
    }
  },

  removeComment: async (commentId: number) => {
    set({ error: null });
    try {
      await api.deleteTaskComment(commentId);
      const detail = get().activeItemDetail;
      if (!detail) return;
      const nextComments = detail.comments.filter((c) => c.id !== commentId);
      const nextCount = nextComments.length;

      set({
        activeItemDetail: {
          ...detail,
          comments: nextComments,
          comments_count: nextCount,
        },
        activeBoard: updateItemCountersInBoard(get().activeBoard, detail.id, {
          comments_count: nextCount,
        }),
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo eliminar el comentario.';
      set({ error: message });
      throw err;
    }
  },

  addChecklistItem: async (itemId: number, title: string) => {
    set({ error: null });
    try {
      const createdItem = await api.createChecklistItem(itemId, { title });
      const detail = get().activeItemDetail;
      const nextChecklist = detail
        ? [...detail.checklist_items, createdItem].sort(
            (a, b) => a.position - b.position || a.id - b.id,
          )
        : [createdItem];
      const total = nextChecklist.length;
      const completed = nextChecklist.filter((c) => c.is_completed).length;

      set({
        activeItemDetail:
          detail && detail.id === itemId
            ? {
                ...detail,
                checklist_items: nextChecklist,
                checklist_total: total,
                checklist_completed: completed,
              }
            : detail,
        activeBoard: updateItemCountersInBoard(get().activeBoard, itemId, {
          checklist_total: total,
          checklist_completed: completed,
        }),
      });
      return createdItem;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo agregar el ítem al checklist.';
      set({ error: message });
      throw err;
    }
  },

  toggleOrUpdateChecklistItem: async (
    checklistId: number,
    payload: TaskChecklistUpdate,
  ) => {
    set({ error: null });
    try {
      const updated = await api.updateChecklistItem(checklistId, payload);
      const detail = get().activeItemDetail;
      if (!detail) return updated;

      const nextChecklist = detail.checklist_items
        .map((c) => (c.id === checklistId ? updated : c))
        .sort((a, b) => a.position - b.position || a.id - b.id);
      const total = nextChecklist.length;
      const completed = nextChecklist.filter((c) => c.is_completed).length;

      set({
        activeItemDetail: {
          ...detail,
          checklist_items: nextChecklist,
          checklist_total: total,
          checklist_completed: completed,
        },
        activeBoard: updateItemCountersInBoard(get().activeBoard, detail.id, {
          checklist_total: total,
          checklist_completed: completed,
        }),
      });
      return updated;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo actualizar el ítem del checklist.';
      set({ error: message });
      throw err;
    }
  },

  removeChecklistItem: async (checklistId: number) => {
    set({ error: null });
    try {
      await api.deleteChecklistItem(checklistId);
      const detail = get().activeItemDetail;
      if (!detail) return;

      const nextChecklist = detail.checklist_items.filter(
        (c) => c.id !== checklistId,
      );
      const total = nextChecklist.length;
      const completed = nextChecklist.filter((c) => c.is_completed).length;

      set({
        activeItemDetail: {
          ...detail,
          checklist_items: nextChecklist,
          checklist_total: total,
          checklist_completed: completed,
        },
        activeBoard: updateItemCountersInBoard(get().activeBoard, detail.id, {
          checklist_total: total,
          checklist_completed: completed,
        }),
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo eliminar el ítem del checklist.';
      set({ error: message });
      throw err;
    }
  },

  setViewMode: (mode: 'board' | 'my-work') => set({ currentViewMode: mode }),

  loadMyWork: async () => {
    set({ isLoadingMyWork: true, error: null });
    try {
      const data = await api.getMyWork();
      set({ myWorkData: data, isLoadingMyWork: false });
      return data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al cargar Mi Trabajo.';
      set({ isLoadingMyWork: false, error: message });
      return null;
    }
  },

  loadBoardAutomations: async (boardId: number) => {
    set({ isLoadingAutomations: true, error: null });
    try {
      const automations = await api.getBoardAutomations(boardId);
      set({ boardAutomations: automations, isLoadingAutomations: false });
      return automations;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Error al cargar las automatizaciones.';
      set({ isLoadingAutomations: false, error: message });
      return [];
    }
  },

  toggleAutomation: async (
    boardId: number,
    ruleType: string,
    currentActive: boolean,
    existingId?: number,
  ) => {
    set({ error: null });
    try {
      let updatedRule: BoardAutomationRead;
      if (existingId !== undefined && existingId > 0) {
        updatedRule = await api.updateBoardAutomation(existingId, {
          is_active: !currentActive,
        });
      } else {
        updatedRule = await api.createBoardAutomation(boardId, {
          rule_type: ruleType,
          is_active: true,
        });
      }
      const prev = get().boardAutomations;
      const foundIdx = prev.findIndex(
        (r) => r.id === updatedRule.id || r.rule_type === ruleType,
      );
      if (foundIdx >= 0) {
        const next = [...prev];
        next[foundIdx] = updatedRule;
        set({ boardAutomations: next });
      } else {
        set({ boardAutomations: [...prev, updatedRule] });
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo actualizar la automatización.';
      set({ error: message });
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
      activeItemDetail: null,
      boardAnalytics: null,
      currentViewMode: 'board',
      myWorkData: null,
      isLoadingMyWork: false,
      boardAutomations: [],
      isLoadingAutomations: false,
      isLoadingWorkspaces: false,
      isLoadingBoard: false,
      isLoadingItemDetail: false,
      isLoadingAnalytics: false,
      error: null,
    }),
}));
