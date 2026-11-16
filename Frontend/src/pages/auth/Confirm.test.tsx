import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { verifyAccount } from '../../api/auth.api';
import Confirm from './Confirm';

vi.mock('../../api/auth.api', () => ({
  verifyAccount: vi.fn(),
}));

const mockVerify = vi.mocked(verifyAccount);

// <StrictMode> monta los efectos dos veces en desarrollo: la verificación
// automática no debe duplicar la petición.
const StrictModeWrap = ({ children }: { children: ReactNode }) => (
  <StrictMode>{children}</StrictMode>
);

const renderConfirm = (token = 'tok-confirm', { strict = false } = {}) => {
  const ui = (
    <MemoryRouter initialEntries={[`/confirm/${token}`]}>
      <ToastContainer />
      <Routes>
        <Route path="/confirm/:token" element={<Confirm />} />
        <Route path="/login" element={<div>pantalla de login</div>} />
      </Routes>
    </MemoryRouter>
  );
  return render(strict ? <StrictModeWrap>{ui}</StrictModeWrap> : ui);
};

/** Texto visible en el contenedor global de toasts de react-toastify. */
const toastText = (): string =>
  document.querySelector('.Toastify__toast-container')?.textContent ?? '';

describe('Confirm — verifica al abrir el link del correo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('activa la cuenta automáticamente sin pedir clic y no emite toast', async () => {
    mockVerify.mockResolvedValue({ message: 'Cuenta verificada con éxito' });

    renderConfirm();

    await waitFor(() => {
      expect(screen.getByText('¡Todo listo!')).toBeTruthy();
    });
    expect(mockVerify).toHaveBeenCalledTimes(1);
    expect(mockVerify).toHaveBeenCalledWith('tok-confirm');
    expect(toastText()).not.toContain('Cuenta verificada con éxito');
  });

  it('hace UNA sola petición aunque StrictMode monte el efecto dos veces', async () => {
    mockVerify.mockResolvedValue({ message: 'Cuenta verificada con éxito' });

    renderConfirm('tok-strict', { strict: true });

    await waitFor(() => {
      expect(screen.getByText('¡Todo listo!')).toBeTruthy();
    });
    expect(mockVerify).toHaveBeenCalledTimes(1);
  });

  it('muestra el mensaje del backend y ofrece reintentar cuando el enlace falla', async () => {
    mockVerify
      .mockRejectedValueOnce({
        response: { status: 400, data: { message: 'El token es inválido o ha expirado' } },
      })
      .mockResolvedValueOnce({ message: 'Cuenta verificada con éxito' });

    renderConfirm();

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'El token es inválido o ha expirado'
      );
    });
    expect(toastText()).not.toContain('El token es inválido o ha expirado');

    await act(async () => {
      screen.getByRole('button', { name: /reintentar verificación/i }).click();
    });

    await waitFor(() => {
      expect(screen.getByText('¡Todo listo!')).toBeTruthy();
    });
    expect(mockVerify).toHaveBeenCalledTimes(2);
  });

  it('muestra un error claro si el enlace no trae token', async () => {
    // `/confirm/` (sin segmento de token): la ruta lo declara como opcional
    // para poder probar el caso en el que el parámetro no llega.
    render(
      <MemoryRouter initialEntries={['/confirm/']}>
        <ToastContainer />
        <Routes>
          <Route path="/confirm/:token?" element={<Confirm />} />
          <Route path="/login" element={<div>pantalla de login</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'El enlace de verificación no es válido.'
      );
    });
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it('redirige a /login tras 2.5 segundos', async () => {
    vi.useFakeTimers();
    mockVerify.mockResolvedValue({ message: 'Cuenta verificada con éxito' });

    renderConfirm();

    // `act` async vacía la cola de microtask para que el `await` de la API
    // resuelva y se programe el `setTimeout`. Con fake timers `waitFor` se
    // queda esperando un reloj que no avanza solo.
    await act(async () => {});

    expect(mockVerify).toHaveBeenCalled();
    expect(screen.queryByText('pantalla de login')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(screen.getByText('pantalla de login')).toBeTruthy();
  });
});
