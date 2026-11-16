import { useState } from 'react';
import { Badge, Button, Card, EmptyState, Icon, Skeleton } from '@/components/ui';
import { getDifficultyMeta } from '@/utils/uiMaps';
import type { LearningRoute } from '../../../types';

export interface RouteExplorerProps {
  routes: LearningRoute[];
  loading: boolean;
  onSelectRoute: (route: LearningRoute) => void;
  onOpenSelfDiagnosis: () => void;
}

const RouteExplorer = ({ routes, loading, onSelectRoute, onOpenSelfDiagnosis }: RouteExplorerProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRoutes = routes.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      r.title.toLowerCase().includes(q) ||
      (r.description ?? '').toLowerCase().includes(q) ||
      (r.category ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="animate-in fade-in space-y-6 pb-12 duration-300 sm:space-y-8">
      {/* Encabezado */}
      <div className="min-w-0">
        <p className="mb-1 text-2xs font-semibold uppercase tracking-[0.14em] text-surface-500 dark:text-surface-400">
          Catálogo curricular
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-surface-900 dark:text-white sm:text-3xl">
            Explorar Rutas
          </h2>
          {!loading && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-surface-200 bg-surface-50 px-2.5 py-0.5 text-2xs font-semibold text-surface-600 dark:border-surface-700 dark:bg-surface-800/60 dark:text-surface-300">
              <Icon name="route" className="h-3 w-3" />
              {searchQuery.trim()
                ? `${filteredRoutes.length} de ${routes.length} rutas`
                : `${routes.length} ${routes.length === 1 ? 'ruta disponible' : 'rutas disponibles'}`}
            </span>
          )}
        </div>
        <p className="mt-1 max-w-2xl text-sm text-pretty text-surface-500 dark:text-surface-400">
          Descubre caminos de aprendizaje estructurados y adaptados con Inteligencia Artificial.
        </p>
      </div>

      {/* Banner de ruta adaptativa */}
      <section className="relative overflow-hidden rounded-panel border border-surface-200/80 bg-white shadow-card dark:border-surface-800 dark:bg-surface-900">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400"
        />

        <div className="relative flex flex-col gap-6 p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-2.5">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-2xs font-semibold uppercase tracking-wider text-brand-700 dark:border-brand-500/25 dark:bg-brand-500/10 dark:text-brand-300">
              <Icon name="network" className="h-3.5 w-3.5" />
              Rutas adaptativas personalizadas
            </span>
            <h3 className="font-display text-xl font-bold leading-snug text-surface-900 dark:text-white sm:text-2xl">
              ¿Tienes conocimientos previos o vacíos conceptuales?
            </h3>
            <p className="text-sm leading-relaxed text-surface-600 dark:text-surface-300">
              Realiza una autoevaluación guiada en materias curriculares. Nuestro sistema de grafos
              organizará tus fortalezas y prerrequisitos en una ruta adaptada a tu ritmo.
            </p>
          </div>

          <Button
            type="button"
            onClick={onOpenSelfDiagnosis}
            className="shrink-0 self-start md:self-auto"
            iconRight={<Icon name="arrowRight" className="h-4 w-4" />}
          >
            Comenzar autodiagnóstico
          </Button>
        </div>
      </section>

      {/* Buscador de rutas */}
      {!loading && routes.length > 0 && (
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-surface-400">
            <Icon name="search" className="h-4 w-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar rutas por título, descripción o categoría..."
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

      {/* Catálogo */}
      {loading ? (
        <div aria-busy="true" className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <span className="sr-only">Cargando rutas disponibles…</span>
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <Card key={index} padding="md" className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <Skeleton variant="rect" className="h-10 w-10" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="w-3/4" />
              <Skeleton className="w-full" />
              <Skeleton className="w-2/3" />
              <Skeleton variant="rect" className="h-9 w-full" />
            </Card>
          ))}
        </div>
      ) : routes.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon="bookOpen"
            title="No hay rutas disponibles"
            description="Pronto se añadirán nuevas rutas curriculares a la plataforma."
            action={
              <Button
                type="button"
                onClick={onOpenSelfDiagnosis}
                iconLeft={<Icon name="sparkles" className="h-4 w-4" />}
              >
                Autodiagnóstico por temas
              </Button>
            }
          />
        </Card>
      ) : filteredRoutes.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon="search"
            title="No se encontraron rutas"
            description="No hay rutas formativas que coincidan con los términos de búsqueda."
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
          {filteredRoutes.map((route) => {
            const difficulty = getDifficultyMeta(route.difficulty);
            const moduleCount = route.modules?.length ?? 0;

            return (
              <li key={route.id}>
                <Card
                  variant="interactive"
                  padding="none"
                  className="group flex h-full flex-col overflow-hidden"
                >
                  {route.imageUrl && (
                    <div className="relative aspect-video w-full overflow-hidden bg-surface-100 dark:bg-surface-800">
                      <img
                        src={route.imageUrl}
                        alt={`Portada de ${route.title}`}
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
                      <Badge variant={difficulty.variant} size="sm">
                        {difficulty.label}
                      </Badge>
                    </div>

                    {route.category && (
                      <p className="mt-4 text-2xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
                        {route.category}
                      </p>
                    )}

                    <h3 className="mt-1 line-clamp-2 font-display text-base font-bold text-surface-900 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400 sm:text-lg">
                      {route.title}
                    </h3>

                    <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-surface-500 dark:text-surface-400 sm:text-sm">
                      {route.description ||
                        'Ruta formativa estructurada con recursos conceptuales y ejercicios guiados.'}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-surface-500 dark:text-surface-400">
                      <span className="inline-flex items-center gap-1">
                        <Icon name="clock" className="h-3.5 w-3.5" />
                        {route.estimatedTime ?? 45} min
                      </span>
                      {moduleCount > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Icon name="layers" className="h-3.5 w-3.5" />
                          {moduleCount} módulos
                        </span>
                      )}
                    </div>

                    <div className="mt-5 pt-4">
                      <Button
                        type="button"
                        variant="secondary"
                        fullWidth
                        onClick={() => onSelectRoute(route)}
                        aria-label={`Ver detalles de la ruta ${route.title}`}
                        iconRight={<Icon name="arrowRight" className="h-4 w-4" />}
                      >
                        Ver detalles de la ruta
                      </Button>
                    </div>
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

export default RouteExplorer;
