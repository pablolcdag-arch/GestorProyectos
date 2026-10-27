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

export interface TaskGroupCreate {
  title: string;
  color?: string;
  position?: number;
  collapsed?: boolean;
}

export interface TaskGroupUpdate {
  title?: string;
  color?: string;
  position?: number;
  collapsed?: boolean;
}

export interface TaskItemCreate {
  title: string;
  status_key?: string;
  priority?: string;
  assignee_id?: number | null;
  start_date?: string | null;
  due_date?: string | null;
  estimated_hours?: number;
  budget?: number;
  notes?: string;
  position?: number;
}

export interface TaskItemUpdate {
  title?: string;
  group_id?: number;
  status_key?: string;
  priority?: string;
  assignee_id?: number | null;
  start_date?: string | null;
  due_date?: string | null;
  estimated_hours?: number;
  budget?: number;
  notes?: string;
  position?: number;
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
  start_date?: string | null;
  due_date?: string | null;
  estimated_hours?: number;
  budget?: number;
  notes: string;
  position: number;
  comments_count?: number;
  checklist_total?: number;
  checklist_completed?: number;
  created_at: string;
  updated_at: string;
}

export interface TaskCommentCreate {
  content: string;
}

export interface TaskCommentRead {
  id: number;
  item_id: number;
  author_id: number | null;
  author: UserRead | null;
  content: string;
  created_at: string;
}

export interface TaskChecklistCreate {
  title: string;
  is_completed?: boolean;
  position?: number;
}

export interface TaskChecklistUpdate {
  title?: string;
  is_completed?: boolean;
  position?: number;
}

export interface TaskChecklistItemRead {
  id: number;
  item_id: number;
  title: string;
  is_completed: boolean;
  position: number;
  created_at: string;
}

export interface TaskActivityRead {
  id: number;
  item_id: number;
  user_id: number | null;
  user: UserRead | null;
  action: string;
  description: string;
  created_at: string;
}

export interface TaskItemDetailRead extends TaskItemRead {
  comments: TaskCommentRead[];
  checklist_items: TaskChecklistItemRead[];
  activities: TaskActivityRead[];
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

export interface StatusBreakdownItem {
  key: string;
  label: string;
  color: string;
  count: number;
  percentage: number;
}

export interface PriorityBreakdownItem {
  priority: string;
  count: number;
}

export interface AssigneeWorkloadItem {
  user_id: number | null;
  full_name: string;
  color: string;
  total_items: number;
  completed_items: number;
  estimated_hours: number;
  budget: number;
}

export interface GroupMetricsItem {
  group_id: number;
  title: string;
  color: string;
  total_items: number;
  completed_items: number;
  total_estimated_hours: number;
  total_budget: number;
}

export interface BoardAnalyticsRead {
  board_id: number;
  total_items: number;
  completed_items: number;
  completion_rate: number;
  overdue_items: number;
  unassigned_items: number;
  total_estimated_hours: number;
  total_budget: number;
  by_status: StatusBreakdownItem[];
  by_priority: PriorityBreakdownItem[];
  by_assignee: AssigneeWorkloadItem[];
  by_group: GroupMetricsItem[];
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

export interface BoardAutomationRead {
  id: number;
  board_id: number;
  rule_type: string;
  target_status_key: string | null;
  is_active: boolean;
  created_at: string;
}

export interface BoardAutomationCreate {
  rule_type: string;
  target_status_key?: string | null;
  is_active?: boolean;
}

export interface BoardAutomationUpdate {
  is_active?: boolean;
  target_status_key?: string | null;
}

export interface MyWorkItemRead extends TaskItemRead {
  board_name: string;
  workspace_id: number;
  workspace_name: string;
  group_title: string;
  group_color: string;
}

export interface MyWorkSummary {
  total_assigned: number;
  overdue_count: number;
  today_count: number;
  this_week_count: number;
  upcoming_count: number;
  completed_count: number;
}

export interface MyWorkResponse {
  summary: MyWorkSummary;
  overdue: MyWorkItemRead[];
  today: MyWorkItemRead[];
  this_week: MyWorkItemRead[];
  upcoming_or_no_date: MyWorkItemRead[];
  completed: MyWorkItemRead[];
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
  // Fila 1 - Verdes
  '#037f4c', // grass_green
  '#00c875', // done_green
  '#9cd326', // bright_green
  '#cab641', // saladish
  '#50c878', // emerald

  // Fila 2 - Amarillos y Naranjas
  '#ffcb00', // egg_yolk
  '#fdab3d', // in_progress_orange
  '#ff6d3b', // dark_orange
  '#ffadad', // peach
  '#ff7575', // sunset

  // Fila 3 - Rojos y Rosas
  '#e2445c', // stuck_red
  '#bb3354', // dark_red
  '#e50073', // sofia_pink
  '#ff5ac4', // lipstick
  '#faa1f1', // bubble

  // Fila 4 - Fucsias y Violetas
  '#ff158a', // hot_pink
  '#9d50dd', // purple
  '#a25ddc', // handed_over_purple
  '#784bd1', // dark_purple
  '#7e3b8a', // berry

  // Fila 5 - Púrpuras, Índigos y Azul Monday
  '#401694', // dark_indigo
  '#5559df', // indigo
  '#225091', // navy
  '#0073ea', // monday_blue
  '#579bfc', // bright_blue

  // Fila 6 - Azules y Celestes
  '#007eb5', // dark_blue
  '#4eccc6', // aquamarine
  '#66ccff', // chili_blue
  '#68a1bd', // river
  '#a1e3f6', // winter_sky

  // Fila 7 - Turquesa, Menta, Lima y Tierras
  '#20d9d2', // turquoise
  '#80f4cf', // mint
  '#b2e353', // lime
  '#d8c8b8', // sand
  '#bf9d7a', // tan

  // Fila 8 - Café, Neutros y Grises
  '#7f5347', // coffee
  '#c4c4c4', // grey_not_started
  '#808080', // steel_grey
  '#999999', // light_grey
  '#333333', // charcoal
];
