import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RouteExplorer from './RouteExplorer';
import type { LearningRoute } from '../../../types';

const sampleRoutes: LearningRoute[] = [
  {
    id: 'r1',
    title: 'Desarrollo Web Frontend Moderno',
    description: 'Aprende React, Tailwind y Vite desde cero',
    category: 'Desarrollo Web Frontend',
    difficulty: 'BEGINNER',
    estimatedTime: 90,
    modules: [],
  },
  {
    id: 'r2',
    title: 'Bases de Datos y SQL',
    description: 'Modelado relacional y optimización de consultas',
    category: 'Bases de Datos y Persistencia',
    difficulty: 'INTERMEDIATE',
    estimatedTime: 120,
    modules: [],
  },
];

describe('RouteExplorer — buscador de rutas curriculares', () => {
  const onSelectRoute = vi.fn();
  const onOpenSelfDiagnosis = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza todas las rutas inicialmente con el contador', () => {
    render(
      <RouteExplorer
        routes={sampleRoutes}
        loading={false}
        onSelectRoute={onSelectRoute}
        onOpenSelfDiagnosis={onOpenSelfDiagnosis}
      />
    );

    expect(screen.getByText('Desarrollo Web Frontend Moderno')).toBeTruthy();
    expect(screen.getByText('Bases de Datos y SQL')).toBeTruthy();
    expect(screen.getByText('2 rutas disponibles')).toBeTruthy();
  });

  it('filtra las rutas en tiempo real por título o categoría', () => {
    render(
      <RouteExplorer
        routes={sampleRoutes}
        loading={false}
        onSelectRoute={onSelectRoute}
        onOpenSelfDiagnosis={onOpenSelfDiagnosis}
      />
    );

    const input = screen.getByPlaceholderText('Buscar rutas por título, descripción o categoría...');
    fireEvent.change(input, { target: { value: 'frontend' } });

    expect(screen.getByText('Desarrollo Web Frontend Moderno')).toBeTruthy();
    expect(screen.queryByText('Bases de Datos y SQL')).toBeNull();
    expect(screen.getByText('1 de 2 rutas')).toBeTruthy();

    // Limpiar búsqueda
    const clearBtn = screen.getByRole('button', { name: 'Borrar texto' });
    fireEvent.click(clearBtn);

    expect(screen.getByText('Bases de Datos y SQL')).toBeTruthy();
    expect(screen.getByText('2 rutas disponibles')).toBeTruthy();
  });

  it('muestra estado vacío y permite reintentar cuando no hay coincidencias', () => {
    render(
      <RouteExplorer
        routes={sampleRoutes}
        loading={false}
        onSelectRoute={onSelectRoute}
        onOpenSelfDiagnosis={onOpenSelfDiagnosis}
      />
    );

    const input = screen.getByPlaceholderText('Buscar rutas por título, descripción o categoría...');
    fireEvent.change(input, { target: { value: 'inexistente' } });

    expect(screen.getByText('No se encontraron rutas')).toBeTruthy();
    expect(screen.getByText('0 de 2 rutas')).toBeTruthy();

    const clearBtn = screen.getByRole('button', { name: 'Limpiar búsqueda' });
    fireEvent.click(clearBtn);

    expect(screen.getByText('Desarrollo Web Frontend Moderno')).toBeTruthy();
  });
});
