import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { getMyRoutes } from '../../../api/route.api';
import { getSubjects } from '../../../api/graph.api';
import { getApiErrorMessage } from '../../../api/errors';
import { Card, CardBody, CardHeader, Spinner } from '@/components/ui';
import type { AnalyticsData, SubjectProgress, UserDashboard } from '../../../types';

const COLORS = ['#006fc5', '#f59e0b', '#10b981', '#8b5cf6'];

export interface AnalyticsDashboardProps {
  userData: UserDashboard;
}

const AnalyticsDashboard = ({ userData }: AnalyticsDashboardProps) => {
  const [progressData, setProgressData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Antes usaba `httpClient.get('/graph/subjects')` y hacía
        // `subjectsRes.data`, que es el sobre `{ success, subjects }`, no un
        // array: `subjects.map` reventaba y el panel quedaba en error.
        const [routes, subjects] = await Promise.all([getMyRoutes(), getSubjects()]);

        const subjectProgress: SubjectProgress[] = subjects.map((subject) => {
          // `LearningRoute.subjectId` es real desde el 11/10/2026: el backend
          // lo deduce de `category` y lo rellena al generar rutas adaptativas.
          const subjectRoutes = routes.filter((r) => r.subjectId === subject.id);

          const completedModules = subjectRoutes.reduce(
            (acc, r) => acc + (r.modules?.filter((m) => m.completed).length ?? 0),
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

        // TODO: valores de ejemplo. El backend no expone actividad por día.
        const weeklyActivity = [
          { day: 'Lun', minutes: 45 },
          { day: 'Mar', minutes: 120 },
          { day: 'Mie', minutes: 30 },
          { day: 'Jue', minutes: 90 },
          { day: 'Vie', minutes: 60 },
          { day: 'Sab', minutes: 150 },
          { day: 'Dom', minutes: 20 },
        ];

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

        setProgressData({ subjectProgress, weeklyActivity, progressDistribution });
      } catch (error: unknown) {
        console.error('Error fetching analytics:', getApiErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [userData]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" className="text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-display font-bold text-surface-900 dark:text-white">
          Analítica de progreso
        </h2>
        <p className="text-surface-500 dark:text-surface-400 mt-1">
          Visualiza tu avance en cada materia y tu actividad de estudio.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardBody className="text-center">
            <div className="text-3xl font-display font-bold text-primary-600">{userData?.xp || 0}</div>
            <div className="text-sm text-surface-500">XP Total</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <div className="text-3xl font-display font-bold text-accent-500">{userData?.level || 1}</div>
            <div className="text-sm text-surface-500">Nivel actual</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <div className="text-3xl font-display font-bold text-emerald-500">{userData?.streak || 0}</div>
            <div className="text-sm text-surface-500">Días de racha</div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="font-display font-semibold text-surface-900 dark:text-white">Actividad semanal (minutos)</h3>
          </CardHeader>
          <CardBody>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressData?.weeklyActivity || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                  <XAxis dataKey="day" stroke="#78716c" fontSize={12} />
                  <YAxis stroke="#78716c" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e7e5e4', borderRadius: '8px' }}
                  />
                  <Line type="monotone" dataKey="minutes" stroke="#006fc5" strokeWidth={2} dot={{ fill: '#006fc5' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-display font-semibold text-surface-900 dark:text-white">Distribución de rutas</h3>
          </CardHeader>
          <CardBody>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={progressData?.progressDistribution || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {(progressData?.progressDistribution || []).map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {(progressData?.progressDistribution || []).map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-surface-600 dark:text-surface-300">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h3 className="font-display font-semibold text-surface-900 dark:text-white">Progreso por materia</h3>
        </CardHeader>
        <CardBody>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progressData?.subjectProgress || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="name" stroke="#78716c" fontSize={12} />
                <YAxis stroke="#78716c" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e7e5e4', borderRadius: '8px' }}
                />
                <Bar dataKey="completed" fill="#10b981" name="Completado" />
                <Bar dataKey="total" fill="#e7e5e4" name="Total" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;
