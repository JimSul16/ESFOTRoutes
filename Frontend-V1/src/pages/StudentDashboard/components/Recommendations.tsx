import { useState, useEffect, useCallback } from 'react';
import { Card, CardBody, Spinner } from '@/components/ui';
import { getGraphRecommendations } from '../../../api/graph.api';
import { getApiErrorMessage } from '../../../api/errors';
import type { GraphRecommendation } from '../../../types';

export interface RecommendationsProps {
  /** Abre el autodiagnóstico de la materia recomendada. */
  onExploreSubject?: (subjectId: string) => void;
}

/**
 * Materias que el grafo sugiere según lo que el alumno ya completó
 * (`GET /graph/recommendations`, relación `SIMILAR_TO`).
 */
const Recommendations = ({ onExploreSubject }: RecommendationsProps) => {
  const [items, setItems] = useState<GraphRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await getGraphRecommendations());
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'No se pudieron cargar las recomendaciones.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" className="text-primary-600" />
      </div>
    );
  }

  // El grafo devuelve una lista vacía cuando no hay `SIMILAR_TO` cargados:
  // no es un error, así que no se muestra mensaje de fallo.
  if (error || items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-display font-bold text-surface-900 dark:text-white">
          También te puede interesar
        </h2>
        <p className="text-surface-500 dark:text-surface-400 text-sm mt-1">
          Materias relacionadas con los temas que ya completaste.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {items.map((item) => (
          <Card key={item.id} className="relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/10 rounded-bl-full opacity-60 group-hover:opacity-100 transition-opacity" />

            <CardBody>
              <div className="relative">
                <h3 className="text-lg font-display font-semibold text-surface-900 dark:text-white mb-2">
                  {item.name}
                </h3>

                {item.reason && (
                  <p className="text-surface-600 dark:text-surface-400 text-sm mb-4">
                    {item.reason}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  {typeof item.matchScore === 'number' && (
                    <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                      {Math.round(item.matchScore)}% de afinidad
                    </span>
                  )}

                  {onExploreSubject && (
                    <button
                      type="button"
                      onClick={() => onExploreSubject(item.id)}
                      className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      Explorar
                    </button>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default Recommendations;