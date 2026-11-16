import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  ProgressBar,
  Skeleton,
} from '@/components/ui';
import { getDifficultyMeta } from '@/utils/uiMaps';
import { getMyRoutes } from '../../../api/route.api';
import { getApiErrorMessage } from '../../../api/errors';
import type { LearningRoute } from '../../../types';
import type { StudentTab } from '../index';

export interface RoutesViewerProps {
  onSelectRoute: (route: LearningRoute) => void;
  setActiveTab: (tab: StudentTab) => void;
  /**
   * Abre el autodiagnóstico curricular.
   *
   * Es el único camino para que el estudiante genere una ruta personalizada:
   * el botón "Nueva Ruta Personalizada" ya no navega a otra pestaña, abre el
   * modal que evalúa tema por tema y genera la ruta adaptativa del grafo.
   */
  onOpenSelfDiagnosis: () => void;
  refreshTrigger?: number;
}

const RoutesViewer = ({ onSelectRoute, setActiveTab, onOpenSelfDiagnosis, refreshTrigger }: RoutesViewerProps) => {
  const [rutas, setRutas] = useState<LearningRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRutas = rutas.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      r.title.toLowerCase().includes(q) ||
      (r.description ?? '').toLowerCase().includes(q) ||
      (r.category ?? '').toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    let cancelled = false;

    const fetchRutas = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getMyRoutes();
        if (!cancelled) setRutas(data);
      } catch (caught: unknown) {
        if (!cancelled) {
          setError(getApiErrorMessage(caught, 'No se pudieron cargar tus rutas.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRutas();

    return () => {
      cancelled = true;
    };
    // Ambos valores son disparadores del refresco, no datos leídos dentro del efecto.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [refreshTrigger, reloadKey]);

  return (
    <div className="animate-in fade-in mx-auto max-w-6xl space-y-6 pb-12 duration-300 sm:space-y-8">
      {/* Encabezado */}
      <header className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-surface-500 dark:text-surface-400">
            Mi aprendizaje
          </p>
          {!loading && !error && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-surface-200 bg-surface-50 px-2.5 py-0.5 text-2xs font-semibold text-surface-600 dark:border-surface-700 dark:bg-surface-800/60 dark:text-surface-300">
              <Icon name="route" className="h-3 w-3" />
              {searchQuery.trim()
                ? `${filteredRutas.length} de ${rutas.length} rutas`
                : `${rutas.length} ${rutas.length === 1 ? 'ruta inscrita' : 'rutas inscritas'}`}
            </span>
          )}
        </div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-surface-900 dark:text-white sm:text-3xl">
          Mis Rutas de Aprendizaje
        </h1>
        <p className="max-w-2xl text-sm text-pretty text-surface-500 dark:text-surface-400">
          Continúa tu avance estructurado o pon a prueba tus conocimientos con el autodiagnóstico
          curricular.
        </p>
      </header>

      {/* Buscador de rutas inscritas */}
      {!loading && !error && rutas.length > 0 && (
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-surface-400">
            <Icon name="search" className="h-4 w-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar entre mis rutas por título, descripción o categoría..."
            className="w-full rounded-control border border-surface-200 bg-white py-2 pl-9 pr-8 text-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-surface-700 dark:bg-surface-900 dark:text-white"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Borrar texto"
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200"
            >
              <Icon name="x" className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div aria-busy="true" className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <span className="sr-only">Cargando tus rutas…</span>
          {[0, 1, 2].map((index) => (
            <Card key={index} padding="none" className="overflow-hidden">
              <div className="space-y-4 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <Skeleton variant="rect" className="h-11 w-11" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <Skeleton className="w-3/4" />
                <Skeleton className="w-full" />
                <Skeleton className="w-2/3" />
              </div>
              <div className="border-t border-surface-100 p-5 dark:border-surface-800">
                <Skeleton className="mb-3 h-1.5 w-full" />
                <Skeleton variant="rect" className="h-10 w-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card padding="md" role="alert" className="space-y-3 border-red-200/70 dark:border-red-500/20">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
              <Icon name="circleAlert" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-surface-900 dark:text-white">
                No pudimos cargar tus rutas
              </p>
              <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">{error}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setReloadKey((key) => key + 1)}
            iconLeft={<Icon name="refreshCw" className="h-3.5 w-3.5" />}
          >
            Reintentar
          </Button>
        </Card>
      ) : rutas.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon="bookOpen"
            title="Aún no estás inscrito en ninguna ruta"
            description="Inscríbete en el material oficial del catálogo o realiza un autodiagnóstico inteligente para que el sistema diseñe una ruta adaptada a ti."
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  type="button"
                  onClick={() => setActiveTab('explorar')}
                  iconRight={<Icon name="arrowRight" className="h-4 w-4" />}
                >
                  Explorar catálogo general
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onOpenSelfDiagnosis}
                  iconLeft={<Icon name="compass" className="h-4 w-4" />}
                >
                  Autodiagnóstico
                </Button>
              </div>
            }
          />
        </Card>
      ) : filteredRutas.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon="search"
            title="No se encontraron rutas"
            description="No hay rutas inscritas que coincidan con los términos de búsqueda."
            action={
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSearchQuery('')}
                iconLeft={<Icon name="refreshCw" className="h-3.5 w-3.5" />}
              >
                Limpiar búsqueda
              </Button>
            }
          />
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredRutas.map((ruta) => {
            const progress = Math.min(100, Math.max(0, ruta.progress ?? 0));
            const isCompleted = progress >= 100;
            const difficulty = getDifficultyMeta(ruta.difficulty);
            const moduleCount = ruta.modules?.length ?? 0;

            return (
              <li key={ruta.id}>
                <Card
                  variant="interactive"
                  padding="none"
                  className="group flex h-full flex-col overflow-hidden"
                >
                  {ruta.imageUrl && (
                    <div className="relative aspect-video w-full overflow-hidden bg-surface-100 dark:bg-surface-800">
                      <img
                        src={ruta.imageUrl}
                        alt={`Portada de ${ruta.title}`}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
                        <Icon name={difficulty.icon} className="h-5 w-5" />
                      </span>
                      <Badge variant={isCompleted ? 'success' : difficulty.variant} size="sm">
                        {isCompleted ? 'Completada' : difficulty.label}
                      </Badge>
                    </div>

                    {ruta.category && (
                      <p className="mt-4 text-2xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
                        {ruta.category}
                      </p>
                    )}

                    <h3 className="mt-1 line-clamp-2 font-display text-base font-bold text-surface-900 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400 sm:text-lg">
                      {ruta.title}
                    </h3>

                    <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-surface-500 dark:text-surface-400 sm:text-sm">
                      {ruta.description ||
                        'Ruta de estudio estructurada con recursos conceptuales y prácticos.'}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-surface-500 dark:text-surface-400">
                      <span className="inline-flex items-center gap-1">
                        <Icon name="clock" className="h-3.5 w-3.5" />
                        {ruta.estimatedTime ?? 45} min
                      </span>
                      {moduleCount > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Icon name="layers" className="h-3.5 w-3.5" />
                          {moduleCount} módulos
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-surface-100 bg-surface-50 p-5 dark:border-surface-800 dark:bg-surface-850/60">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-xs font-medium text-surface-500 dark:text-surface-400">
                        Progreso de la ruta
                      </span>
                      <span
                        className={
                          isCompleted
                            ? 'text-xs font-bold tabular-nums text-surface-900 dark:text-surface-100'
                            : 'text-xs font-bold tabular-nums text-brand-600 dark:text-brand-400'
                        }
                      >
                        {progress}%
                      </span>
                    </div>

                    <ProgressBar
                      value={progress}
                      tone={isCompleted ? 'success' : 'brand'}
                      size="sm"
                      className="mb-4"
                    />

                    <Button
                      type="button"
                      fullWidth
                      onClick={() => onSelectRoute(ruta)}
                      aria-label={`${progress > 0 ? 'Continuar' : 'Iniciar'} la ruta ${ruta.title}`}
                      iconRight={<Icon name="arrowRight" className="h-4 w-4" />}
                    >
                      {progress > 0 ? 'Continuar ruta' : 'Iniciar ruta'}
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default RoutesViewer;
