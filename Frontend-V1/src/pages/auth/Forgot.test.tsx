import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { forgotPassword } from '../../api/auth.api';
import Forgot from './Forgot';

// El mock replica la forma real del módulo (exports nombrados).
vi.mock('../../api/auth.api', () => ({
  forgotPassword: vi.fn(),
}));

const mockForgot = vi.mocked(forgotPassword);

const input = (name: string): HTMLInputElement => {
  const el = document.querySelector<HTMLInputElement>(`input[name="${name}"]`);
  if (!el) throw new Error(`No se encontró el input "${name}"`);
  return el;
};

const fill = (name: string, value: string) => {
  fireEvent.change(input(name), { target: { value } });
};

const renderForgot = () =>
  render(
    <MemoryRouter initialEntries={['/forgot']}>
      <ToastContainer />
      <Routes>
        <Route path="/forgot" element={<Forgot />} />
        <Route path="/login" element={<div>pantalla de login</div>} />
      </Routes>
    </MemoryRouter>
  );

const submit = () => screen.getByRole('button', { name: /recuperar acceso/i }).click();

describe('Forgot — feedback al usuario', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Regresión: antes el éxito era totalmente silencioso y el error solo iba a
  // `console.error`. El usuario no tenía ninguna señal de qué había pasado.
  it('confirma el envío con el mensaje del backend', async () => {
    mockForgot.mockResolvedValueOnce({
      message: 'Si el correo está registrado, recibirás un enlace de recuperación.',
    });

    renderForgot();
    fill('email', 'ana@epn.edu.ec');
    submit();

    await waitFor(() => {
      expect(
        screen.getByText('Si el correo está registrado, recibirás un enlace de recuperación.')
      ).toBeTruthy();
    });
  });

  it('envía solo el email al backend', async () => {
    mockForgot.mockResolvedValueOnce({ message: 'ok' });

    renderForgot();
    fill('email', 'ana@epn.edu.ec');
    submit();

    await waitFor(() => {
      expect(mockForgot).toHaveBeenCalledWith({ email: 'ana@epn.edu.ec' });
    });
  });

  it('muestra el error que devuelve el backend', async () => {
    mockForgot.mockRejectedValueOnce({
      response: { status: 500, data: { error: 'Error interno del servidor.' } },
    });

    renderForgot();
    fill('email', 'ana@epn.edu.ec');
    submit();

    await waitFor(() => {
      expect(screen.getByText('Error interno del servidor.')).toBeTruthy();
    });
  });

  it('usa el campo `message` cuando el backend responde con ese campo', async () => {
    mockForgot.mockRejectedValueOnce({
      response: { status: 429, data: { message: 'Demasiados intentos.' } },
    });

    renderForgot();
    fill('email', 'ana@epn.edu.ec');
    submit();

    await waitFor(() => {
      expect(screen.getByText('Demasiados intentos.')).toBeTruthy();
    });
  });

  it('no llama al backend si el email no valida', async () => {
    renderForgot();
    fill('email', 'no-es-un-correo');

    // Se dispara `submit` directamente en vez de hacer click: el input es
    // `type="email"`, y el navegador bloquea el envío nativo cuando el valor
    // no es un correo válido (validity.typeMismatch), de modo que RHF nunca
    // llegaría a validarlo. En un navegador real el usuario ve el aviso nativo.
    const form = input('email').form;
    if (!form) throw new Error('El input de email no pertenece a un formulario');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Correo electrónico inválido')).toBeTruthy();
    });
    expect(mockForgot).not.toHaveBeenCalled();
  });
});