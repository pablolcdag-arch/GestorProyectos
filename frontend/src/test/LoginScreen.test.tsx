import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { ACCESS_TOKEN_KEY } from '../services/api';
import type { OAuthProviderConfig, WorkspaceRead } from '../types';

const MOCK_PROVIDERS: OAuthProviderConfig[] = [
  {
    provider: 'google',
    enabled: true,
    mode: 'dev_simulator',
    dev_accounts: [
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
  },
  {
    provider: 'microsoft',
    enabled: true,
    mode: 'dev_simulator',
    dev_accounts: [
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
  },
];

const MOCK_WORKSPACES: WorkspaceRead[] = [
  {
    id: 1,
    name: 'Espacio Principal',
    description: 'Gestión central',
    icon: 'Briefcase',
    color: '#0073ea',
    owner_id: 1,
    created_at: '2026-10-19T12:00:00Z',
    boards: [],
  },
];

function createJsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => data,
  } as Response;
}

describe('LoginScreen — Autenticación SSO Google y Microsoft (dev_simulator)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renderiza los botones oficiales "Continuar con Google" y "Continuar con Microsoft"', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/api/auth/providers')) {
        return createJsonResponse(MOCK_PROVIDERS);
      }
      return createJsonResponse({});
    });

    render(<App />);

    expect(
      await screen.findByRole('button', { name: /Continuar con Google/i }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: /Continuar con Microsoft/i }),
    ).toBeInTheDocument();
  });

  it('permite iniciar sesión con una cuenta de Google en modo dev_simulator, guarda el JWT y muestra el usuario', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.includes('/api/auth/providers')) {
          return createJsonResponse(MOCK_PROVIDERS);
        }
        if (url.includes('/api/auth/oauth/google/authorize')) {
          return createJsonResponse({
            provider: 'google',
            mode: 'dev_simulator',
            authorization_url:
              'http://localhost:5173?provider=google&mode=dev_simulator',
            state: 'state_google_123',
          });
        }
        if (
          url.includes('/api/auth/oauth/google/callback') &&
          init?.method === 'POST'
        ) {
          return createJsonResponse({
            access_token: 'jwt_google_token_ana_123',
            token_type: 'bearer',
            user: {
              id: 1,
              email: 'ana@gestor.dev',
              full_name: 'Ana García',
              avatar_url: null,
              color: '#0073ea',
              auth_provider: 'google',
              provider_subject_id: 'google:ana@gestor.dev',
              role: 'admin',
              is_active: true,
              created_at: '2026-10-19T12:00:00Z',
            },
          });
        }
        if (url.includes('/api/users')) {
          return createJsonResponse([]);
        }
        if (url.includes('/api/workspaces')) {
          return createJsonResponse(MOCK_WORKSPACES);
        }
        return createJsonResponse({});
      });

    render(<App />);

    const googleBtn = await screen.findByTestId('btn-login-google');
    fireEvent.click(googleBtn);

    const anaAccountBtn = await screen.findByTestId(
      'dev-account-ana@gestor.dev',
    );
    fireEvent.click(anaAccountBtn);

    await waitFor(() => {
      expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe(
        'jwt_google_token_ana_123',
      );
    });

    expect(
      await screen.findByTestId('authenticated-user-name'),
    ).toHaveTextContent('Ana García');
    expect(
      screen.getByTestId('authenticated-provider-badge'),
    ).toHaveTextContent('Google');

    const callbackCall = fetchSpy.mock.calls.find(([url]) =>
      String(url).includes('/api/auth/oauth/google/callback'),
    );
    expect(callbackCall).toBeDefined();
  });

  it('permite iniciar sesión con una cuenta de Microsoft en modo dev_simulator, guarda el JWT y muestra el usuario', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = typeof input === 'string' ? input : input.toString();

        if (url.includes('/api/auth/providers')) {
          return createJsonResponse(MOCK_PROVIDERS);
        }
        if (url.includes('/api/auth/oauth/microsoft/authorize')) {
          return createJsonResponse({
            provider: 'microsoft',
            mode: 'dev_simulator',
            authorization_url:
              'http://localhost:5173?provider=microsoft&mode=dev_simulator',
            state: 'state_ms_456',
          });
        }
        if (
          url.includes('/api/auth/oauth/microsoft/callback') &&
          init?.method === 'POST'
        ) {
          return createJsonResponse({
            access_token: 'jwt_microsoft_token_carlos_456',
            token_type: 'bearer',
            user: {
              id: 2,
              email: 'carlos@gestor.dev',
              full_name: 'Carlos Ruiz',
              avatar_url: null,
              color: '#00c875',
              auth_provider: 'microsoft',
              provider_subject_id: 'microsoft:carlos@gestor.dev',
              role: 'admin',
              is_active: true,
              created_at: '2026-10-19T12:00:00Z',
            },
          });
        }
        if (url.includes('/api/users')) {
          return createJsonResponse([]);
        }
        if (url.includes('/api/workspaces')) {
          return createJsonResponse(MOCK_WORKSPACES);
        }
        return createJsonResponse({});
      });

    render(<App />);

    const microsoftBtn = await screen.findByTestId('btn-login-microsoft');
    fireEvent.click(microsoftBtn);

    const carlosAccountBtn = await screen.findByTestId(
      'dev-account-carlos@gestor.dev',
    );
    fireEvent.click(carlosAccountBtn);

    await waitFor(() => {
      expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe(
        'jwt_microsoft_token_carlos_456',
      );
    });

    expect(
      await screen.findByTestId('authenticated-user-name'),
    ).toHaveTextContent('Carlos Ruiz');
    expect(
      screen.getByTestId('authenticated-provider-badge'),
    ).toHaveTextContent('Microsoft');

    const callbackCall = fetchSpy.mock.calls.find(([url]) =>
      String(url).includes('/api/auth/oauth/microsoft/callback'),
    );
    expect(callbackCall).toBeDefined();
  });

  it('permite simular el alta de un usuario personalizado de Google en modo dev_simulator', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url.includes('/api/auth/providers')) {
        return createJsonResponse(MOCK_PROVIDERS);
      }
      if (url.includes('/api/auth/oauth/google/authorize')) {
        return createJsonResponse({
          provider: 'google',
          mode: 'dev_simulator',
          authorization_url:
            'http://localhost:5173?provider=google&mode=dev_simulator',
          state: 'state_custom',
        });
      }
      if (
        url.includes('/api/auth/oauth/google/callback') &&
        init?.method === 'POST'
      ) {
        const body = JSON.parse(String(init.body));
        return createJsonResponse({
          access_token: 'jwt_custom_google_789',
          token_type: 'bearer',
          user: {
            id: 9,
            email: body.email,
            full_name: body.full_name || 'Sofía Dev',
            avatar_url: null,
            color: '#0073ea',
            auth_provider: 'google',
            provider_subject_id: `google:${body.email}`,
            role: 'member',
            is_active: true,
            created_at: '2026-10-19T12:00:00Z',
          },
        });
      }
      if (url.includes('/api/users')) {
        return createJsonResponse([]);
      }
      if (url.includes('/api/workspaces')) {
        return createJsonResponse(MOCK_WORKSPACES);
      }
      return createJsonResponse({});
    });

    render(<App />);

    fireEvent.click(await screen.findByTestId('btn-login-google'));

    fireEvent.change(screen.getByLabelText('Correo personalizado'), {
      target: { value: 'sofia@gestor.dev' },
    });
    fireEvent.change(screen.getByLabelText('Nombre completo personalizado'), {
      target: { value: 'Sofía Dev' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(
      await screen.findByTestId('authenticated-user-name'),
    ).toHaveTextContent('Sofía Dev');
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe(
      'jwt_custom_google_789',
    );
  });
});

