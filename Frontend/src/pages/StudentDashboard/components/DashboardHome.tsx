import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Icon,
  ProgressBar,
  Skeleton,
  StatCard,
} from '@/components/ui';
import { getDifficultyMeta } from '@/utils/uiMaps';
import { getMyRoutes } from '../../../api/route.api';
import { getApiErrorMessage } from '../../../api/errors';
import type { LearningRoute, UserDashboard } from '../../../types';
import { levelProgress, XP_PER_LEVEL } from '../../../utils/progress';
import type { StudentTab } from '../index';

export interface DashboardHomeProps {
  userData: UserDashboard;
  setActiveTab: (tab: StudentTab) => void;
}

const QUICK_ACTIONS: { label: string; description: string; tab: StudentTab; icon: 'compass' | 'route' | 'chartColumn' | 'user' }[] = [
  {
    label: 'Explorar catálogo',
    description: 'Rutas públicas de la facultad',
    tab: 'explorar',
    icon: 'compass',
  },
  {
    label: 'Ver mis rutas',
    description: 'Continúa tus inscripciones',
    tab: 'mis-rutas',
    icon: 'route',
  },
  {
    label: 'Analítica personal',
    description: 'Actividad y módulos completados',
    tab: 'analytics',
    icon: 'chartColumn',
  },
  {
    label: 'Mi perfil',
    description: 'Datos, foto y preferencias',
    tab: 'perfil',
    icon: 'user',
  },
];

