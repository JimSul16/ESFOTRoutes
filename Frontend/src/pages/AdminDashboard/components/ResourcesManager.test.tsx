import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { getResources } from '../../../api/resource.api';
import ResourcesManager from './ResourcesManager';
import type { Resource } from '../../../types';

vi.mock('../../../api/resource.api', () => ({
  getResources: vi.fn(),
  deleteResource: vi.fn(),
}));

vi.mock('react-toastify', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

const mockGetResources = vi.mocked(getResources);

const sampleResources: Resource[] = [
  {
    id: 'res-1',
    title: 'Guía de TypeScript Avanzado',
    description: 'Manual de tipos y genéricos en TS',
    type: 'PDF',
    url: 'https://example.com/ts.pdf',
  },
  {
    id: 'res-2',
    title: 'Tutorial de React y Hooks',
    description: 'Video explicativo de useState y useEffect',
    type: 'VIDEO',
    url: 'https://example.com/react.mp4',
  },
  {
    id: 'res-3',
    title: 'Documentación Oficial de Docker',
    description: 'Enlace a la web de containers',
    type: 'LINK',
    url: 'https://docs.docker.com',
  },
  {
    id: 'res-4',
    title: 'Diagrama de Arquitectura Limpia',
    description: 'Esquema visual de capas',
    type: 'IMAGE',
    url: 'https://example.com/arch.png',
  },
];

describe('ResourcesManager — Búsqueda y Filtros', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza la lista completa inicialmente con el contador de recursos', async () => {
    mockGetResources.mockResolvedValue(sampleResources);
    render(<ResourcesManager />);

    await waitFor(() => {
      expect(screen.getByText('Guía de TypeScript Avanzado')).toBeTruthy();
    });

    expect(screen.getByText('Tutorial de React y Hooks')).toBeTruthy();
    expect(screen.getByText('Documentación Oficial de Docker')).toBeTruthy();
    expect(screen.getByText('Diagrama de Arquitectura Limpia')).toBeTruthy();
    expect(screen.getByText('4 recursos')).toBeTruthy();
  });

  it('filtra recursos en tiempo real según el término de búsqueda', async () => {
    mockGetResources.mockResolvedValue(sampleResources);
    render(<ResourcesManager />);

    await waitFor(() => expect(screen.getByText('Guía de TypeScript Avanzado')).toBeTruthy());

    const searchInput = screen.getByPlaceholderText('Buscar recurso por título o descripción...');
    fireEvent.change(searchInput, { target: { value: 'react' } });

    expect(screen.getByText('Tutorial de React y Hooks')).toBeTruthy();
    expect(screen.queryByText('Guía de TypeScript Avanzado')).toBeNull();
    expect(screen.queryByText('Documentación Oficial de Docker')).toBeNull();
    expect(screen.getByText('1 de 4 recursos')).toBeTruthy();
  });

  it('filtra recursos por tipo seleccionado en el dropdown', async () => {
    mockGetResources.mockResolvedValue(sampleResources);
    render(<ResourcesManager />);

    await waitFor(() => expect(screen.getByText('Guía de TypeScript Avanzado')).toBeTruthy());

    const typeSelect = screen.getByRole('combobox', { name: 'Filtrar por tipo' });
    fireEvent.change(typeSelect, { target: { value: 'VIDEO' } });

    expect(screen.getByText('Tutorial de React y Hooks')).toBeTruthy();
    expect(screen.queryByText('Guía de TypeScript Avanzado')).toBeNull();
    expect(screen.getByText('1 de 4 recursos')).toBeTruthy();
  });

  it('muestra estado vacío y permite limpiar filtros si la búsqueda no arroja resultados', async () => {
    mockGetResources.mockResolvedValue(sampleResources);
    render(<ResourcesManager />);

    await waitFor(() => expect(screen.getByText('Guía de TypeScript Avanzado')).toBeTruthy());

    const searchInput = screen.getByPlaceholderText('Buscar recurso por título o descripción...');
    fireEvent.change(searchInput, { target: { value: 'inexistente' } });

    expect(screen.getByText('No se encontraron recursos')).toBeTruthy();
    expect(screen.getByText('0 de 4 recursos')).toBeTruthy();

    const clearButton = screen.getByRole('button', { name: 'Limpiar filtros' });
    fireEvent.click(clearButton);

    expect(screen.getByText('Guía de TypeScript Avanzado')).toBeTruthy();
    expect(screen.getByText('4 recursos')).toBeTruthy();
  });
});
