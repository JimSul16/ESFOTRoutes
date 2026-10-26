import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { getGraphRecommendations } from '../../../api/graph.api';
import Recommendations from './Recommendations';

vi.mock('../../../api/graph.api', () => ({ getGraphRecommendations: vi.fn() }));

const mockRecs = vi.mocked(getGraphRecommendations);

const rec = (over = {}) => ({
  id: 'web',
  name: 'Desarrollo de Aplicaciones Web',
  description: 'Frontend y backend',
  matchScore: 82,
  reason: 'Comparte fundamentos de redes con HTTP.',
  ...over,
});

describe('Recommendations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista las materias sugeridas por el grafo', async () => {
    mockRecs.mockResolvedValue([rec()]);
    render(<Recommendations />);

    await waitFor(() => {
      expect(screen.getByText('Desarrollo de Aplicaciones Web')).toBeTruthy();
    });
    expect(screen.getByText('Comparte fundamentos de redes con HTTP.')).toBeTruthy();
    expect(screen.getByText('82% de afinidad')).toBeTruthy();
  });

  // El grafo devuelve [] cuando no hay relaciones SIMILAR_TO: no es un error.
  it('no renderiza nada si no hay recomendaciones', async () => {
    mockRecs.mockResolvedValue([]);
    const { container } = render(<Recommendations />);

    await waitFor(() => expect(mockRecs).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('tampoco muestra nada si la llamada falla', async () => {
    mockRecs.mockRejectedValue(new Error('graph down'));
    const { container } = render(<Recommendations />);

    await waitFor(() => expect(mockRecs).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('tolera una recomendación sin afinidad numérica', async () => {
    mockRecs.mockResolvedValue([rec({ matchScore: null, reason: null })]);
    render(<Recommendations />);

    await waitFor(() => {
      expect(screen.getByText('Desarrollo de Aplicaciones Web')).toBeTruthy();
    });
    expect(screen.queryByText(/% de afinidad/)).toBeNull();
  });
});