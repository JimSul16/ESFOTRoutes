import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ModuleResourcePicker from './ModuleResourcePicker';
import type { Resource } from '../../../types';

const sampleResources: Resource[] = [
  {
    id: 'res-react',
    title: 'Fundamentos de React y Hooks',
    description: 'Guía práctica para componentes y ciclo de vida en Frontend',
    type: 'VIDEO',
    url: 'https://example.com/react',
  },
  {
    id: 'res-docker',
    title: 'Docker y Contenedores en Linux',
    description: 'DevOps e infraestructura para despliegues',
    type: 'PDF',
    url: 'https://example.com/docker',
  },
  {
    id: 'res-sql',
    title: 'Modelado Relacional y SQL Avanzado',
    description: 'Bases de datos relacionales y optimización',
    type: 'LINK',
    url: 'https://example.com/sql',
  },
];

describe('ModuleResourcePicker — Asignación Inteligente de Recursos', () => {
  const onToggleResource = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza todos los recursos y pestañas correctamente', () => {
    render(
      <ModuleResourcePicker
        availableResources={sampleResources}
        selectedResourceIds={[]}
        onToggleResource={onToggleResource}
        moduleTitle="Introducción a la Web"
        routeCategory="Desarrollo Web Frontend"
      />
    );

    expect(screen.getByText('Todos (3)')).toBeTruthy();
    expect(screen.getByText('Asignados (0)')).toBeTruthy();
    expect(screen.getByText('Fundamentos de React y Hooks')).toBeTruthy();
    expect(screen.getByText('Docker y Contenedores en Linux')).toBeTruthy();
    expect(screen.getByText('Modelado Relacional y SQL Avanzado')).toBeTruthy();
  });

  it('detecta sugerencias automáticas basadas en el título del módulo y categoría', () => {
    render(
      <ModuleResourcePicker
        availableResources={sampleResources}
        selectedResourceIds={[]}
        onToggleResource={onToggleResource}
        moduleTitle="Curso de React para Frontend"
        routeCategory="Desarrollo Web Frontend"
      />
    );

    // Debe mostrar la pestaña de sugeridos (al menos react coincide con frontend/react)
    const suggestedTab = screen.getByRole('button', { name: /Sugeridos/ });
    expect(suggestedTab).toBeTruthy();

    fireEvent.click(suggestedTab);
    expect(screen.getByText('Fundamentos de React y Hooks')).toBeTruthy();
    expect(screen.queryByText('Docker y Contenedores en Linux')).toBeNull();
  });

  it('filtra por búsqueda de texto y tipo', () => {
    render(
      <ModuleResourcePicker
        availableResources={sampleResources}
        selectedResourceIds={[]}
        onToggleResource={onToggleResource}
        moduleTitle="Bases de Datos"
      />
    );

    const input = screen.getByPlaceholderText('Buscar por título o palabra clave en el catálogo...');
    fireEvent.change(input, { target: { value: 'sql' } });

    expect(screen.getByText('Modelado Relacional y SQL Avanzado')).toBeTruthy();
    expect(screen.queryByText('Fundamentos de React y Hooks')).toBeNull();
  });

  it('dispara onToggleResource al seleccionar o deseleccionar', () => {
    render(
      <ModuleResourcePicker
        availableResources={sampleResources}
        selectedResourceIds={['res-react']}
        onToggleResource={onToggleResource}
        moduleTitle="React"
      />
    );

    // Los recursos asignados aparecen en chips con botón de remover
    const removeButton = screen.getByRole('button', { name: 'Desasignar Fundamentos de React y Hooks' });
    fireEvent.click(removeButton);

    expect(onToggleResource).toHaveBeenCalledWith('res-react');
  });

  it('permite ver solo los recursos asignados en la pestaña Asignados', () => {
    render(
      <ModuleResourcePicker
        availableResources={sampleResources}
        selectedResourceIds={['res-sql']}
        onToggleResource={onToggleResource}
        moduleTitle="Backend"
      />
    );

    const assignedTab = screen.getByRole('button', { name: 'Asignados (1)' });
    fireEvent.click(assignedTab);

    // Aparece tanto en el chip de asignados como en la lista de la pestaña
    expect(screen.getAllByText('Modelado Relacional y SQL Avanzado').length).toBe(2);
    expect(screen.queryByText('Fundamentos de React y Hooks')).toBeNull();
    expect(screen.queryByText('Docker y Contenedores en Linux')).toBeNull();
  });
});