const DashboardHome = ({ userData, setActiveTab }: DashboardHomeProps) => {
  const [activeRoutes, setActiveRoutes] = useState<LearningRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchRecentRoutes = async () => {
      setLoading(true);
      setError(null);

      try {
        const routes = await getMyRoutes();
        if (!cancelled) setActiveRoutes(routes.slice(0, 3));
      } catch (caught: unknown) {
        if (!cancelled) {
          setError(getApiErrorMessage(caught, 'No se pudieron cargar tus rutas activas.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRecentRoutes();

    return () => {
      cancelled = true;
    };
    // `reloadKey` no se lee dentro del efecto: es solo el disparador del reintento.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [reloadKey]);

  const firstName = userData.name.split(' ')[0] || userData.name;
  const streak = userData.streak ?? 0;
  const level = userData.level ?? 1;
  const { xpInLevel, xpNeeded, percent: xpPercent } = levelProgress(userData.xp, level);

  return (
    <div className="animate-in fade-in space-y-6 duration-300 sm:space-y-8">
      {/* Bienvenida */}
      <section className="relative overflow-hidden rounded-panel border border-surface-200/80 bg-white shadow-card dark:border-surface-800 dark:bg-surface-900">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400"
        />

        <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="max-w-2xl space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-surface-200 bg-surface-50 px-3 py-1 text-2xs font-semibold uppercase tracking-[0.14em] text-surface-600 dark:border-surface-700 dark:bg-surface-800/60 dark:text-surface-300">
              <Icon name="signal" className="h-3.5 w-3.5 text-surface-900 dark:text-surface-100" />
              Sesión activa · Semestre académico
            </span>

            <h2 className="font-display text-2xl font-extrabold tracking-tight text-surface-900 dark:text-white sm:text-3xl">
              Hola, {firstName}
            </h2>

            <p className="max-w-xl text-sm leading-relaxed text-surface-600 dark:text-surface-300 sm:text-base">
              Tienes rutas en curso y retos técnicos por resolver. Continúa tu entrenamiento para
              ganar experiencia y ascender de nivel curricular.
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Button
                type="button"
                onClick={() => setActiveTab('mis-rutas')}
                iconRight={<Icon name="arrowRight" className="h-4 w-4" />}
              >
                Continuar aprendiendo
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setActiveTab('explorar')}
                iconLeft={<Icon name="compass" className="h-4 w-4" />}
              >
                Explorar catálogo
              </Button>
            </div>
          </div>

          <div className="hidden w-full max-w-xs flex-col gap-3 rounded-card border border-surface-200/80 bg-surface-50/80 p-4 dark:border-surface-800 dark:bg-surface-950/40 lg:flex">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-brand-600 text-white shadow-sm shadow-brand-600/25">
                <Icon name="graduationCap" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-2xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                  Progreso académico
                </p>
                <p className="font-display text-sm font-bold text-surface-900 dark:text-white">
                  Nivel {level}
                </p>
              </div>
            </div>

            <div className="h-px bg-surface-200 dark:bg-surface-800" aria-hidden="true" />

            <dl className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-3">
                <dt className="inline-flex items-center gap-2 text-surface-500 dark:text-surface-400">
                  <Icon name="flame" className="h-3.5 w-3.5 text-brand-500" />
                  Racha
                </dt>
                <dd className="font-semibold text-surface-900 dark:text-white">
                  {streak} {streak === 1 ? 'día' : 'días'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="inline-flex items-center gap-2 text-surface-500 dark:text-surface-400">
                  <Icon name="zap" className="h-3.5 w-3.5 text-brand-500" />
                  Progreso del nivel
                </dt>
                <dd className="font-semibold tabular-nums text-surface-900 dark:text-white">
                  {xpInLevel}/{XP_PER_LEVEL} pts
                </dd>
              </div>
            </dl>

            <ProgressBar value={xpPercent} size="sm" />

            <p className="text-2xs text-surface-500 dark:text-surface-400">
              {xpPercent}% completado hacia el siguiente nivel
            </p>
          </div>
        </div>
      </section>

      {/* Resumen rápido */}
      <section aria-label="Resumen de tu progreso" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Racha"
          value={`${streak} ${streak === 1 ? 'día' : 'días'}`}
          hint="Actividad consecutiva"
          icon="flame"
          tone="brand"
        />
        <StatCard
          label="Nivel"
          value={`Nvl. ${level}`}
          hint={`Meta: ${XP_PER_LEVEL} pts`}
          icon="trophy"
          tone="brand"
        />
        <StatCard
          label="Progreso del nivel"
          value={`${xpPercent}%`}
          hint={`${xpInLevel} de ${XP_PER_LEVEL} pts`}
          icon="zap"
          tone="brand"
        />
        <StatCard
          label="Rutas activas"
          value={loading ? '—' : activeRoutes.length}
          hint="Inscripciones en curso"
          icon="route"
          tone="brand"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        {/* Rutas activas */}
        <section aria-labelledby="active-routes-heading" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3
                id="active-routes-heading"
                className="font-display text-lg font-bold tracking-tight text-surface-900 dark:text-white sm:text-xl"
              >
                Continúa donde lo dejaste
              </h3>
              <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">
                Tus rutas inscritas y el avance de cada una
              </p>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('mis-rutas')}
              iconRight={<Icon name="arrowRight" className="h-3.5 w-3.5" />}
            >
              Ver todas las rutas
            </Button>
          </div>

          {loading ? (
            <div aria-busy="true" className="space-y-3">
              <span className="sr-only">Cargando rutas activas…</span>
              {[0, 1, 2].map((index) => (
                <Card key={index} padding="sm">
                  <div className="flex items-start gap-3">
                    <Skeleton variant="rect" className="h-10 w-10 shrink-0" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="w-2/3" />
                      <Skeleton className="w-1/2" />
                      <Skeleton className="mt-4 h-1.5 w-full" />
                    </div>
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
          ) : activeRoutes.length === 0 ? (
            <Card padding="none">
              <EmptyState
                icon="route"
                title="Aún no tienes rutas activas"
                description="Comienza realizando un autodiagnóstico o inscríbete en una de las rutas públicas de la facultad."
                action={
                  <Button
                    type="button"
                    onClick={() => setActiveTab('explorar')}
                    iconRight={<Icon name="arrowRight" className="h-4 w-4" />}
                  >
                    Explorar catálogo curricular
                  </Button>
                }
              />
            </Card>
          ) : (
            <ul className="space-y-3">
              {activeRoutes.map((route) => {
                const progressValue = Math.min(100, Math.max(0, route.progress ?? 0));
                const difficulty = getDifficultyMeta(route.difficulty);
                const moduleCount = route.modules?.length ?? 0;

                return (
                  <li key={route.id}>
                    <Card variant="interactive" padding="sm" className="group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          {route.imageUrl ? (
                            <img
                              src={route.imageUrl}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-control object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
                              <Icon name={difficulty.icon} className="h-5 w-5" />
                            </span>
                          )}

                          <div className="min-w-0">
                            <h4 className="truncate font-display text-sm font-bold text-surface-900 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400 sm:text-base">
                              {route.title}
                            </h4>
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-surface-500 dark:text-surface-400">
                              <Badge variant={difficulty.variant} size="sm">
                                {difficulty.label}
                              </Badge>
                              {moduleCount > 0 && (
                                <span className="inline-flex items-center gap-1">
                                  <Icon name="layers" className="h-3 w-3" />
                                  {moduleCount} módulos
                                </span>
                              )}
                              {route.estimatedTime ? (
                                <span className="inline-flex items-center gap-1">
                                  <Icon name="clock" className="h-3 w-3" />
                                  {route.estimatedTime} min
                                </span>
                              ) : null}
                            </p>
                          </div>
                        </div>

                        <span className="shrink-0 text-sm font-bold tabular-nums text-brand-600 dark:text-brand-400">
                          {progressValue}%
                        </span>
                      </div>

                      <ProgressBar value={progressValue} size="sm" className="mt-4" />

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="text-2xs text-surface-500 dark:text-surface-400">
                          {progressValue === 0
                            ? 'Aún sin empezar'
                            : progressValue >= 100
                              ? 'Ruta completada'
                              : 'En progreso'}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveTab('mis-rutas')}
                          aria-label={`Continuar la ruta ${route.title}`}
                          iconRight={<Icon name="chevronRight" className="h-3.5 w-3.5" />}
                        >
                          Continuar
                        </Button>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Progreso y accesos */}
        <div className="space-y-6">
          <Card padding="none">
            <CardHeader className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-sm font-bold text-surface-900 dark:text-white">
                  Tu nivel
                </h3>
                <p className="mt-0.5 text-2xs text-surface-500 dark:text-surface-400">
                  Progreso académico
                </p>
              </div>
              <Badge variant="brand" size="sm">
                Nvl. {level}
              </Badge>
            </CardHeader>

            <CardBody className="space-y-4">
              <ProgressBar
                value={xpPercent}
                label="Avance del nivel"
                showValue
                tone="brand"
              />

              <p className="text-xs leading-relaxed text-surface-500 dark:text-surface-400">
                <span className="font-semibold text-surface-700 dark:text-surface-200">
                  {xpInLevel} de {XP_PER_LEVEL} pts
                </span>{' '}
                · te faltan {xpNeeded} pts de progreso para el siguiente nivel.
              </p>

              <div className="flex items-center gap-3 rounded-control border border-surface-200/70 bg-surface-50 p-3 dark:border-surface-800 dark:bg-surface-850">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-300">
                  <Icon name="flame" className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-surface-900 dark:text-white">
                    {streak} {streak === 1 ? 'día' : 'días'} de racha
                  </p>
                  <p className="text-2xs text-surface-500 dark:text-surface-400">
                    Mantén la constancia para no perderla.
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card padding="none">
            <CardHeader>
              <h3 className="font-display text-sm font-bold text-surface-900 dark:text-white">
                Acciones rápidas
              </h3>
              <p className="mt-0.5 text-2xs text-surface-500 dark:text-surface-400">
                Atajos a las secciones principales
              </p>
            </CardHeader>

            <CardBody className="space-y-1">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.tab}
                  type="button"
                  onClick={() => setActiveTab(action.tab)}
                  className="flex w-full items-center gap-3 rounded-control px-2 py-2 text-left transition-colors hover:bg-surface-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus/50 dark:hover:bg-surface-800/70"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-300">
                    <Icon name={action.icon} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-surface-800 dark:text-surface-100">
                      {action.label}
                    </span>
                    <span className="block truncate text-2xs text-surface-500 dark:text-surface-400">
                      {action.description}
                    </span>
                  </span>
                  <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-surface-400" />
                </button>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
