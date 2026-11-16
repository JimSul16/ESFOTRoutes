import { useEffect, useState } from 'react';
import { Badge, Button, Card, EmptyState, Icon, Spinner } from '@/components/ui';
import {
  getModuleAssessments,
  type ModuleAssessmentItem,
} from '@/api';
import { getApiErrorMessage } from '@/api/errors';

export interface ModuleAssessmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleId: string | null;
  moduleTitle: string | null;
}

const ModuleAssessmentsModal = ({
  isOpen,
  onClose,
  moduleId,
  moduleTitle,
}: ModuleAssessmentsModalProps) => {
  const [loading, setLoading] = useState(false);
  const [assessments, setAssessments] = useState<ModuleAssessmentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  useEffect(() => {
    if (!isOpen || !moduleId) {
      setAssessments([]);
      setError(null);
      setExpandedId(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    getModuleAssessments(moduleId)
      .then((res) => {
        if (isMounted) {
          setAssessments(res.assessments || []);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(getApiErrorMessage(err, 'No se pudo cargar el historial de evaluaciones.'));
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, moduleId]);

  if (!isOpen || !moduleId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-surface-900 rounded-3xl shadow-2xl border border-surface-200 dark:border-surface-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-100 dark:border-surface-800">
          <div className="min-w-0">
            <h2 className="text-xl font-display font-bold text-surface-900 dark:text-white truncate">
              Evaluaciones del Módulo
            </h2>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 truncate">
              {moduleTitle || 'Módulo'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            aria-label="Cerrar modal"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Spinner size="lg" />
              <p className="text-sm text-surface-500 dark:text-surface-400">
                Consultando evaluaciones registradas…
              </p>
            </div>
          )}

          {!loading && error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300"
            >
              <Icon name="circleAlert" className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p>{error}</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setLoading(true);
                    setError(null);
                    getModuleAssessments(moduleId)
                      .then((res) => setAssessments(res.assessments || []))
                      .catch((err) => setError(getApiErrorMessage(err)))
                      .finally(() => setLoading(false));
                  }}
                >
                  Reintentar
                </Button>
              </div>
            </div>
          )}

          {!loading && !error && assessments.length === 0 && (
            <EmptyState
              icon="listChecks"
              title="Sin evaluaciones previas"
              description="Aún no se han generado cuestionarios ni retos para este módulo."
            />
          )}

          {!loading && !error && assessments.length > 0 && (
            <div className="space-y-3">
              {assessments.map((item, idx) => {
                const isExpanded = expandedId === item.id;
                const questions: Array<{ question?: string; options?: string[]; answer?: string }> =
                  typeof item.content === 'object' && item.content !== null
                    ? (item.content as { questions?: Array<unknown> }).questions ||
                      (Array.isArray(item.content) ? item.content : [])
                    : [];

                return (
                  <Card key={item.id ?? idx} padding="sm" className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
                          <Icon name="listChecks" className="h-4 w-4" />
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="brand" size="sm">
                              {item.type || 'Evaluación'}
                            </Badge>
                            {questions.length > 0 && (
                              <span className="text-2xs text-surface-500">
                                {questions.length} {questions.length === 1 ? 'pregunta' : 'preguntas'}
                              </span>
                            )}
                          </div>
                          <p className="text-2xs text-surface-400 mt-0.5">
                            Generada: {new Date(item.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {questions.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          iconRight={
                            <Icon
                              name={isExpanded ? 'chevronDown' : 'chevronRight'}
                              className="h-3.5 w-3.5"
                            />
                          }
                        >
                          {isExpanded ? 'Ocultar preguntas' : 'Ver preguntas'}
                        </Button>
                      )}
                    </div>

                    {isExpanded && questions.length > 0 && (
                      <div className="pt-3 border-t border-surface-100 dark:border-surface-800 space-y-2">
                        {questions.map((q, qIdx) => (
                          <div
                            key={qIdx}
                            className="p-2.5 rounded-xl bg-surface-50 dark:bg-surface-800/60 text-xs space-y-1"
                          >
                            <p className="font-semibold text-surface-900 dark:text-white">
                              {qIdx + 1}. {q.question || 'Pregunta de evaluación'}
                            </p>
                            {q.options && Array.isArray(q.options) && (
                              <ul className="pl-4 space-y-0.5 list-disc text-surface-600 dark:text-surface-300">
                                {q.options.map((opt, oIdx) => (
                                  <li key={oIdx}>{opt}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-surface-100 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-850">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ModuleAssessmentsModal;
