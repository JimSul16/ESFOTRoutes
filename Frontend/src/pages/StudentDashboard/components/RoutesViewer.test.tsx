import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { getMyRoutes } from '../../../api/route.api';
import RoutesViewer from './RoutesViewer';
import type { LearningRoute } from '../../../types';

vi.mock('../../../api/route.api', () => ({ getMyRoutes: vi.fn() }));

const mockGetMyRoutes = vi.mocked(getMyRoutes);

const ruta = (over: Partial<LearningRoute> = {}): LearningRoute => ({
  id: '1',
  title: 'Ruta de Redes',
  description: 'Aprende redes',
  category: 'Redes de Computadoras',
  subjectId: 'redes',
  difficulty: 'BEGINNER',
  estimatedTime: 120,
  modules: [],
  ...over,
});

describe('RoutesViewer — avance de la ruta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderViewer = () =>
    render(
      <RoutesViewer
        setActiveTab={vi.fn()}
        onSelectRoute={vi.fn()}
        onOpenSelfDiagnosis={vi.fn()}
      />
    );

  // Regresión: leía `enrollments[0].progress`, que el backend no devolvía, así
  // que todas las rutas salían en 0% aunque el alumno hubiera avanzado.
  it('muestra el avance que devuelve el backend', async () => {
    mockGetMyRoutes.mockResolvedValue([ruta({ progress: 75 })]);
    renderViewer();

    await waitFor(() => {
      expect(screen.getByText('Ruta de Redes')).toBeTruthy();
    });
    expect(screen.getByText('75%')).toBeTruthy();
  });

  it('muestra 0% si la ruta no trae progreso', async () => {
    mockGetMyRoutes.mockResolvedValue([ruta()]);
    renderViewer();

    await waitFor(() => {
      expect(screen.getByText('0%')).toBeTruthy();
    });
  });

  it('respeta el avance de cada ruta por separado', async () => {
    mockGetMyRoutes.mockResolvedValue([
      ruta({ id: '1', title: 'Ruta A', progress: 100 }),
      ruta({ id: '2', title: 'Ruta B', progress: 30 }),
    ]);
    renderViewer();

    await waitFor(() => expect(screen.getByText('Ruta A')).toBeTruthy());
    expect(screen.getByText('100%')).toBeTruthy();
    expect(screen.getByText('30%')).toBeTruthy();
  });

  it('no rompe si el backend devuelve una lista vacía', async () => {
    mockGetMyRoutes.mockResolvedValue([]);
    renderViewer();

    await waitFor(() => {
      expect(screen.queryByText('Ruta de Redes')).toBeNull();
    });
  });
});

describe('RoutesViewer — un único camino para crear rutas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Regresión: el botón "Nueva Ruta Personalizada" navegaba a la pestaña
   * `crear-ruta`, que ejecutaba el generador IA (`POST /routes/generate`).
   * Ese camino se eliminó: la ruta personalizada del estudiante se genera
   * solo desde el autodiagnóstico curricular.
   */
  it('el botón de ruta personalizada abre el autodiagnóstico', async () => {
    mockGetMyRoutes.mockResolvedValue([ruta()]);
    const onOpenSelfDiagnosis = vi.fn();

    render(
      <RoutesViewer
        setActiveTab={vi.fn()}
        onSelectRoute={vi.fn()}
        onOpenSelfDiagnosis={onOpenSelfDiagnosis}
      />
    );

    await waitFor(() => expect(screen.getByText('Ruta de Redes')).toBeTruthy());

    fireEvent.click(
      screen.getByRole('button', { name: /Autodiagnóstico y Ruta Adaptativa/i })
    );

    expect(onOpenSelfDiagnosis).toHaveBeenCalledTimes(1);
  });

  it('el estado vacío también ofrece el autodiagnóstico', async () => {
    mockGetMyRoutes.mockResolvedValue([]);
    const onOpenSelfDiagnosis = vi.fn();

    render(
      <RoutesViewer
        setActiveTab={vi.fn()}
        onSelectRoute={vi.fn()}
        onOpenSelfDiagnosis={onOpenSelfDiagnosis}
      />
    );

    await waitFor(() =>
      expect(screen.getByText('Aún no estás inscrito en ninguna ruta')).toBeTruthy()
    );

    fireEvent.click(screen.getByRole('button', { name: /Autodiagnóstico$/i }));

    expect(onOpenSelfDiagnosis).toHaveBeenCalledTimes(1);
  });
});