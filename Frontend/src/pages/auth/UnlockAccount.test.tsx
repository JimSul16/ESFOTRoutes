import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { unlockAccount } from '../../api/auth.api';
import UnlockAccount from './UnlockAccount';

// Replica la forma real del módulo (exports nombrados).
vi.mock('../../api/auth.api', () => ({ unlockAccount: vi.fn() }));

const mockUnlock = vi.mocked(unlockAccount);

const montar = (token = 'tok-123') =>
  render(
    <MemoryRouter initialEntries={[`/desbloquear-cuenta/${token}`]}>
      <ToastContainer />
      <Routes>
        <Route path="/desbloquear-cuenta/:token" element={<UnlockAccount />} />
        <Route path="/login" element={<div>pantalla de login</div>} />
      </Routes>
    </MemoryRouter>
  );

const boton = () => screen.getByRole('button', { name: /desbloquear mi cuenta|reintentar/i });

describe('UnlockAccount — desbloqueo por token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pide confirmación antes de tocar nada', () => {
    montar();
    expect(boton()).toBeTruthy();
    expect(mockUnlock).not.toHaveBeenCalled();
  });

  it('envía el token de la URL y confirma el desbloqueo', async () => {
    mockUnlock.mockResolvedValue({ ok: true, message: '¡Cuenta desbloqueada!' });
    montar('tok-abc');

    fireEvent.click(boton());

    await waitFor(() => expect(mockUnlock).toHaveBeenCalledWith('tok-abc'));
    await waitFor(() => expect(screen.getByText('¡Cuenta desbloqueada!')).toBeTruthy());
    // En éxito ofrece el enlace a login, pero no navega solo.
    expect(screen.getByRole('link', { name: /ir a iniciar sesión/i })).toBeTruthy();
    expect(screen.queryByText('pantalla de login')).toBeNull();
    expect(screen.queryByRole('button', { name: /reintentar/i })).toBeNull();
  });

  // El backend responde 404 cuando el token caducó o ya se usó.
  it('avisa cuando el enlace ya no es válido', async () => {
    mockUnlock.mockResolvedValue({
      ok: false,
      reason: 'invalid-token',
      message: 'El enlace de desbloqueo no es válido o la cuenta ya fue reactivada.',
    });
    montar();

    fireEvent.click(boton());

    await waitFor(() => {
      expect(
        screen.getByText('El enlace de desbloqueo no es válido o la cuenta ya fue reactivada.')
      ).toBeTruthy();
    });
    // No debe ofrecer el enlace a login si no se desbloqueó.
    expect(screen.queryByText('pantalla de login')).toBeNull();
    expect(boton().textContent).toMatch(/reintentar/i);
  });

  it('distingue un error de servidor de un token inválido', async () => {
    mockUnlock.mockResolvedValue({
      ok: false,
      reason: 'error',
      message: 'No se pudo desbloquear la cuenta.',
    });
    montar();

    fireEvent.click(boton());

    await waitFor(() => {
      expect(screen.getByText('No se pudo desbloquear la cuenta.')).toBeTruthy();
    });
  });

  it('no llama al backend si la ruta no trae token', () => {
    render(
      <MemoryRouter initialEntries={['/desbloquear-cuenta']}>
        <ToastContainer />
        <Routes>
          <Route path="/desbloquear-cuenta" element={<UnlockAccount />} />
        </Routes>
      </MemoryRouter>
    );

    // Sin :token el backend no se puede llamar.
    expect(mockUnlock).not.toHaveBeenCalled();
  });
});