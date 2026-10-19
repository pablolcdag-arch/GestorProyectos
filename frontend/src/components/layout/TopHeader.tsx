import React, { useState } from 'react';
import {
  ChevronDown,
  LayoutGrid,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { GoogleLogoSvg, MicrosoftLogoSvg } from '../auth/LoginScreen';
import type { DevAccountInfo } from '../../types';

interface TopHeaderProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

const QUICK_DEV_ACCOUNTS: DevAccountInfo[] = [
  {
    code: 'dev_google_ana',
    email: 'ana@gestor.dev',
    full_name: 'Ana García',
    role: 'admin',
    color: '#0073ea',
    provider: 'google',
  },
  {
    code: 'dev_google_lucia',
    email: 'lucia@gestor.dev',
    full_name: 'Lucía Méndez',
    role: 'member',
    color: '#a25ddc',
    provider: 'google',
  },
  {
    code: 'dev_microsoft_carlos',
    email: 'carlos@gestor.dev',
    full_name: 'Carlos Ruiz',
    role: 'admin',
    color: '#00c875',
    provider: 'microsoft',
  },
  {
    code: 'dev_microsoft_martin',
    email: 'martin@gestor.dev',
    full_name: 'Martín López',
    role: 'member',
    color: '#fdab3d',
    provider: 'microsoft',
  },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  sidebarCollapsed,
  onToggleSidebar,
}) => {
  const { user, providers, loginWithCallback, logout } = useAuthStore();
  const { workspaces, activeWorkspaceId, activeBoard, resetStore } =
    useWorkspaceStore();

  const [switcherOpen, setSwitcherOpen] = useState(false);

  const activeWorkspace = workspaces.find((ws) => ws.id === activeWorkspaceId);

  const allDevAccounts: DevAccountInfo[] = (() => {
    const fromProviders = providers.flatMap((p) => p.dev_accounts || []);
    return fromProviders.length > 0 ? fromProviders : QUICK_DEV_ACCOUNTS;
  })();

  const isDevMode =
    !providers.length ||
    providers.some((p) => p.mode === 'dev_simulator');

  const handleQuickSwitch = async (acc: DevAccountInfo) => {
    setSwitcherOpen(false);
    await loginWithCallback(acc.provider, {
      code: acc.code,
      email: acc.email,
      full_name: acc.full_name,
    });
  };

  const handleLogout = () => {
    resetStore();
    logout();
  };

  const providerLabel =
    user?.auth_provider?.toLowerCase() === 'microsoft'
      ? 'Microsoft'
      : 'Google';

  return (
    <header className="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between shrink-0 z-20">
      {/* Lado izquierdo: Toggle Sidebar + Marca + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={
            sidebarCollapsed
              ? 'Expandir barra lateral'
              : 'Colapsar barra lateral'
          }
          className="p-2 rounded-lg text-[#676879] hover:bg-gray-100 hover:text-[#323338] transition-colors cursor-pointer"
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="w-5 h-5" />
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#0073ea] flex items-center justify-center text-white shadow-xs">
            <LayoutGrid className="w-4 h-4" />
          </div>
          <span className="font-bold text-[#323338] text-sm hidden sm:inline">
            Work OS
          </span>
        </div>

        {activeWorkspace && (
          <div className="hidden md:flex items-center gap-2 text-xs text-[#676879] border-l border-gray-200 pl-3 truncate">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: activeWorkspace.color }}
            />
            <span className="font-medium text-[#323338] truncate">
              {activeWorkspace.name}
            </span>
            {activeBoard && (
              <>
                <span>/</span>
                <span className="text-[#676879] truncate">
                  {activeBoard.name}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Lado derecho: Selector rápido dev + Perfil de usuario + Cerrar sesión */}
      {user && (
        <div className="flex items-center gap-3">
          {/* Selector rápido de usuario en modo dev */}
          {isDevMode && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setSwitcherOpen((prev) => !prev)}
                data-testid="dev-user-switcher-btn"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-xs font-medium text-[#323338] transition-colors cursor-pointer"
                title="Cambiar cuenta rápidamente (Modo Dev)"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#0073ea]" />
                <span className="hidden sm:inline">Cambiar usuario</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#676879]" />
              </button>

              {switcherOpen && (
                <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-3 py-1.5 border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-[#676879]">
                    Cambio rápido (Simulador Dev)
                  </div>
                  {allDevAccounts.map((acc) => {
                    const isCurrent = acc.email === user.email;
                    return (
                      <button
                        key={acc.code}
                        type="button"
                        onClick={() => void handleQuickSwitch(acc)}
                        className={`w-full px-3 py-2 flex items-center justify-between text-left text-xs hover:bg-[#f0f7ff] transition-colors cursor-pointer ${
                          isCurrent ? 'bg-[#f5f9ff] font-semibold' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                            style={{ backgroundColor: acc.color }}
                          >
                            {getInitials(acc.full_name)}
                          </span>
                          <div className="truncate">
                            <p className="text-[#323338] truncate">
                              {acc.full_name}
                            </p>
                            <p className="text-[10px] text-[#676879] truncate">
                              {acc.email}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-[#676879] capitalize shrink-0">
                          {acc.provider}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Perfil del usuario autenticado */}
          <div
            data-testid="authenticated-user-profile"
            className="flex items-center gap-2.5 pl-2 border-l border-gray-200"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0"
              style={{ backgroundColor: user.color || '#0073ea' }}
              title={`${user.full_name} (${user.email})`}
            >
              {getInitials(user.full_name)}
            </div>

            <div className="hidden sm:flex flex-col leading-tight">
              <div className="flex items-center gap-1.5">
                <span
                  data-testid="authenticated-user-name"
                  className="text-xs font-bold text-[#323338]"
                >
                  {user.full_name}
                </span>
                <span
                  data-testid="authenticated-provider-badge"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-100 text-[10px] font-semibold text-[#323338]"
                >
                  {providerLabel === 'Microsoft' ? (
                    <MicrosoftLogoSvg className="w-3 h-3" />
                  ) : (
                    <GoogleLogoSvg className="w-3 h-3" />
                  )}
                  <span>{providerLabel}</span>
                </span>
              </div>
              <span className="text-[11px] text-[#676879]">{user.email}</span>
            </div>
          </div>

          {/* Botón Cerrar sesión */}
          <button
            type="button"
            onClick={handleLogout}
            data-testid="btn-logout"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#676879] hover:text-[#e2445c] hover:bg-red-50 transition-colors cursor-pointer"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Cerrar sesión</span>
          </button>
        </div>
      )}
    </header>
  );
};

