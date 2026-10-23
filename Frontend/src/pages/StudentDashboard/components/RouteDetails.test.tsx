import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ToastContainer } from 'react-toastify';
import { getRouteById, completeModule } from '../../../api/route.api';
import { generateAssessment } from '../../../api/chat.api';
import RouteDetails from './RouteDetails';
import type { LearningRoute } from '../../../types';

vi.mock('../../../api/route.api', () => ({
  getRouteById: vi.fn(),
  enrollRoute: vi.fn(),
  completeModule: vi.fn(),
}));

vi.mock('../../../api/chat.api', () => ({ generateAssessment: vi.fn() }));

const mockGetRoute = vi.mocked(getRouteById);
const mockComplete = vi.mocked(completeModule);
const mockGenerate = vi.mocked(generateAssessment);

/** La prop llega obsoleta a propósito: simula al padre tras aprobar un módulo. */
const rutaProp = (): LearningRoute => ({
  id: 'ruta-1',
  title: 'Título obsoleto de la prop',
  description: 'Descripción obsoleta',
  modules: [
    {
      id: 'mod-1',
      title: 'Primer módulo',
      description: 'Contenido',
      resources: [],
    },
  ],
  enrollments: [],
} as unknown as LearningRoute);

const rutaFresca = (): LearningRoute =>
  ({
    ...rutaProp(),
    title: 'Título actualizado por el backend',
    enrollments: [{ id: 'e-1', routeId: 'ruta-1', completedModules: [] }],
  }) as unknown as LearningRoute;

const renderDetalle = (onAssessmentComplete = vi.fn()) =>
  render(
    <>
      <ToastContainer />
      <RouteDetails
        route={rutaProp()}
        viewMode="teoria"
        setViewMode={vi.fn()}
        onBack={vi.fn()}
        contextoEvaluacion=""
        setContextoEvaluacion={vi.fn()}
        onSendToAI={vi.fn()}
        isAlreadyEnrolled={false}
        onAssessmentComplete={onAssessmentComplete}
      />
    </>
  );

describe('RouteDetails — refresco de la ruta', () => {
  beforeEach(() => vi.clearAllMocks());

  // El fallo anterior: se recargaba la ruta pero la UI seguía leyendo la prop.
  it('pinta los datos que devuelve GET /routes/:id, no los de la prop', async () => {
    mockGetRoute.mockResolvedValue(rutaFresca());
    renderDetalle();

    await waitFor(() => expect(mockGetRoute).toHaveBeenCalledWith('ruta-1'));
    await waitFor(() => {
      expect(screen.getByText('Título actualizado por el backend')).toBeTruthy();
    });
    expect(screen.queryByText('Título obsoleto de la prop')).toBeNull();
  });

  it('conserva la prop si el refresco falla, sin romper la pantalla', async () => {
    mockGetRoute.mockRejectedValue(new Error('network'));
    renderDetalle();

    await waitFor(() => expect(mockGetRoute).toHaveBeenCalled());
    expect(screen.getByText('Título obsoleto de la prop')).toBeTruthy();
  });

  it('vuelve a leer la ruta al superar una evaluación', async () => {
    mockGetRoute.mockResolvedValue(rutaFresca());
    mockGenerate.mockResolvedValue({
      questions: [
        { id: 1, question: '¿Qué es un museo?', options: ['Un museo', 'Un parque'], correctAnswer: 'Un museo' },
      ],
    });
    mockComplete.mockResolvedValue({
      message: 'Módulo completado con éxito.',
      xpGained: 20,
      newTotalXp: 120,
      newLevel: 2,
    } as never);

    const onComplete = vi.fn();
    renderDetalle(onComplete);

    await waitFor(() => expect(mockGetRoute).toHaveBeenCalledTimes(1));

    // Abrir el módulo y lanzar el reto final (único tipo que registra progreso).
    fireEvent.click(screen.getByText('Primer módulo'));
    fireEvent.click(screen.getByRole('button', { name: /iniciar reto final/i }));

    await waitFor(() => expect(mockGenerate).toHaveBeenCalled());
    expect(await screen.findByText('¿Qué es un museo?')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /un museo/i }));
    fireEvent.click(screen.getByRole('button', { name: /entregar evaluación/i }));

    await waitFor(() => expect(mockComplete).toHaveBeenCalled());
    // El padre recibe el XP...
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    // ...y la ruta se relee para que el progreso deje de estar obsoleto.
    await waitFor(() => expect(mockGetRoute).toHaveBeenCalledTimes(2));
  });
});