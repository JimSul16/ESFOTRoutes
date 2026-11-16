import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Icon,
  PageHeader,
  Skeleton,
  StatCard,
} from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { getMyRoutes } from '../../../api/route.api';
import { getSubjects } from '../../../api/graph.api';
import { getWeeklyActivity } from '../../../api/analytics.api';
import { getApiErrorMessage } from '../../../api/errors';
import type { AnalyticsData, SubjectProgress, UserDashboard } from '../../../types';

const DISTRIBUTION_COLORS = ['#dc2626', '#000000', '#a8a29e'];

export interface AnalyticsDashboardProps {
  userData: UserDashboard;
}

const AnalyticsDashboard = ({ userData }: AnalyticsDashboardProps) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [progressData, setProgressData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);

      try {
        // Antes usaba `httpClient.get('/graph/subjects')` y hacía
        // `subjectsRes.data`, que es el sobre `{ success, subjects }`, no un
        // array: `subjects.map` reventaba y el panel quedaba en error.
        const [routes, subjects, weekly] = await Promise.all([
          getMyRoutes(),
          getSubjects(),
          getWeeklyActivity(),
        ]);

        const subjectProgress: SubjectProgress[] = subjects.map((subject) => {
          // `LearningRoute.subjectId` es real desde el 11/10/2026: el backend
          // lo deduce de `category` y lo rellena al generar rutas adaptativas.
          const subjectRoutes = routes.filter((r) => r.subjectId === subject.id);

          // Ojo: el backend marca el módulo con `isPassed`, no con
          // `completed`. Antes se leía `m.completed` (que nunca venía) y el
          // contador de módulos completados salía siempre en 0.
          const completedModules = subjectRoutes.reduce(
            (acc, r) => acc + (r.modules?.filter((m) => m.isPassed).length ?? 0),
            0
          );

          // Si la materia no tiene rutas propias, se recurre al avance medio
          // de las rutas del usuario: mejor un dato aproximado que un 0 falso.
          const fallback =
            subjectRoutes.length > 0
              ? Math.round(
                  subjectRoutes.reduce((acc, r) => acc + (r.progress ?? 0), 0) /
                    subjectRoutes.length
                )
              : 0;

          const totalModules = subjectRoutes.reduce((acc, r) => acc + (r.modules?.length ?? 0), 0);

          return {
            name: subject.name,
            total: totalModules,
            completed: completedModules,
            percent: totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : fallback,
          };
        });

        // Actividad real: la calcula el backend a partir de `ModuleProgress`.
        // Antes eran valores de ejemplo hardcodeados (45/120/30... minutos).
        const weeklyActivity = weekly.weeklyActivity.map((day) => ({
          day: day.day,
          minutes: day.minutes,
        }));

        // `progress` ahora lo devuelve `getMyRoutes`, así que la distro es real.
        const progressDistribution = [
          { name: 'Completado', value: routes.filter((r) => r.progress === 100).length },
          {
            name: 'En progreso',
            value: routes.filter((r) => r.progress !== undefined && r.progress > 0 && r.progress < 100).length,
          },
          {
            name: 'Sin iniciar',
            value: routes.filter((r) => r.progress === undefined || r.progress === 0).length,
          },
        ].filter((item) => item.value > 0);

        if (!cancelled) {
          setProgressData({ subjectProgress, weeklyActivity, progressDistribution });
        }
      } catch (caught: unknown) {
        if (!cancelled) {
          setError(getApiErrorMessage(caught, 'No se pudieron cargar tus estadísticas.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAnalytics();

    return () => {
      cancelled = true;
    };
    // `reloadKey` solo dispara el reintento manual.
    // oxlint-disable-next-line react/exhaustive-effect-dependencies
  }, [reloadKey]);

  const axisColor = isDark ? '#a8a29e' : '#78716c';
  const gridColor = isDark ? '#292524' : '#e7e5e4';
  const tooltipStyle = {
    backgroundColor: isDark ? '#1c1917' : '#ffffff',
    border: `1px solid ${gridColor}`,
    borderRadius: '8px',
    color: isDark ? '#f5f5f4' : '#1c1917',
  };

  const weeklyActivity = progressData?.weeklyActivity ?? [];
  const hasWeeklyActivity = weeklyActivity.some((day) => day.minutes > 0);
  const progressDistribution = progressData?.progressDistribution ?? [];
  const subjectProgress = progressData?.subjectProgress ?? [];
  const hasSubjects = subjectProgress.length > 0;

  const completedModules = subjectProgress.reduce((acc, subject) => acc + subject.completed, 0);
  const totalRoutes = progressDistribution.reduce((acc, entry) => acc + entry.value, 0);

  if (loading) {
    return (
      <div aria-busy="true" className="animate-in fade-in space-y-6 duration-300">
        <span className="sr-only">Cargando analítica de progreso…</span>

        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Card key={index} padding="md" className="space-y-3">
              <Skeleton className="w-1/2" />
              <Skeleton variant="rect" className="h-8 w-20" />
              <Skeleton className="w-2/3" />
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[0, 1].map((index) => (
            <Card key={index} padding="none">
              <div className="border-b border-surface-100 px-6 py-4 dark:border-surface-800">
                <Skeleton className="w-1/3" />
              </div>
              <div className="p-6">
                <Skeleton variant="rect" className="h-64 w-full" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-in fade-in space-y-6 duration-300">
        <PageHeader
          eyebrow="Aprendizaje"
          title="Analítica de progreso"
          description="Visualiza tu avance en cada materia y tu actividad de estudio."
        />

        <Card padding="md" role="alert" className="space-y-3 border-red-200/70 dark:border-red-500/20">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
              <Icon name="circleAlert" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-surface-900 dark:text-white">
                No pudimos cargar tu analítica
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
      </div>
    );
  }

  return (
    <div className="animate-in fade-in space-y-6 pb-12 duration-300 sm:space-y-8">
      <PageHeader
        eyebrow="Aprendizaje"
        title="Analítica de progreso"
        description="Visualiza tu avance en cada materia y tu actividad de estudio."
      />

      {/* Resumen */}
      <section aria-label="Resumen de tu actividad" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Progreso total"
          value={`${userData?.xp || 0} pts`}
          hint="Puntos acumulados"
          icon="zap"
          tone="brand"
        />
        <StatCard
          label="Nivel actual"
          value={userData?.level || 1}
          hint="Rango curricular"
          icon="trophy"
          tone="brand"
        />
        <StatCard
          label="Días de racha"
          value={userData?.streak || 0}
          hint="Actividad consecutiva"
          icon="flame"
          tone="brand"
        />
        <StatCard
          label="Módulos superados"
          value={completedModules}
          hint={`${totalRoutes} ${totalRoutes === 1 ? 'ruta inscrita' : 'rutas inscritas'}`}
          icon="listChecks"
          tone="brand"
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Actividad semanal */}
        <Card padding="none">
          <CardHeader className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-sm font-bold text-surface-900 dark:text-white">
                Actividad semanal
              </h3>
              <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">
                Minutos de estudio por día
              </p>
            </div>
            <Icon name="activity" className="h-4 w-4 text-surface-400" />
          </CardHeader>

          <CardBody>
            <div className="h-64">
              {!hasWeeklyActivity ? (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface-100 text-surface-400 dark:bg-surface-800 dark:text-surface-500">
                    <Icon name="activity" className="h-5 w-5" />
                  </span>
                  <p className="text-sm font-semibold text-surface-700 dark:text-surface-200">
                    Sin módulos superados esta semana
                  </p>
                  <p className="mt-1 max-w-xs text-xs text-surface-500 dark:text-surface-400">
                    Completa y aprueba un módulo para que la actividad aparezca aquí.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="day" stroke={axisColor} fontSize={12} tickLine={false} />
                    <YAxis stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line
                      type="monotone"
                      dataKey="minutes"
                      name="Minutos"
                      stroke="#dc2626"
                      strokeWidth={2}
                      dot={{ fill: '#dc2626', r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Distribución */}
        <Card padding="none">
          <CardHeader className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-sm font-bold text-surface-900 dark:text-white">
                Distribución de rutas
              </h3>
              <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">
                Estado de tus inscripciones
              </p>
            </div>
            {totalRoutes > 0 && (
              <Badge variant="default" size="sm">
                {totalRoutes} {totalRoutes === 1 ? 'ruta' : 'rutas'}
              </Badge>
            )}
          </CardHeader>

          <CardBody>
            {progressDistribution.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center px-6 text-center">
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface-100 text-surface-400 dark:bg-surface-800 dark:text-surface-500">
                  <Icon name="route" className="h-5 w-5" />
                </span>
                <p className="text-sm font-semibold text-surface-700 dark:text-surface-200">
                  Todavía no tienes rutas inscritas
                </p>
                <p className="mt-1 max-w-xs text-xs text-surface-500 dark:text-surface-400">
                  Inscríbete en una ruta del catálogo para ver tu distribución.
                </p>
              </div>
            ) : (
              <>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={progressDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={82}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {progressDistribution.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={DISTRIBUTION_COLORS[index % DISTRIBUTION_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <ul className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-2">
                  {progressDistribution.map((entry, index) => (
                    <li
                      key={entry.name}
                      className="flex items-center gap-2 text-xs font-medium text-surface-600 dark:text-surface-300"
                    >
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: DISTRIBUTION_COLORS[index % DISTRIBUTION_COLORS.length],
                        }}
                      />
                      {entry.name}
                      <span className="tabular-nums text-surface-400 dark:text-surface-500">
                        ({entry.value})
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Progreso por materia */}
      <Card padding="none">
        <CardHeader>
          <h3 className="font-display text-sm font-bold text-surface-900 dark:text-white">
            Progreso por materia
          </h3>
          <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">
            Módulos completados sobre el total de cada materia
          </p>
        </CardHeader>

        <CardBody>
          <div className="h-64">
            {!hasSubjects ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface-100 text-surface-400 dark:bg-surface-800 dark:text-surface-500">
                  <Icon name="chartColumn" className="h-5 w-5" />
                </span>
                <p className="text-sm font-semibold text-surface-700 dark:text-surface-200">
                  Aún no hay materias con progreso
                </p>
                <p className="mt-1 max-w-xs text-xs text-surface-500 dark:text-surface-400">
                  El avance aparecerá cuando tengas rutas asociadas a una materia.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectProgress}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="name" stroke={axisColor} fontSize={12} tickLine={false} />
                  <YAxis stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar
                    dataKey="completed"
                    fill="#dc2626"
                    name="Completado"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="total"
                    fill={isDark ? '#44403c' : '#e7e5e4'}
                    name="Total"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;
