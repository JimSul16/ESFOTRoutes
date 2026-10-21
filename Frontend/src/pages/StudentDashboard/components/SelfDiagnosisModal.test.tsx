import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { getSubjects, getSubjectTopics, submitSelfDiagnosis } from '../../../api/graph.api';
import SelfDiagnosisModal from './SelfDiagnosisModal';

vi.mock('../../../api/graph.api', () => ({
  getSubjects: vi.fn(),
  getSubjectTopics: vi.fn(),
  submitSelfDiagnosis: vi.fn(),
  generatePersonalizedAdaptiveRoute: vi.fn(),
}));

const mockSubjects = vi.mocked(getSubjects);
const mockTopics = vi.mocked(getSubjectTopics);
const mockSubmit = vi.mocked(submitSelfDiagnosis);

const MATERIA = { id: 'redes', name: 'Redes de Computadoras', topicCount: 2 };

const MODULOS = [
  {
    id: 'redes-m1',
    name: 'Módulo 1: Fundamentos y Arquitecturas de Red',
    position: 1,
    topics: [
      { id: 'redes-intro', name: 'Introducción a Redes y Topologías' },
      { id: 'redes-osi-tcp', name: 'Modelo OSI vs Modelo TCP/IP' },
    ],
  },
];

const renderModal = () => render(<SelfDiagnosisModal isOpen onClose={() => {}} />);

/** El contador vive en un `<strong>` dentro del pie del modal. */
const contador = () => document.querySelector('strong')?.textContent ?? '';

const botonGenerar = () =>
  screen.getByRole('button', { name: /Generar Mi Ruta Adaptativa/i });

describe('SelfDiagnosisModal — contador real de temas evaluados', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubjects.mockResolvedValue([MATERIA]);
    mockTopics.mockResolvedValue(MODULOS);
    mockSubmit.mockResolvedValue({ message: 'ok', savedCount: 2 });
  });

  /**
   * Regresión del BUG 7: `ratings` se inicializaba con TODOS los temas en 3,
   * así que el contador marcaba "2/2 evaluados" antes de tocar nada y el
   * botón de generar la ruta nunca se deshabilitaba.
   */
  it('arranca con 0 temas evaluados aunque los topics vengan precargados', async () => {
    renderModal();

    await waitFor(() => {
      expect(contador()).toBe('0/2');
    });
  });

  it('el botón de generar la ruta empieza deshabilitado', async () => {
    renderModal();

    await waitFor(() => expect(contador()).toBe('0/2'));
    expect(botonGenerar()).toBeDisabled();
  });

  it('cuenta un tema solo cuando el estudiante lo califica', async () => {
    renderModal();

    await waitFor(() => expect(contador()).toBe('0/2'));

    fireEvent.click(screen.getAllByTitle('4 - Práctico')[0]);

    await waitFor(() => {
      expect(contador()).toBe('1/2');
    });
  });

  it('habilita el botón cuando todos los temas están calificados', async () => {
    renderModal();

    await waitFor(() => expect(contador()).toBe('0/2'));

    fireEvent.click(screen.getAllByTitle('5 - Avanzado')[0]);
    fireEvent.click(screen.getAllByTitle('2 - Básico / Teórico')[1]);

    await waitFor(() => {
      expect(contador()).toBe('2/2');
    });

    expect(botonGenerar()).not.toBeDisabled();
  });

  it('marca como "Sin evaluar" los temas que aún no se han tocado', async () => {
    renderModal();

    await waitFor(() => {
      expect(screen.getAllByText('Sin evaluar')).toHaveLength(2);
    });
  });

  it('envía los niveles que el estudiante eligió, no los valores por defecto', async () => {
    renderModal();

    await waitFor(() => expect(contador()).toBe('0/2'));

    fireEvent.click(screen.getAllByTitle('5 - Avanzado')[0]);
    fireEvent.click(screen.getAllByTitle('2 - Básico / Teórico')[1]);

    await waitFor(() => expect(contador()).toBe('2/2'));

    fireEvent.click(screen.getByRole('button', { name: /Generar Mi Ruta Adaptativa/i }));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });

    // Si el modal enviara los valores por defecto (3) en lugar de los
    // calificados, esta aserción fallaría.
    expect(mockSubmit).toHaveBeenCalledWith([
      { topicId: 'redes-intro', level: 5 },
      { topicId: 'redes-osi-tcp', level: 2 },
    ]);
  });
});
