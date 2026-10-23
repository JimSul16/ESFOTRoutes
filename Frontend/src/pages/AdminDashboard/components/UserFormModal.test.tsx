import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ToastContainer } from 'react-toastify';
import { createUser } from '../../../api/admin.api';
import UserFormModal from './UserFormModal';

// El mock replica los exports nombrados REALES de `api/admin.api` (ver §7.1
// del Contexto_General): un mock con otra forma hace pasar el test mientras
// el build falla.
vi.mock('../../../api/admin.api', () => ({
  createUser: vi.fn(),
  updateUser: vi.fn(),
}));

const mockCreateUser = vi.mocked(createUser);

const input = (name: string): HTMLInputElement => {
  const el = document.querySelector<HTMLInputElement>(`input[name="${name}"]`);
  if (!el) throw new Error(`No se encontró el input "${name}"`);
  return el;
};

const fill = (name: string, value: string) => {
  fireEvent.change(input(name), { target: { value } });
};

const montar = () =>
  render(
    <>
      <ToastContainer />
      <UserFormModal isOpen onClose={vi.fn()} userToEdit={null} />
    </>
  );

const guardar = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
};

describe('UserFormModal — dominios de correo permitidos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateUser.mockResolvedValue({ message: 'Usuario creado con éxito' });
  });

  it('acepta un correo institucional @epn.edu.ec', async () => {
    montar();

    fill('name', 'Ana Pérez');
    fill('email', 'ana.perez@epn.edu.ec');
    fill('password', 'Password123');
    guardar();

    await waitFor(() => {
      expect(mockCreateUser).toHaveBeenCalledTimes(1);
    });
    expect(mockCreateUser.mock.calls[0]?.[0]).toMatchObject({
      email: 'ana.perez@epn.edu.ec',
    });
  });

  // Regresión del bug: el modal solo aceptaba `@epn.edu.ec`, aunque el
  // registro público (`POST /auth/register`) ya admitía también Gmail.
  it('acepta un correo @gmail.com', async () => {
    montar();

    fill('name', 'Carlos Ruiz');
    fill('email', 'carlos.ruiz@gmail.com');
    fill('password', 'Password123');
    guardar();

    await waitFor(() => {
      expect(mockCreateUser).toHaveBeenCalledTimes(1);
    });
    expect(mockCreateUser.mock.calls[0]?.[0]).toMatchObject({
      email: 'carlos.ruiz@gmail.com',
    });
  });

  it('rechaza un dominio que no está permitido', async () => {
    montar();

    fill('name', 'Carlos Ruiz');
    fill('email', 'carlos.ruiz@outlook.com');
    fill('password', 'Password123');
    guardar();

    await waitFor(() => {
      expect(
        screen.getByText(/Usa un correo institucional \(@epn\.edu\.ec\) o de Gmail \(@gmail\.com\)/)
      ).toBeTruthy();
    });
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it('no deja pasar un dominio parecido que suplanta al institucional', async () => {
    montar();

    fill('name', ' impostor ');
    fill('email', 'atacante@epn.edu.ec.attacker.com');
    fill('password', 'Password123');
    guardar();

    await waitFor(() => {
      expect(screen.getByText(/Usa un correo institucional/)).toBeTruthy();
    });
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  // `User.email` es UNIQUE en SQLite y SQLite compara TEXT distinguiendo
  // mayúsculas: sin normalizar, `Ana@Gmail.com` y `ana@gmail.com` serían
  // dos usuarios distintos y el segundo no podría iniciar sesión.
  it('normaliza el correo (recorta y pasa a minúsculas) antes de enviarlo', async () => {
    montar();

    fill('name', 'Ana Pérez');
    fill('email', '  Ana.Perez@Gmail.COM  ');
    fill('password', 'Password123');
    guardar();

    await waitFor(() => {
      expect(mockCreateUser).toHaveBeenCalledTimes(1);
    });
    expect(mockCreateUser.mock.calls[0]?.[0]).toMatchObject({
      email: 'ana.perez@gmail.com',
    });
  });

  it('acepta un correo institucional escrito en mayúsculas', async () => {
    montar();

    fill('name', 'Ana Pérez');
    fill('email', 'ANA.PEREZ@EPN.EDU.EC');
    fill('password', 'Password123');
    guardar();

    await waitFor(() => {
      expect(mockCreateUser).toHaveBeenCalledTimes(1);
    });
    expect(mockCreateUser.mock.calls[0]?.[0]).toMatchObject({
      email: 'ana.perez@epn.edu.ec',
    });
  });

  it('muestra los dominios permitidos como ayuda', () => {
    montar();

    expect(screen.getByText(/Dominios permitidos: @epn\.edu\.ec o @gmail\.com/)).toBeTruthy();
  });
});
