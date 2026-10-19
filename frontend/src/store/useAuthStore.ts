import { create } from 'zustand';
import {
  api,
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from '../services/api';
import type {
  OAuthAuthorizeResponse,
  OAuthCallbackRequest,
  OAuthProviderConfig,
  UserRead,
} from '../types';

interface AuthState {
  user: UserRead | null;
  token: string | null;
  providers: OAuthProviderConfig[];
  teamUsers: UserRead[];
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;
  loadProviders: () => Promise<OAuthProviderConfig[]>;
  restoreSession: () => Promise<void>;
  startOAuthAuthorize: (
    provider: string,
    redirectUri?: string,
  ) => Promise<OAuthAuthorizeResponse>;
  loginWithCallback: (
    provider: string,
    payload: OAuthCallbackRequest,
  ) => Promise<UserRead>;
  loadTeamUsers: () => Promise<void>;
  logout: () => void;
  clearError: () => void;
  resetStore: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: getAccessToken(),
  providers: [],
  teamUsers: [],
  isLoading: false,
  isInitializing: true,
  error: null,

  loadProviders: async () => {
    try {
      const providers = await api.getAuthProviders();
      set({ providers });
      return providers;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar los proveedores de autenticación.';
      set({ error: message });
      return [];
    }
  },

  restoreSession: async () => {
    const existingToken = getAccessToken();
    set({ isInitializing: true, error: null });

    await get().loadProviders();

    if (!existingToken) {
      set({ user: null, token: null, isInitializing: false });
      return;
    }

    try {
      const user = await api.getMe();
      set({ user, token: existingToken, isInitializing: false });
      void get().loadTeamUsers();
    } catch {
      clearAccessToken();
      set({ user: null, token: null, isInitializing: false });
    }
  },

  startOAuthAuthorize: async (provider: string, redirectUri?: string) => {
    set({ error: null });
    try {
      const res = await api.getOAuthAuthorizeUrl(provider, redirectUri);
      return res;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo iniciar la autorización OAuth.';
      set({ error: message });
      throw err;
    }
  },

  loginWithCallback: async (
    provider: string,
    payload: OAuthCallbackRequest,
  ) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.exchangeOAuthCallback(provider, payload);
      setAccessToken(res.access_token);
      set({
        token: res.access_token,
        user: res.user,
        isLoading: false,
        isInitializing: false,
        error: null,
      });
      void get().loadTeamUsers();
      return res.user;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Error al autenticar con el proveedor.';
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  loadTeamUsers: async () => {
    try {
      const users = await api.getUsers();
      set({ teamUsers: users });
    } catch {
      // No bloquear la interfaz si la lista de usuarios falla
    }
  },

  logout: () => {
    clearAccessToken();
    set({
      user: null,
      token: null,
      teamUsers: [],
      error: null,
      isLoading: false,
    });
  },

  clearError: () => set({ error: null }),

  resetStore: () => {
    clearAccessToken();
    set({
      user: null,
      token: null,
      providers: [],
      teamUsers: [],
      isLoading: false,
      isInitializing: false,
      error: null,
    });
  },
}));
