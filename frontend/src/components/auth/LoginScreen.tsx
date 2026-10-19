import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  LayoutGrid,
  Lock,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import type {
  AuthProvider,
  DevAccountInfo,
  OAuthProviderConfig,
} from '../../types';

const DEFAULT_DEV_ACCOUNTS: Record<AuthProvider, DevAccountInfo[]> = {
  google: [
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
  ],
  microsoft: [
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
  ],
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const GoogleLogoSvg: React.FC<{ className?: string }> = ({
  className = 'w-5 h-5',
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
    />
  </svg>
);

export const MicrosoftLogoSvg: React.FC<{ className?: string }> = ({
  className = 'w-5 h-5',
}) => (
  <svg
    className={className}
    viewBox="0 0 23 23"
    aria-hidden="true"
    focusable="false"
  >
    <path fill="#f35325" d="M1 1h10v10H1z" />
    <path fill="#81bc06" d="M12 1h10v10H12z" />
    <path fill="#05a6f0" d="M1 12h10v10H1z" />
    <path fill="#ffba08" d="M12 12h10v10H12z" />
  </svg>
);

export const LoginScreen: React.FC = () => {
  const {
    providers,
    isLoading,
    error,
    loadProviders,
    startOAuthAuthorize,
    loginWithCallback,
    clearError,
  } = useAuthStore();

  const [selectedProvider, setSelectedProvider] =
    useState<AuthProvider | null>(null);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    void loadProviders();
  }, [loadProviders]);

  // Procesar callback automático si la URL trae ?code=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const urlProvider =
      params.get('provider') ||
      sessionStorage.getItem('gestor_oauth_provider') ||
      'google';

    if (code) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      void loginWithCallback(urlProvider, {
        code,
        redirect_uri: window.location.origin + window.location.pathname,
      });
    }
  }, [loginWithCallback]);

  const getProviderConfig = (
    provider: AuthProvider,
  ): OAuthProviderConfig | undefined =>
    providers.find((p) => p.provider.toLowerCase() === provider);

  const handleProviderClick = async (provider: AuthProvider) => {
    clearError();
    setLocalError(null);

    const cfg = getProviderConfig(provider);
    const isDevMode = !cfg || cfg.mode === 'dev_simulator';

    if (isDevMode) {
      setSelectedProvider(provider);
      void startOAuthAuthorize(
        provider,
        window.location.origin + window.location.pathname,
      ).catch(() => {
        clearError();
      });
      return;
    }

    if (!cfg.enabled || cfg.mode === 'disabled') {
      setLocalError(
        `El proveedor ${provider === 'google' ? 'Google' : 'Microsoft'} no está habilitado en este entorno.`,
      );
      return;
    }

    try {
      sessionStorage.setItem('gestor_oauth_provider', provider);
      const res = await startOAuthAuthorize(
        provider,
        window.location.origin + window.location.pathname,
      );
      if (res.mode === 'dev_simulator') {
        setSelectedProvider(provider);
      } else if (res.authorization_url) {
        window.location.assign(res.authorization_url);
      }
    } catch {
      // Error ya manejado en el store
    }
  };

  const handleDevAccountLogin = async (account: DevAccountInfo) => {
    clearError();
    setLocalError(null);
    await loginWithCallback(account.provider, {
      code: account.code,
      email: account.email,
      full_name: account.full_name,
    });
  };

  const handleCustomDevSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) return;

    const trimmedEmail = customEmail.trim().toLowerCase();
    const trimmedName = customName.trim();

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setLocalError('Ingresá un correo electrónico válido (ej: usuario@empresa.com).');
      return;
    }

    clearError();
    setLocalError(null);

    const slug = trimmedEmail.split('@')[0].replace(/[^a-z0-9]/g, '_') || 'user';
    await loginWithCallback(selectedProvider, {
      code: `dev_${selectedProvider}_${slug}`,
      email: trimmedEmail,
      full_name: trimmedName || undefined,
    });
  };

  const activeProviderConfig = selectedProvider
    ? getProviderConfig(selectedProvider)
    : undefined;

  const activeDevAccounts: DevAccountInfo[] = selectedProvider
    ? activeProviderConfig?.dev_accounts &&
      activeProviderConfig.dev_accounts.length > 0
      ? activeProviderConfig.dev_accounts
      : DEFAULT_DEV_ACCOUNTS[selectedProvider]
    : [];

  const googleConfig = getProviderConfig('google');
  const microsoftConfig = getProviderConfig('microsoft');
  const isDevEnvironment =
    !providers.length ||
    providers.some((p) => p.mode === 'dev_simulator');

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f6f8] via-[#eef2ff] to-[#e6f4ff] flex flex-col justify-center items-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Cabecera corporativa estilo Monday Work OS */}
        <div className="px-8 pt-8 pb-6 text-center border-b border-gray-100">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0073ea] text-white shadow-md shadow-[#0073ea]/25 mb-4">
            <LayoutGrid className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-[#323338] tracking-tight">
            Gestor de Proyectos
          </h1>
          <p className="text-sm text-[#676879] mt-1.5">
            Iniciá sesión en tu espacio de trabajo colaborativo Work OS
          </p>

          {isDevEnvironment && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Simulador OAuth2 Activo (Modo Desarrollo)</span>
            </div>
          )}
        </div>

        <div className="p-8 space-y-5">
          {(error || localError) && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#e2445c]" />
              <span>{localError || error}</span>
            </div>
          )}

          {/* Botones oficiales de SSO */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => void handleProviderClick('google')}
              disabled={isLoading}
              data-testid="btn-login-google"
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                selectedProvider === 'google'
                  ? 'border-[#0073ea] bg-[#f0f7ff] text-[#0073ea] ring-2 ring-[#0073ea]/20'
                  : 'border-gray-300 bg-white text-[#323338] hover:bg-gray-50 hover:border-gray-400'
              } disabled:opacity-60`}
            >
              <span className="flex items-center gap-3">
                <GoogleLogoSvg className="w-5 h-5" />
                <span>Continuar con Google</span>
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-[#676879] font-normal">
                {googleConfig?.mode === 'oauth' ? 'SSO Real' : 'OAuth2'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => void handleProviderClick('microsoft')}
              disabled={isLoading}
              data-testid="btn-login-microsoft"
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                selectedProvider === 'microsoft'
                  ? 'border-[#0073ea] bg-[#f0f7ff] text-[#0073ea] ring-2 ring-[#0073ea]/20'
                  : 'border-gray-300 bg-white text-[#323338] hover:bg-gray-50 hover:border-gray-400'
              } disabled:opacity-60`}
            >
              <span className="flex items-center gap-3">
                <MicrosoftLogoSvg className="w-5 h-5" />
                <span>Continuar con Microsoft</span>
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-[#676879] font-normal">
                {microsoftConfig?.mode === 'oauth' ? 'Entra ID' : 'OAuth2'}
              </span>
            </button>
          </div>

          {/* Panel de selección de cuenta del Simulador de Desarrollo */}
          {selectedProvider && (
            <div
              data-testid={`dev-simulator-panel-${selectedProvider}`}
              className="mt-4 pt-5 border-t border-gray-200 space-y-4 animate-fadeIn"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {selectedProvider === 'google' ? (
                    <GoogleLogoSvg className="w-4 h-4" />
                  ) : (
                    <MicrosoftLogoSvg className="w-4 h-4" />
                  )}
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#676879]">
                    Cuentas de {selectedProvider === 'google' ? 'Google' : 'Microsoft'}{' '}
                    (1 clic)
                  </h2>
                </div>
                <span className="text-[11px] text-[#0073ea] font-medium">
                  dev_simulator
                </span>
              </div>

              <div className="space-y-2">
                {activeDevAccounts.map((acc) => (
                  <button
                    key={acc.code}
                    type="button"
                    disabled={isLoading}
                    onClick={() => void handleDevAccountLogin(acc)}
                    data-testid={`dev-account-${acc.email}`}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:border-[#0073ea] hover:bg-[#f5f9ff] transition-all text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs"
                        style={{ backgroundColor: acc.color }}
                      >
                        {getInitials(acc.full_name)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[#323338] truncate">
                            {acc.full_name}
                          </p>
                          <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-[#676879]">
                            {acc.role}
                          </span>
                        </div>
                        <p className="text-xs text-[#676879] truncate">
                          {acc.email}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#0073ea] group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                ))}
              </div>

              {/* Formulario para simular cuenta personalizada del proveedor */}
              <form
                onSubmit={(e) => void handleCustomDevSubmit(e)}
                className="pt-3 border-t border-gray-100 space-y-2.5"
              >
                <p className="text-xs font-medium text-[#676879] flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>
                    O ingresar con otra cuenta de{' '}
                    {selectedProvider === 'google' ? 'Google' : 'Microsoft'}:
                  </span>
                </p>
                <div className="grid grid-cols-1 gap-2">
                  <input
                    type="email"
                    placeholder={`correo@${selectedProvider === 'google' ? 'gmail.com' : 'outlook.com'}`}
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    aria-label="Correo personalizado"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-[#0073ea] focus:ring-2 focus:ring-[#0073ea]/15"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nombre completo (opcional)"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      aria-label="Nombre completo personalizado"
                      className="flex-1 px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:border-[#0073ea] focus:ring-2 focus:ring-[#0073ea]/15"
                    />
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-3.5 py-2 rounded-lg bg-[#0073ea] hover:bg-[#0060b9] text-white text-xs font-semibold transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      Entrar
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Pie informativo de seguridad */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-[#676879]">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#00c875]" />
              <span>Sesión protegida con JWT HS256</span>
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#0073ea]" />
              <span>OAuth 2.0 / OIDC</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
