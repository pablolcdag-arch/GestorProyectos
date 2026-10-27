import type {
  AICreditsResponse,
  AIPromptRequest,
  AIPromptResponse,
  BoardAnalyticsRead,
  BoardAutomationCreate,
  BoardAutomationRead,
  BoardAutomationUpdate,
  BoardCreate,
  BoardDetailRead,
  BoardStatusCreate,
  BoardStatusRead,
  BoardStatusUpdate,
  BoardUpdate,
  CheckoutSessionResponse,
  DeleteBoardStatusResponse,
  MyWorkResponse,
  OAuthAuthorizeResponse,
  OAuthCallbackRequest,
  OAuthProviderConfig,
  PricingPlanRead,
  SubscriptionRead,
  TaskChecklistCreate,
  TaskChecklistItemRead,
  TaskChecklistUpdate,
  TaskCommentCreate,
  TaskCommentRead,
  TaskGroupCreate,
  TaskGroupRead,
  TaskGroupUpdate,
  TaskItemCreate,
  TaskItemDetailRead,
  TaskItemRead,
  TaskItemUpdate,
  TokenResponse,
  UserRead,
  WorkspaceCreate,
  WorkspaceRead,
  WorkspaceUpdate,
} from '../types';

export const ACCESS_TOKEN_KEY = 'gestor_access_token';

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAccessToken(token: string): void {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } catch {
    // Ignorar errores de almacenamiento en entornos restringidos
  }
}

export function clearAccessToken(): void {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    // Ignorar errores de almacenamiento
  }
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function extractFastApiDetail(payload: unknown, fallbackMessage: string): string {
  if (payload && typeof payload === 'object' && 'detail' in payload) {
    const detail = (payload as { detail: unknown }).detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0];
      if (first && typeof first === 'object' && 'msg' in first) {
        return String((first as { msg: unknown }).msg);
      }
    }
  }
  return fallbackMessage;
}

