import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from '../../context/AuthProvider';
import { login as loginRequest } from '../../api/auth.api';
import Login from './Login';
import type { LoginResponse } from '../../types';

/**
 * El backend exige OTP en CADA login: `POST /auth/login` sin `otp` responde
 * 206, y solo con `otp` válido devuelve 200 + token.
 *
 * Regresión del bug: `httpClient` usa `validateStatus` 2xx, así que el 206
 * RESUELVE y nunca llegaba al `catch`. El componente debe discriminarla por
 * `token`; sin esto el login se quedaba colgado, sin pedir el código ni
 * mostrar mensaje alguno.
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
  screen.getByRole('button', { name: /iniciar sesi|verificar c|verificando/i }).click();
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

describe('Login — flujo OTP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('pide el OTP cuando el backend responde 206 y lo reenvía con el código', async () => {
    mockLogin
      // Primer intento: credenciales correctas, falta OTP.
      .mockResolvedValueOnce({ message: 'OTP requerido. Se ha enviado un código a su correo.' })
      // Segundo intento: llega el código.
      .mockResolvedValueOnce({
        message: '¡Inicio de sesión exitoso!',
        token: 'tok-otp-1',
        user: { id: '7', name: 'Ana', email: 'ana@epn.edu.ec', roles: ['STUDENT'] },
      });

    renderLogin();

    fill('email', 'ana@epn.edu.ec');
    fill('password', 'Password123');
    submit();

    // El campo OTP debe aparecer tras el 206.
    await waitFor(() => {
      expect(hayInput('otp')).toBe(true);
    });
    expect(mockLogin).toHaveBeenCalledTimes(1);
    expect(mockLogin.mock.calls[0]?.[0]).not.toHaveProperty('otp');

    // Se envía el código con las mismas credenciales.
    fill('otp', '123456');
    submit();

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledTimes(2);
    });
    expect(mockLogin.mock.calls[1]?.[0]).toMatchObject({
      email: 'ana@epn.edu.ec',
      otp: '123456',
    });

    await waitFor(() => {
      expect(screen.getByText('panel estudiante')).toBeTruthy();
    });
    expect(sessionStorage.getItem('token')).toBe('tok-otp-1');
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

  it('NO guarda sesión cuando el backend responde 206', async () => {
    mockLogin.mockResolvedValueOnce({ message: 'OTP requerido.' });

    renderLogin();
    fill('email', 'ana@epn.edu.ec');
    fill('password', 'Password123');
    submit();

    await waitFor(() => {
      expect(hayInput('otp')).toBe(true);
    });
    // Sigue en /login y no hay token: el 206 no es un login exitoso.
    expect(sessionStorage.getItem('token')).toBeNull();
    expect(screen.queryByText('panel estudiante')).toBeNull();
  });

  it('rechaza un OTP mal formado antes de llamar al backend', async () => {
    mockLogin.mockResolvedValueOnce({ message: 'OTP requerido.' });

    renderLogin();
    fill('email', 'ana@epn.edu.ec');
    fill('password', 'Password123');
    submit();

    await waitFor(() => {
      expect(hayInput('otp')).toBe(true);
    });

    fill('otp', '123');
    submit();

    // Sigue habiendo solo 1 llamada: no se envió el código inválido.
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledTimes(1);
    });
    expect(sessionStorage.getItem('token')).toBeNull();
  });

  it('muestra el error del backend cuando las credenciales son incorrectas', async () => {
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
    // No se pide OTP cuando el fallo es de credenciales.
    expect(hayInput('otp')).toBe(false);
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
  });
});

describe('Login — reenvío de código OTP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  const llegarAlPasoOtp = async () => {
    mockLogin.mockResolvedValueOnce({ message: 'OTP requerido. Se ha enviado un código a su correo.' });
    renderLogin();
    fill('email', 'ana@epn.edu.ec');
    fill('password', 'Password123');
    submit();
    await waitFor(() => {
      expect(hayInput('otp')).toBe(true);
    });
  };

  it('el botón de reenviar solo aparece en el paso de OTP', async () => {
    // 206: el backend pide OTP, así que ahora sí se llega al segundo paso.
    mockLogin.mockResolvedValueOnce({ message: 'OTP requerido. Se ha enviado un código a su correo.' });
    renderLogin();

    // En el primer paso no debe existir.
    expect(screen.queryByRole('button', { name: /reenviar/i })).toBeNull();

    fill('email', 'ana@epn.edu.ec');
    fill('password', 'Password123');
    submit();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reenviar/i })).toBeTruthy();
    });
  });

  it('reenvía el código SIN el campo otp, para que el backend genere uno nuevo', async () => {
    await llegarAlPasoOtp();
    mockLogin.mockResolvedValueOnce({ message: 'OTP requerido. Se ha enviado un código a su correo.' });

    screen.getByRole('button', { name: /reenviar/i }).click();

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledTimes(2);
    });
    // Lo decisivo: sin `otp`, porque si lo enviara el backend intentaría
    // validarlo en vez de generar uno nuevo.
    expect(mockLogin.mock.calls[1]?.[0]).toEqual({
      email: 'ana@epn.edu.ec',
      password: 'Password123',
    });
  });

  it('limpia el campo OTP tras reenviar y avisa al usuario', async () => {
    await llegarAlPasoOtp();
    fill('otp', '999999');
    mockLogin.mockResolvedValueOnce({ message: 'OTP requerido. Se ha enviado un código a su correo.' });

    screen.getByRole('button', { name: /reenviar/i }).click();

    await waitFor(() => {
      expect(screen.getByText('OTP requerido. Se ha enviado un código a su correo.')).toBeTruthy();
    });
    // El campo se limpia para que el usuario escriba el código que acaba de
    // llegar al correo (el backend reenvía el mismo código, no lo invalida).
    await waitFor(() => {
      expect(input('otp').value).toBe('');
    });
  });

  it('propaga el error si el reenvío falla', async () => {
    await llegarAlPasoOtp();
    mockLogin.mockRejectedValueOnce({
      response: { status: 401, data: { message: 'Credenciales incorrectas' } },
    });

    screen.getByRole('button', { name: /reenviar/i }).click();

    await waitFor(() => {
      expect(screen.getByText('Credenciales incorrectas')).toBeTruthy();
    });
    expect(sessionStorage.getItem('token')).toBeNull();
  });
});