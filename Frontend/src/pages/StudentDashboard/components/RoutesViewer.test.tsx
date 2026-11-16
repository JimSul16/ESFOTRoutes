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
   * Regresión: el encabezado repetía el acceso al autodiagnóstico que ya vive
   * en el sidebar. Se eliminó ese botón: dentro del componente el único acceso
   * al autodiagnóstico es el estado vacío.
   */
  it('el encabezado no repite el acceso al autodiagnóstico', async () => {
    mockGetMyRoutes.mockResolvedValue([ruta()]);

    render(
      <RoutesViewer
        setActiveTab={vi.fn()}
        onSelectRoute={vi.fn()}
        onOpenSelfDiagnosis={vi.fn()}
      />
    );

    await waitFor(() => expect(screen.getByText('Ruta de Redes')).toBeTruthy());

    expect(
      screen.queryByRole('button', { name: /Autodiagnóstico y Ruta Adaptativa/i })
    ).toBeNull();
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

describe('RoutesViewer — imagen de portada de la ruta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza la imagen de portada cuando ruta.imageUrl está presente', async () => {
    mockGetMyRoutes.mockResolvedValue([
      ruta({ id: '1', title: 'Ruta de Redes', imageUrl: 'https://example.com/portada.jpg' }),
    ]);

    render(
      <RoutesViewer
        setActiveTab={vi.fn()}
        onSelectRoute={vi.fn()}
        onOpenSelfDiagnosis={vi.fn()}
      />
    );

    await waitFor(() => expect(screen.getByText('Ruta de Redes')).toBeTruthy());

    const img = screen.getByAltText('Portada de Ruta de Redes');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('https://example.com/portada.jpg');
  });

  it('no rompe ni renderiza <img> si la ruta no tiene imageUrl', async () => {
    mockGetMyRoutes.mockResolvedValue([
      ruta({ id: '1', title: 'Ruta sin portada', imageUrl: undefined }),
    ]);

    render(
      <RoutesViewer
        setActiveTab={vi.fn()}
        onSelectRoute={vi.fn()}
        onOpenSelfDiagnosis={vi.fn()}
      />
    );

    await waitFor(() => expect(screen.getByText('Ruta sin portada')).toBeTruthy());

    expect(screen.queryByAltText(/Portada de/)).toBeNull();
  });
});

describe('RoutesViewer — buscador de rutas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filtra las rutas inscritas en tiempo real y permite limpiar la búsqueda', async () => {
    mockGetMyRoutes.mockResolvedValue([
      ruta({ id: '1', title: 'Arquitectura de Software', category: 'Software' }),
      ruta({ id: '2', title: 'Redes y Telecomunicaciones', category: 'Redes' }),
    ]);

    render(
      <RoutesViewer
        setActiveTab={vi.fn()}
        onSelectRoute={vi.fn()}
        onOpenSelfDiagnosis={vi.fn()}
      />
    );

    await waitFor(() => expect(screen.getByText('Arquitectura de Software')).toBeTruthy());
    expect(screen.getByText('Redes y Telecomunicaciones')).toBeTruthy();

    const input = screen.getByPlaceholderText('Buscar entre mis rutas por título, descripción o categoría...');
    fireEvent.change(input, { target: { value: 'arquitectura' } });

    expect(screen.getByText('Arquitectura de Software')).toBeTruthy();
    expect(screen.queryByText('Redes y Telecomunicaciones')).toBeNull();
    expect(screen.getByText('1 de 2 rutas')).toBeTruthy();

    // Limpiar búsqueda
    const clearBtn = screen.getByRole('button', { name: 'Borrar texto' });
    fireEvent.click(clearBtn);

    expect(screen.getByText('Redes y Telecomunicaciones')).toBeTruthy();
    expect(screen.getByText('2 rutas inscritas')).toBeTruthy();
  });

  it('muestra estado vacío cuando no hay coincidencias', async () => {
    mockGetMyRoutes.mockResolvedValue([
      ruta({ id: '1', title: 'Arquitectura de Software' }),
    ]);

    render(
      <RoutesViewer
        setActiveTab={vi.fn()}
        onSelectRoute={vi.fn()}
        onOpenSelfDiagnosis={vi.fn()}
      />
    );

    await waitFor(() => expect(screen.getByText('Arquitectura de Software')).toBeTruthy());

    const input = screen.getByPlaceholderText('Buscar entre mis rutas por título, descripción o categoría...');
    fireEvent.change(input, { target: { value: 'inexistente' } });

    expect(screen.getByText('No se encontraron rutas')).toBeTruthy();
    expect(screen.getByText('0 de 1 rutas')).toBeTruthy();

    const clearBtn = screen.getByRole('button', { name: 'Limpiar búsqueda' });
    fireEvent.click(clearBtn);

    expect(screen.getByText('Arquitectura de Software')).toBeTruthy();
  });
});

