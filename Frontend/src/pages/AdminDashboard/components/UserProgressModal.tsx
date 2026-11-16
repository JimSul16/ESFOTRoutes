import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  ProgressBar,
  Spinner,
} from '@/components/ui';
import { getUserProgress, type AdminUserProgress } from '../../../api/admin.api';
import { getApiErrorMessage } from '../../../api/errors';
import type { User } from '../../../types';

export interface UserProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

const UserProgressModal = ({ isOpen, onClose, user }: UserProgressModalProps) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AdminUserProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !user) {
      setData(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    getUserProgress(user.id)
      .then((res) => {
        if (isMounted) setData(res);
      })
      .catch((err) => {
        if (isMounted) setError(getApiErrorMessage(err, 'No se pudo cargar el progreso del usuario.'));
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-surface-900 rounded-3xl shadow-2xl border border-surface-200 dark:border-surface-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-100 dark:border-surface-800">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-display font-bold text-surface-900 dark:text-white truncate">
                Progreso del estudiante
              </h2>
              {user.uniqueId && (
                <Badge variant="brand" size="sm">
                  EPN: {user.uniqueId}
                </Badge>
              )}
            </div>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 truncate">
              {user.name} ({user.email})
              {user.career && ` • ${user.career}`}
              {user.semester && ` • ${user.semester}° Semestre`}
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Spinner size="lg" />
              <p className="text-sm text-surface-500 dark:text-surface-400">
                Consultando el avance del usuario…
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
                    getUserProgress(user.id)
                      .then(setData)
                      .catch((err) => setError(getApiErrorMessage(err)))
                      .finally(() => setLoading(false));
                  }}
                >
                  Reintentar
                </Button>
              </div>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* Stat grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200/80 dark:border-surface-700">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-surface-400">
                    Progreso
                  </span>
                  <p className="mt-1 text-lg font-bold text-surface-900 dark:text-white">
                    {data.progress.points} <span className="text-xs font-normal text-surface-400">pts</span>
                  </p>
                  <p className="text-2xs text-brand-600 dark:text-brand-400 font-medium mt-0.5">
                    Nivel {data.progress.level}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200/80 dark:border-surface-700">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-surface-400">
                    Racha
                  </span>
                  <p className="mt-1 text-lg font-bold text-surface-900 dark:text-white">
                    {data.progress.streak} <span className="text-xs font-normal text-surface-400">días</span>
                  </p>
                  <p className="text-2xs text-surface-500 mt-0.5">Constancia</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200/80 dark:border-surface-700">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-surface-400">
                    Módulos
                  </span>
                  <p className="mt-1 text-lg font-bold text-surface-900 dark:text-white">
                    {data.progress.modulesPassed} <span className="text-xs font-normal text-surface-400">/ {data.progress.modulesCompleted}</span>
                  </p>
                  <p className="text-2xs text-surface-500 mt-0.5">Aprobados</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-50 dark:bg-surface-800/60 border border-surface-200/80 dark:border-surface-700">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-surface-400">
                    Promedio
                  </span>
                  <p className="mt-1 text-lg font-bold text-surface-900 dark:text-white">
                    {data.progress.averageScore !== null ? `${data.progress.averageScore}%` : '—'}
                  </p>
                  <p className="text-2xs text-surface-500 mt-0.5">Evaluaciones</p>
                </div>
              </div>

              {/* Rutas inscritas */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-surface-700 dark:text-surface-300">
                    Rutas de Aprendizaje ({data.progress.routes.length})
                  </h3>
                  <span className="text-xs text-surface-400">
                    Avance promedio: {data.progress.averageProgress}%
                  </span>
                </div>

                {data.progress.routes.length === 0 ? (
                  <EmptyState
                    icon="bookOpen"
                    title="Sin rutas inscritas"
                    description="El estudiante aún no se ha inscrito en ninguna ruta de aprendizaje."
                  />
                ) : (
                  <div className="space-y-2.5">
                    {data.progress.routes.map((route) => (
                      <Card key={route.id} padding="sm" className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="text-sm font-semibold text-surface-900 dark:text-white truncate">
                              {route.title}
                            </h4>
                            {route.category && (
                              <Badge variant="default" size="sm" className="mt-1">
                                {route.category}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs font-bold tabular-nums text-surface-900 dark:text-white">
                            {route.progress}%
                          </span>
                        </div>
                        <ProgressBar value={route.progress} max={100} size="sm" />
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
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

export default UserProgressModal;
