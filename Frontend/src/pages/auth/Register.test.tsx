import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { register as registerAccount } from '../../api/auth.api';
import Register from './Register';

vi.mock('../../api/auth.api', () => ({
  register: vi.fn(),
}));

const mockRegister = vi.mocked(registerAccount);

const input = (name: string): HTMLInputElement => {
  const el = document.querySelector<HTMLInputElement>(`input[name="${name}"]`);
  if (!el) throw new Error(`No se encontró el input "${name}"`);
  return el;
};

const select = (name: string): HTMLSelectElement => {
  const el = document.querySelector<HTMLSelectElement>(`select[name="${name}"]`);
  if (!el) throw new Error(`No se encontró el select "${name}"`);
  return el;
};

const fill = (name: string, value: string) => {
  fireEvent.change(input(name), { target: { value } });
};

const fillSelect = (name: string, value: string) => {
  fireEvent.change(select(name), { target: { value } });
};

const fillAll = () => {
  fill('firstName', 'Ana');
  fill('lastName', 'Pérez');
  fill('email', 'ana@epn.edu.ec');
  fill('uniqueId', '123456789');
  fillSelect('career', 'Desarrollo de Software');
  fillSelect('semester', '3');
  fill('password', 'Password123');
};

const renderRegister = () =>
  render(
    <MemoryRouter initialEntries={['/register']}>
      <ToastContainer />
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<div>pantalla de login</div>} />
      </Routes>
    </MemoryRouter>
  );

const submit = () =>
  screen.getByRole('button', { name: /registrarse|registrando/i }).click();

const getForm = (): HTMLFormElement => {
  const el = document.querySelector<HTMLFormElement>('form');
  if (!el) throw new Error('No se encontró el formulario de registro');
  return el;
};

/** Texto visible en el contenedor global de toasts de react-toastify. */
const toastText = (): string =>
  document.querySelector('.Toastify__toast-container')?.textContent ?? '';

describe('Register — feedback dentro de la tarjeta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('confirma el registro inline y redirige a /login tras 2.5 segundos', async () => {
    vi.useFakeTimers();
    mockRegister.mockResolvedValueOnce({
      message: 'Registro exitoso. Revisa tu correo para activar la cuenta.',
    });

    renderRegister();
    fillAll();

    await act(async () => {
      submit();
    });

    expect(getForm().querySelector('[role="status"]')?.textContent).toContain(
      'Registro exitoso. Revisa tu correo para activar la cuenta.'
    );
    // El aviso está en la tarjeta, no en el toast global.
    expect(toastText()).not.toContain('Registro exitoso');

    // La redirección espera a que el mensaje se pueda leer.
    expect(screen.queryByText('pantalla de login')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(screen.getByText('pantalla de login')).toBeTruthy();
  });

  it('muestra el error del backend dentro del formulario y no como toast', async () => {
    mockRegister.mockRejectedValueOnce({
      response: { status: 409, data: { message: 'El correo ya está registrado' } },
    });

    renderRegister();
    fillAll();
    submit();

    await waitFor(() => {
      expect(getForm().querySelector('[role="alert"]')?.textContent).toContain(
        'El correo ya está registrado'
      );
    });
    expect(toastText()).not.toContain('El correo ya está registrado');
    expect(screen.queryByText('pantalla de login')).toBeNull();
  });

  it('limpia el aviso inline al editar un campo', async () => {
    mockRegister.mockRejectedValueOnce({
      response: { status: 409, data: { message: 'El correo ya está registrado' } },
    });

    renderRegister();
    fillAll();
    submit();

    await waitFor(() => {
      expect(getForm().querySelector('[role="alert"]')).toBeTruthy();
    });

    fill('email', 'otra@epn.edu.ec');

    await waitFor(() => {
      expect(getForm().querySelector('[role="alert"]')).toBeNull();
    });
  });
});
