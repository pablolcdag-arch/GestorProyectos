export type AuthProvider = 'google' | 'microsoft';

export interface UserRead {
  id: number;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  color: string;
  auth_provider: string;
  provider_subject_id: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface DevAccountInfo {
  code: string;
  email: string;
  full_name: string;
  role: string;
  color: string;
  provider: string;
}

export interface OAuthProviderConfig {
  provider: string;
  enabled: boolean;
  mode: 'oauth' | 'dev_simulator' | 'disabled' | string;
  dev_accounts: DevAccountInfo[];
}

export interface OAuthAuthorizeResponse {
  provider: string;
  mode: string;
  authorization_url: string;
  state: string;
}

export interface OAuthCallbackRequest {
  code: string;
  redirect_uri?: string;
  email?: string;
  full_name?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserRead;
}

export interface BoardStatusCreate {
  label: string;
  color?: string;
  key?: string;
  position?: number;
}

export interface BoardStatusUpdate {
  label?: string;
  color?: string;
  position?: number;
}

export interface BoardStatusRead {
  id: number;
  board_id: number;
  key: string;
  label: string;
  color: string;
  position: number;
}

export interface DeleteBoardStatusResponse {
  deleted: boolean;
  id: number;
  reassigned_to_key: string;
  reassigned_items_count: number;
}

export interface TaskItemRead {
  id: number;
  group_id: number;
  board_id: number;
  title: string;
  status_key: string;
  priority: string;
  assignee_id?: number | null;
  assignee?: UserRead | null;
  due_date?: string | null;
  notes: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface TaskGroupRead {
  id: number;
  board_id: number;
  title: string;
  color: string;
  position: number;
  collapsed: boolean;
  items: TaskItemRead[];
}

export interface BoardSummaryRead {
  id: number;
  workspace_id: number;
  name: string;
  description: string;
  created_at: string;
}

export interface BoardCreate {
  workspace_id: number;
  name: string;
  description?: string;
}

export interface BoardUpdate {
  name?: string;
  description?: string;
}

export interface BoardDetailRead {
  id: number;
  workspace_id: number;
  name: string;
  description: string;
  created_at: string;
  statuses: BoardStatusRead[];
  groups: TaskGroupRead[];
}

export interface WorkspaceCreate {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface WorkspaceUpdate {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface WorkspaceRead {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  owner_id?: number | null;
  created_at: string;
  boards: BoardSummaryRead[];
}

export interface PriorityMeta {
  key: string;
  label: string;
  bgColor: string;
  textColor: string;
}

export const PRIORITY_MAP: Record<string, PriorityMeta> = {
  critical: {
    key: 'critical',
    label: 'Crítica',
    bgColor: '#333333',
    textColor: '#ffffff',
  },
  high: {
    key: 'high',
    label: 'Alta',
    bgColor: '#401694',
    textColor: '#ffffff',
  },
  medium: {
    key: 'medium',
    label: 'Media',
    bgColor: '#5559df',
    textColor: '#ffffff',
  },
  low: {
    key: 'low',
    label: 'Baja',
    bgColor: '#579bfc',
    textColor: '#ffffff',
  },
};

export const MONDAY_COLOR_PALETTE: string[] = [
  '#00c875', // Verde (Listo)
  '#fdab3d', // Naranja (En Proceso)
  '#e2445c', // Rojo (Bloqueado)
  '#a25ddc', // Violeta (Traspasado)
  '#c4c4c4', // Gris (Sin Empezar)
  '#0073ea', // Azul Monday
  '#579bfc', // Azul Claro
  '#ff158a', // Rosa Intenso
  '#cab641', // Amarillo Mostaza
  '#037f4c', // Verde Oscuro
  '#784bd1', // Púrpura
  '#66ccff', // Celeste
];

