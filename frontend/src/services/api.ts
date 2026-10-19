import type {
  BoardCreate,
  BoardDetailRead,
  BoardStatusCreate,
  BoardStatusRead,
  BoardStatusUpdate,
  BoardUpdate,
  DeleteBoardStatusResponse,
  OAuthAuthorizeResponse,
  OAuthCallbackRequest,
  OAuthProviderConfig,
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

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  let data: unknown = null;
  const contentType = response.headers?.get?.('content-type') || '';
  if (contentType.includes('application/json') || response.status !== 204) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
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
};