export function resolveApiUrl(endpoint: string): string {
  try {
    const envBase = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) || '';
    const cleanBase = String(envBase).trim().replace(/\/$/, '');
    if (!cleanBase) {
      return endpoint;
    }
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${cleanBase}${cleanEndpoint}`;
  } catch {
    return endpoint;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = resolveApiUrl(endpoint);
  const response = await fetch(url, {
    ...options,
    headers,
  });


  let data: unknown = null;
  const contentType = response.headers?.get?.('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok || (contentType && !contentType.includes('application/json') && response.status !== 204)) {
    const errorMessage = extractFastApiDetail(
      data,
      `Error HTTP ${response.status} al consultar ${endpoint}`,
    );
    throw new ApiError(errorMessage, response.status);
  }

  return data as T;
}

export const api = {
  // Autenticación OAuth2 / OIDC y Usuarios
  getAuthProviders(): Promise<OAuthProviderConfig[]> {
    return request<OAuthProviderConfig[]>('/api/auth/providers');
  },

  getOAuthAuthorizeUrl(
    provider: string,
    redirectUri?: string,
  ): Promise<OAuthAuthorizeResponse> {
    const query = redirectUri
      ? `?redirect_uri=${encodeURIComponent(redirectUri)}`
      : '';
    return request<OAuthAuthorizeResponse>(
      `/api/auth/oauth/${encodeURIComponent(provider)}/authorize${query}`,
    );
  },

  exchangeOAuthCallback(
    provider: string,
    payload: OAuthCallbackRequest,
  ): Promise<TokenResponse> {
    return request<TokenResponse>(
      `/api/auth/oauth/${encodeURIComponent(provider)}/callback`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },

  getMe(): Promise<UserRead> {
    return request<UserRead>('/api/auth/me');
  },

  getUsers(): Promise<UserRead[]> {
    return request<UserRead[]>('/api/users');
  },

  // Espacios de Trabajo (Workspaces)
  getWorkspaces(): Promise<WorkspaceRead[]> {
    return request<WorkspaceRead[]>('/api/workspaces');
  },

  createWorkspace(payload: WorkspaceCreate): Promise<WorkspaceRead> {
    return request<WorkspaceRead>('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateWorkspace(
    workspaceId: number,
    payload: WorkspaceUpdate,
  ): Promise<WorkspaceRead> {
    return request<WorkspaceRead>(`/api/workspaces/${workspaceId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deleteWorkspace(
    workspaceId: number,
  ): Promise<{ deleted: boolean; id: number }> {
    return request<{ deleted: boolean; id: number }>(
      `/api/workspaces/${workspaceId}`,
      {
        method: 'DELETE',
      },
    );
  },

  // Tableros (Boards)
  getBoardDetail(boardId: number): Promise<BoardDetailRead> {
    return request<BoardDetailRead>(`/api/boards/${boardId}`);
  },

  createBoard(payload: BoardCreate): Promise<BoardDetailRead> {
    return request<BoardDetailRead>('/api/boards', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateBoard(
    boardId: number,
    payload: BoardUpdate,
  ): Promise<BoardDetailRead> {
    return request<BoardDetailRead>(`/api/boards/${boardId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deleteBoard(boardId: number): Promise<{ deleted: boolean; id: number }> {
    return request<{ deleted: boolean; id: number }>(`/api/boards/${boardId}`, {
      method: 'DELETE',
    });
  },

  // Analítica Ejecutiva y Exportación CSV de Tablero (Fase 2)
  getBoardAnalytics(boardId: number): Promise<BoardAnalyticsRead> {
    return request<BoardAnalyticsRead>(`/api/boards/${boardId}/analytics`);
  },

  async exportBoardCsv(boardId: number): Promise<string> {
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      resolveApiUrl(`/api/boards/${boardId}/export.csv`),
      {
        method: 'GET',
        headers,
      },
    );

    if (!response.ok) {
      throw new ApiError(
        `Error HTTP ${response.status} al exportar CSV del tablero`,
        response.status,
      );
    }

    if (typeof response.text === 'function') {
      return response.text();
    }

    const fallback = await response.json();
    return typeof fallback === 'string' ? fallback : JSON.stringify(fallback);
  },

  // Estados Personalizables por Tablero (BoardStatusConfig)
  createBoardStatus(
    boardId: number,
    payload: BoardStatusCreate,
  ): Promise<BoardStatusRead> {
    return request<BoardStatusRead>(`/api/boards/${boardId}/statuses`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateBoardStatus(
    boardId: number,
    statusId: number,
    payload: BoardStatusUpdate,
  ): Promise<BoardStatusRead> {
    return request<BoardStatusRead>(
      `/api/boards/${boardId}/statuses/${statusId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );
  },

  deleteBoardStatus(
    boardId: number,
    statusId: number,
  ): Promise<DeleteBoardStatusResponse> {
    return request<DeleteBoardStatusResponse>(
      `/api/boards/${boardId}/statuses/${statusId}`,
      {
        method: 'DELETE',
      },
    );
  },

  // Grupos de Tareas (TaskGroup)
  createTaskGroup(
    boardId: number,
    payload: TaskGroupCreate,
  ): Promise<TaskGroupRead> {
    return request<TaskGroupRead>(`/api/boards/${boardId}/groups`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateTaskGroup(
    groupId: number,
    payload: TaskGroupUpdate,
  ): Promise<TaskGroupRead> {
    return request<TaskGroupRead>(`/api/groups/${groupId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deleteTaskGroup(groupId: number): Promise<{ deleted: boolean; id: number }> {
    return request<{ deleted: boolean; id: number }>(`/api/groups/${groupId}`, {
      method: 'DELETE',
    });
  },

  // Filas / Tareas (TaskItem)
  createTaskItem(
    groupId: number,
    payload: TaskItemCreate,
  ): Promise<TaskItemRead> {
    return request<TaskItemRead>(`/api/groups/${groupId}/items`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateTaskItem(
    itemId: number,
    payload: TaskItemUpdate,
  ): Promise<TaskItemRead> {
    return request<TaskItemRead>(`/api/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deleteTaskItem(itemId: number): Promise<{ deleted: boolean; id: number }> {
    return request<{ deleted: boolean; id: number }>(`/api/items/${itemId}`, {
      method: 'DELETE',
    });
  },

  duplicateTaskItem(itemId: number): Promise<TaskItemRead> {
    return request<TaskItemRead>(`/api/items/${itemId}/duplicate`, {
      method: 'POST',
    });
  },

  // Colaboración y Detalle por Tarea (ItemDetailDrawer)
  getTaskItemDetail(itemId: number): Promise<TaskItemDetailRead> {
    return request<TaskItemDetailRead>(`/api/items/${itemId}/detail`);
  },

  createTaskComment(
    itemId: number,
    payload: TaskCommentCreate,
  ): Promise<TaskCommentRead> {
    return request<TaskCommentRead>(`/api/items/${itemId}/comments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  deleteTaskComment(
    commentId: number,
  ): Promise<{ deleted: boolean; id: number }> {
    return request<{ deleted: boolean; id: number }>(
      `/api/comments/${commentId}`,
      {
        method: 'DELETE',
      },
    );
  },

  createChecklistItem(
    itemId: number,
    payload: TaskChecklistCreate,
  ): Promise<TaskChecklistItemRead> {
    return request<TaskChecklistItemRead>(`/api/items/${itemId}/checklist`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateChecklistItem(
    checklistId: number,
    payload: TaskChecklistUpdate,
  ): Promise<TaskChecklistItemRead> {
    return request<TaskChecklistItemRead>(`/api/checklist/${checklistId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deleteChecklistItem(
    checklistId: number,
  ): Promise<{ deleted: boolean; id: number }> {
    return request<{ deleted: boolean; id: number }>(
      `/api/checklist/${checklistId}`,
      {
        method: 'DELETE',
      },
    );
  },

  // Mi Trabajo (Fase 3)
  getMyWork(): Promise<MyWorkResponse> {
    return request<MyWorkResponse>('/api/my-work');
  },

  // Automatizaciones de Tablero (Fase 3)
  getBoardAutomations(boardId: number): Promise<BoardAutomationRead[]> {
    return request<BoardAutomationRead[]>(`/api/boards/${boardId}/automations`);
  },

  createBoardAutomation(
    boardId: number,
    payload: BoardAutomationCreate,
  ): Promise<BoardAutomationRead> {
    return request<BoardAutomationRead>(`/api/boards/${boardId}/automations`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateBoardAutomation(
    automationId: number,
    payload: BoardAutomationUpdate,
  ): Promise<BoardAutomationRead> {
    return request<BoardAutomationRead>(`/api/automations/${automationId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deleteBoardAutomation(
    automationId: number,
  ): Promise<{ deleted: boolean; id: number }> {
    return request<{ deleted: boolean; id: number }>(
      `/api/automations/${automationId}`,
      {
        method: 'DELETE',
      },
    );
  },

  // Suscripciones y Facturación (SaaS)
  getBillingPlans(): Promise<PricingPlanRead[]> {
    return request<PricingPlanRead[]>('/api/billing/plans');
  },

  getMySubscription(): Promise<SubscriptionRead> {
    return request<SubscriptionRead>('/api/billing/subscription');
  },

  createCheckoutSession(
    planTier: string,
    billingCycle: 'monthly' | 'yearly',
  ): Promise<CheckoutSessionResponse> {
    return request<CheckoutSessionResponse>('/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({
        plan_tier: planTier,
        billing_cycle: billingCycle,
      }),
    });
  },

  // Asistente IA Sidekick
  askAI(payload: AIPromptRequest): Promise<AIPromptResponse> {
    return request<AIPromptResponse>('/api/ai/ask', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getAICredits(): Promise<AICreditsResponse> {
    return request<AICreditsResponse>('/api/ai/credits');
  },
};
