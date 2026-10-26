import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthProvider';
import { getProfile } from '../../api/auth.api';
import AdminDashboard from './index';

vi.mock('../../api/auth.api', () => ({
  getProfile: vi.fn(),
}));

const mockGetProfile = vi.mocked(getProfile);

const ADMIN = {
  id: '1',
  name: 'Super Administrador',
  email: 'admin@epn.edu.ec',
  roles: ['ADMIN'],
  initials: 'SA',
};

const montar = () =>
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <AuthProvider>
        <AdminDashboard />
      </AuthProvider>
    </MemoryRouter>
  );

describe('AdminDashboard — carga del perfil', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Regresión: leía `response.name` sobre la respuesta de Axios (que expone
  // `.data.name`), así que el nombre real nunca llegaba y la cabecera siempre
  // mostraba el literal 'Administrador'.
  it('muestra el nombre real del perfil', async () => {
    mockGetProfile.mockResolvedValue(ADMIN);
    montar();

    await waitFor(() => {
      expect(screen.getByText('Super Administrador')).toBeTruthy();
    });
  });

  it('usa las iniciales que devuelve el backend', async () => {
    mockGetProfile.mockResolvedValue(ADMIN);
    montar();

    await waitFor(() => {
      expect(screen.getByText('SA')).toBeTruthy();
    });
  });

  // El backend guarda `initials` en NULL en muchos usuarios antiguos.
  it('calcula las iniciales si el backend no las trae', async () => {
    mockGetProfile.mockResolvedValue({ ...ADMIN, initials: undefined });
    montar();

    await waitFor(() => {
      expect(screen.getByText('Super Administrador')).toBeTruthy();
    });
    expect(screen.getByText('SA')).toBeTruthy();
  });

// Regresión grave: al fallar el perfil, `userData` se quedaba en null y la
// guarda `loadingProfile || !userData` pintaba el spinner para siempre, sin
// forma de reintentar ni de cerrar sesión.
it('muestra una pantalla de error con reintento si el perfil falla', async () => {
    mockGetProfile.mockRejectedValueOnce(new Error('network down'));
    montar();

    await waitFor(() => {
      expect(screen.getByText('No pudimos cargar tu perfil')).toBeTruthy();
    });
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeTruthy();
});

it('el botón Reintentar vuelve a pedir el perfil y monta el panel', async () => {
    mockGetProfile.mockRejectedValueOnce(new Error('network down'));
    montar();
    await waitFor(() => expect(screen.getByText('No pudimos cargar tu perfil')).toBeTruthy());

    mockGetProfile.mockResolvedValueOnce(ADMIN);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => {
      expect(screen.getByText('Super Administrador')).toBeTruthy();
    });
    expect(mockGetProfile).toHaveBeenCalledTimes(2);
  });

  it('no llama al backend más de una vez al montar', async () => {
    mockGetProfile.mockResolvedValue(ADMIN);
    montar();

    await waitFor(() => expect(screen.getByText('Super Administrador')).toBeTruthy());
    expect(mockGetProfile).toHaveBeenCalledTimes(1);
  });
});