import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { verifyAccount } from '../../api/auth.api';
import Confirm from './Confirm';

vi.mock('../../api/auth.api', () => ({
  verifyAccount: vi.fn(),
}));

const mockVerifyAccount = vi.mocked(verifyAccount);

const renderConfirm = (token = 'tok-123') =>
  render(
    <MemoryRouter initialEntries={[`/confirm/${token}`]}>
      <ToastContainer />
      <Routes>
        <Route path="/confirm/:token" element={<Confirm />} />
        <Route path="/login" element={<div>pantalla de login</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('Confirm — verificación y redirección', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('verifica automáticamente la cuenta al cargar la página con el token', async () => {
    mockVerifyAccount.mockResolvedValueOnce({ message: 'Cuenta verificada correctamente' });

    renderConfirm('tok-valid');

    await waitFor(() => {
      expect(mockVerifyAccount).toHaveBeenCalledWith('tok-valid');
    });

    await waitFor(() => {
      expect(screen.getByText('¡Todo listo!')).toBeTruthy();
      expect(screen.getByText('Tu cuenta ha sido verificada correctamente.')).toBeTruthy();
      expect(screen.getByText('Ir al Inicio de Sesión ahora')).toBeTruthy();
    });
  });

  it('redirige a /login tras 2.5 segundos cuando la verificación es exitosa', async () => {
    vi.useFakeTimers();
    mockVerifyAccount.mockResolvedValueOnce({ message: 'Cuenta verificada correctamente' });

    await act(async () => {
      renderConfirm('tok-redirect');
    });

    expect(mockVerifyAccount).toHaveBeenCalledWith('tok-redirect');
    expect(screen.queryByText('pantalla de login')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(screen.getByText('pantalla de login')).toBeTruthy();
  });

  it('muestra estado de error si el token es inválido o expiró', async () => {
    mockVerifyAccount.mockRejectedValueOnce({
      response: { status: 400, data: { message: 'Token inválido' } },
    });

    renderConfirm('tok-invalid');

    await waitFor(() => {
      expect(screen.getByText('Enlace inválido')).toBeTruthy();
      expect(screen.getByText('Ir al Inicio de Sesión')).toBeTruthy();
    });
  });
});
