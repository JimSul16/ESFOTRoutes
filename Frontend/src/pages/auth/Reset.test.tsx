import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { resetPassword } from '../../api/auth.api';
import Reset from './Reset';

vi.mock('../../api/auth.api', () => ({
  resetPassword: vi.fn(),
}));

const mockReset = vi.mocked(resetPassword);

const input = (name: string): HTMLInputElement => {
  const el = document.querySelector<HTMLInputElement>(`input[name="${name}"]`);
  if (!el) throw new Error(`No se encontró el input "${name}"`);
  return el;
};

const fill = (name: string, value: string) => {
  fireEvent.change(input(name), { target: { value } });
};

const renderReset = (token = 'tok-reset') =>
  render(
    <MemoryRouter initialEntries={[`/reset-password/${token}`]}>
      <ToastContainer />
      <Routes>
        <Route path="/reset-password/:token" element={<Reset />} />
        <Route path="/login" element={<div>pantalla de login</div>} />
      </Routes>
    </MemoryRouter>
  );

const fillBoth = () => {
  fill('newPassword', 'NuevaClave123');
  fill('confirmPassword', 'NuevaClave123');
};

const submit = () => screen.getByRole('button', { name: /actualizar|restablecer/i }).click();

describe('Reset — feedback al usuario', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('actualiza la contraseña y confirma con el mensaje del backend', async () => {
    mockReset.mockResolvedValueOnce({ message: 'Contraseña actualizada con éxito' });

    renderReset();
    fillBoth();
    submit();

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledWith('tok-reset', { newPassword: 'NuevaClave123' });
    });
    await waitFor(() => {
      expect(screen.getByText('Contraseña actualizada con éxito')).toBeTruthy();
    });
  });

  it('redirige a /login tras 2.5 segundos', async () => {
    vi.useFakeTimers();
    mockReset.mockResolvedValueOnce({ message: 'Contraseña actualizada con éxito' });

    renderReset();
    fillBoth();

    // `act` async vacía la cola de microtask para que el `await` de la API
    // resuelva y se programe el `setTimeout`. No se usa `waitFor` porque con
    // fake timers se queda esperando un reloj que no avanza solo.
    await act(async () => {
      submit();
    });

    expect(mockReset).toHaveBeenCalled();
    expect(screen.queryByText('pantalla de login')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(screen.getByText('pantalla de login')).toBeTruthy();
  });

  // Regresión: sin token la página hacía PATCH a `/auth/reset-password/undefined`
  // y el error se perdía en `console.error`.
  it('avisa y NO llama al backend si falta el token', async () => {
    render(
      <MemoryRouter initialEntries={['/reset-password']}>
        <ToastContainer />
        <Routes>
          <Route path="/reset-password" element={<Reset />} />
        </Routes>
      </MemoryRouter>
    );

    fillBoth();
    submit();

    await waitFor(() => {
      expect(screen.getByText('El enlace de recuperación es inválido. Solicita uno nuevo.')).toBeTruthy();
    });
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('muestra el error que devuelve el backend', async () => {
    mockReset.mockRejectedValueOnce({
      response: { status: 400, data: { message: 'El token es inválido o ha expirado' } },
    });

    renderReset();
    fillBoth();
    submit();

    await waitFor(() => {
      expect(screen.getByText('El token es inválido o ha expirado')).toBeTruthy();
    });
    expect(screen.queryByText('pantalla de login')).toBeNull();
  });

  it('no llama al backend si las contraseñas no coinciden', async () => {
    renderReset();
    fill('newPassword', 'NuevaClave123');
    fill('confirmPassword', 'OtraClave999');
    submit();

    await waitFor(() => {
      expect(screen.getByText('Las contraseñas no coinciden')).toBeTruthy();
    });
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('exige mínimo 8 caracteres', async () => {
    renderReset();
    fill('newPassword', 'corta');
    fill('confirmPassword', 'corta');
    submit();

    await waitFor(() => {
      expect(screen.getByText('La contraseña debe tener mínimo 8 caracteres')).toBeTruthy();
    });
    expect(mockReset).not.toHaveBeenCalled();
  });
});