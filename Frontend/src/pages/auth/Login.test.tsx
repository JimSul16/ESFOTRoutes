import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from '../../context/AuthProvider';
import { login as loginRequest } from '../../api/auth.api';
import Login from './Login';
import type { LoginResponse } from '../../types';

/**
 * `httpClient` acepta cualquier status 2xx (`validateStatus`), así que el 206
 * del backend (OTP requerido) RESUELVE y nunca llega al `catch`. El componente
 * discrimina el éxito por la presencia de `token`, no por el status.
 *
 * La pantalla ya no ofrece el paso de OTP: el backend solo lo emite cuando
 * `REQUIRE_2FA === 'true'`, y el sistema no usa 2FA. Si algún entorno lo
 * activa, el aviso se muestra inline en vez de dejar el login colgado.
 */

// El mock replica la forma REAL del módulo (exports nombrados, no un objeto
// `authApi`). Si el mock no coincide con el módulo, el test pasa mientras el
// build falla — que es exactamente lo que pasó la primera vez.
vi.mock('../../api/auth.api', () => ({
  login: vi.fn(),
  isLoginSuccess: (res: LoginResponse) => typeof res?.token === 'string',
}));

const mockLogin = vi.mocked(loginRequest);

const input = (name: string): HTMLInputElement => {
  const el = document.querySelector<HTMLInputElement>(`input[name="${name}"]`);
  if (!el) throw new Error(`No se encontró el input "${name}"`);
  return el;
};

const fill = (name: string, value: string) => {
  fireEvent.change(input(name), { target: { value } });
};

const hayInput = (name: string): boolean =>
  document.querySelector(`input[name="${name}"]`) !== null;

const submit = () => {
  screen.getByRole('button', { name: /iniciar sesi|verificando/i }).click();
};

const renderLogin = () =>
  render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <ToastContainer />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<div>panel estudiante</div>} />
          <Route path="/admin" element={<div>panel admin</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );

const getForm = (): HTMLFormElement => {
  const el = document.querySelector<HTMLFormElement>('form');
  if (!el) throw new Error('No se encontró el formulario de login');
  return el;
};

/** Texto visible en el contenedor global de toasts de react-toastify. */
const toastText = (): string =>
  document.querySelector('.Toastify__toast-container')?.textContent ?? '';

describe('Login — sesión', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('guarda la sesión y lleva al panel de estudiante', async () => {
    mockLogin.mockResolvedValueOnce({
      message: 'ok',
      token: 'tok-1',
      user: { id: '7', name: 'Ana', email: 'ana@epn.edu.ec', roles: ['STUDENT'] },
    });

    renderLogin();
    fill('email', 'ana@epn.edu.ec');
    fill('password', 'Password123');
    submit();

    await waitFor(() => {
      expect(screen.getByText('panel estudiante')).toBeTruthy();
    });
    expect(sessionStorage.getItem('token')).toBe('tok-1');
  });

  it('envía al panel de admin cuando el usuario tiene rol ADMIN', async () => {
    mockLogin.mockResolvedValueOnce({
      message: 'ok',
      token: 'tok-admin',
      user: { id: '1', name: 'Admin', email: 'admin@epn.edu.ec', roles: ['ADMIN'] },
    });

    renderLogin();
    fill('email', 'admin@epn.edu.ec');
    fill('password', 'Password123');
    submit();

    await waitFor(() => {
      expect(screen.getByText('panel admin')).toBeTruthy();
    });
  });

  it('no renderiza el campo OTP: el sistema no usa 2FA', () => {
    renderLogin();
    expect(hayInput('otp')).toBe(false);
    expect(screen.queryByText(/código otp/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /reenviar/i })).toBeNull();
  });

  it('avisa inline y no guarda sesión si el backend responde 206', async () => {
    mockLogin.mockResolvedValueOnce({
      message: 'OTP requerido. Se ha enviado un código a su correo.',
    });

    renderLogin();
    fill('email', 'ana@epn.edu.ec');
    fill('password', 'Password123');
    submit();

    await waitFor(() => {
      expect(within(getForm()).getByRole('alert').textContent).toMatch(
        /verificación en dos pasos/i
      );
    });
    // Sigue en /login y no hay token: el 206 no es un login exitoso.
    expect(sessionStorage.getItem('token')).toBeNull();
    expect(screen.queryByText('panel estudiante')).toBeNull();
    expect(hayInput('otp')).toBe(false);
  });
});

describe('Login — errores inline y persistentes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('muestra el error de credenciales dentro del formulario y no como toast', async () => {
    mockLogin.mockRejectedValueOnce({
      response: { status: 401, data: { message: 'Credenciales incorrectas' } },
    });

    renderLogin();
    fill('email', 'ana@epn.edu.ec');
    fill('password', 'mala');
    submit();

    await waitFor(() => {
      expect(within(getForm()).getByRole('alert').textContent).toContain(
        'Credenciales incorrectas'
      );
    });
    // El aviso de error vive en el formulario; el toast global no lo emite.
    expect(toastText()).not.toContain('Credenciales incorrectas');
    expect(sessionStorage.getItem('token')).toBeNull();
  });

  it('limpia el aviso inline al editar el correo', async () => {
    mockLogin.mockRejectedValueOnce({
      response: { status: 401, data: { message: 'Credenciales incorrectas' } },
    });

    renderLogin();
    fill('email', 'ana@epn.edu.ec');
    fill('password', 'mala');
    submit();

    await waitFor(() => {
      expect(within(getForm()).getByRole('alert')).toBeTruthy();
    });

    fill('email', 'otra@epn.edu.ec');

    await waitFor(() => {
      expect(within(getForm()).queryByRole('alert')).toBeNull();
    });
  });

  it('muestra el bloqueo permanente como alerta inline', async () => {
    mockLogin.mockRejectedValueOnce({
      response: {
        status: 403,
        data: { error: 'Tu cuenta ha sido bloqueada permanentemente por seguridad.', isLocked: true },
      },
    });

    renderLogin();
    fill('email', 'ana@epn.edu.ec');
    fill('password', 'Password123');
    submit();

    await waitFor(() => {
      expect(within(getForm()).getByRole('alert').textContent).toContain(
        'Tu cuenta ha sido bloqueada permanentemente por seguridad.'
      );
    });
    expect(toastText()).not.toContain('Tu cuenta ha sido bloqueada');
  });
});

describe('Login — avisos que traen los redirects del backend en la URL', () => {
  const renderLoginAt = (entry: string) =>
    render(
      <MemoryRouter initialEntries={[entry]}>
        <AuthProvider>
          <ToastContainer />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<div>panel estudiante</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

  it('muestra el aviso de cuenta verificada con /login?verified=true', async () => {
    renderLoginAt('/login?verified=true');

    await waitFor(() => {
      expect(screen.getByText(/Cuenta verificada correctamente/)).toBeTruthy();
    });
    expect(toastText()).toBe('');
  });

  it('muestra el error del enlace con /login?error=invalid_token', async () => {
    renderLoginAt('/login?error=invalid_token');

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'El enlace de verificación no es válido o ya fue utilizado.'
      );
    });
  });
});
