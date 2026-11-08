import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from '../../context/AuthProvider';
import { login as loginRequest } from '../../api/auth.api';
import Login from './Login';

vi.mock('../../api/auth.api', () => ({
  login: vi.fn(),
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

const submit = () => {
  screen.getByRole('button', { name: /iniciar sesi|iniciando sesi/i }).click();
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

describe('Login — Flujo directo (sin OTP)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('inicia sesión exitosamente y redirige a /dashboard', async () => {
    mockLogin.mockResolvedValueOnce({
      message: '¡Inicio de sesión exitoso!',
      token: 'tok-estudiante-123',
      user: { id: '7', name: 'Ana', email: 'ana@epn.edu.ec', roles: ['STUDENT'] },
    });

    renderLogin();

    fill('email', 'ana@epn.edu.ec');
    fill('password', 'Password123');
    submit();

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledTimes(1);
    });

    expect(mockLogin).toHaveBeenCalledWith({
      email: 'ana@epn.edu.ec',
      password: 'Password123',
    });

    await waitFor(() => {
      expect(screen.getByText('panel estudiante')).toBeTruthy();
    });
    expect(sessionStorage.getItem('token')).toBe('tok-estudiante-123');
  });

  it('envía al panel de admin cuando el usuario tiene rol ADMIN', async () => {
    mockLogin.mockResolvedValueOnce({
      message: '¡Inicio de sesión exitoso!',
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
    expect(sessionStorage.getItem('token')).toBe('tok-admin');
  });

  it('muestra el error del backend cuando las credenciales son incorrectas (401)', async () => {
    mockLogin.mockRejectedValueOnce({
      response: { status: 401, data: { message: 'Credenciales incorrectas' } },
    });

    renderLogin();
    fill('email', 'ana@epn.edu.ec');
    fill('password', 'mala');
    submit();

    await waitFor(() => {
      expect(screen.getByText('Credenciales incorrectas')).toBeTruthy();
    });
    expect(sessionStorage.getItem('token')).toBeNull();
  });

  it('muestra el mensaje de bloqueo permanente (403)', async () => {
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
      expect(
        screen.getByText('Tu cuenta ha sido bloqueada permanentemente por seguridad.')
      ).toBeTruthy();
    });
    expect(sessionStorage.getItem('token')).toBeNull();
  });

  it('no muestra ningún campo de OTP', () => {
    renderLogin();
    expect(document.querySelector('input[name="otp"]')).toBeNull();
  });
});
