import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthProvider';
import { getProfile } from '../../api/auth.api';
import { getMyRoutes } from '../../api/route.api';
import StudentDashboard from './index';

vi.mock('../../api/auth.api', () => ({ getProfile: vi.fn() }));
vi.mock('../../api/route.api', () => ({
  getRoutes: vi.fn().mockResolvedValue([]),
  getMyRoutes: vi.fn().mockResolvedValue([]),
}));
vi.mock('../../api/graph.api', () => ({
  getSubjects: vi.fn().mockResolvedValue([]),
  getSubjectTopics: vi.fn().mockResolvedValue([]),
  submitSelfDiagnosis: vi.fn(),
  generatePersonalizedAdaptiveRoute: vi.fn(),
}));
vi.mock('../../api/upload.api', () => ({ uploadProfileImage: vi.fn() }));

const mockGetProfile = vi.mocked(getProfile);
const mockGetMyRoutes = vi.mocked(getMyRoutes);

const ESTUDIANTE = {
  id: '7',
  name: 'Ana Delgado',
  email: 'ana@epn.edu.ec',
  roles: ['STUDENT'],
  xp: 120,
  level: 2,
};

const montar = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AuthProvider>
        <StudentDashboard />
      </AuthProvider>
    </MemoryRouter>
  );

describe('StudentDashboard — carga del perfil', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMyRoutes.mockResolvedValue([]);
  });

  // Regresión: leía `response.name` sobre la respuesta de Axios, así que el
  // nombre real nunca llegaba al panel del estudiante.
  it('muestra el nombre real del estudiante', async () => {
    mockGetProfile.mockResolvedValue(ESTUDIANTE);
    montar();

    await waitFor(() => {
      expect(screen.getByText('Ana Delgado')).toBeTruthy();
    });
  });

  it('usa las iniciales que devuelve el backend', async () => {
    mockGetProfile.mockResolvedValue({ ...ESTUDIANTE, initials: 'AD' });
    montar();

    await waitFor(() => {
      expect(screen.getByText('AD')).toBeTruthy();
    });
  });

  // Antes: `!userData` caía también al spinner, así que un fallo de red dejaba
  // el panel girando indefinidamente sin salida.
  it('muestra error con reintento si el perfil falla', async () => {
    mockGetProfile.mockRejectedValueOnce(new Error('network down'));
    montar();

    await waitFor(() => {
      expect(screen.getByText('No pudimos cargar tu perfil')).toBeTruthy();
    });
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
  });

  it('el reintento vuelve a pedir el perfil y monta el panel', async () => {
    mockGetProfile.mockRejectedValueOnce(new Error('network down'));
    montar();
    await waitFor(() => expect(screen.getByText('No pudimos cargar tu perfil')).toBeTruthy());

    mockGetProfile.mockResolvedValueOnce(ESTUDIANTE);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => {
      expect(screen.getByText('Ana Delgado')).toBeTruthy();
    });
  });

  // Regresión: `response.data.map(...)` sobre httpClient funcionaba por el
  // doble `.data` accidental; `getMyRoutes()` ya devuelve el array.
  it('pide las rutas inscritas al montar', async () => {
    mockGetProfile.mockResolvedValue(ESTUDIANTE);
    montar();

    await waitFor(() => {
      expect(mockGetMyRoutes).toHaveBeenCalled();
    });
  });
});