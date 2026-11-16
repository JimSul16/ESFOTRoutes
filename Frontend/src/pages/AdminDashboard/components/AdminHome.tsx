import { useEffect, useState } from 'react';
import { Button, Card, Icon, Skeleton, StatCard, type IconName } from '@/components/ui';
import { getUsers } from '../../../api/admin.api';
import { getRoutes } from '../../../api/route.api';
import type { AdminTab } from './AdminSidebar';

interface AdminStats {
  users: number;
  admins: number;
  routes: number;
  publicRoutes: number;
}

export interface AdminHomeProps {
  /** Navegación entre pestañas del panel; sin ella los atajos no hacen nada. */
  onNavigate?: (tab: AdminTab) => void;
}

const ADMIN_ACTIONS: { tab: AdminTab; label: string; description: string; icon: IconName }[] = [
  {
    tab: 'usuarios',
    label: 'Gestión de usuarios',
    description: 'Altas, roles y bloqueos de cuenta',
    icon: 'users',
  },
  {
    tab: 'recursos',
    label: 'Gestión de recursos',
    description: 'Materiales, enlaces y multimedia',
    icon: 'bookOpen',
  },
  {
    tab: 'rutas',
    label: 'Rutas de aprendizaje',
    description: 'Publica y edita el catálogo',
    icon: 'route',
  },
  {
    tab: 'constructor',
    label: 'Constructor de rutas',
    description: 'Diseña módulos y contenidos',
    icon: 'pencil',
  },
];

const AdminHome = ({ onNavigate }: AdminHomeProps) => {
  const [stats, setStats] = useState<AdminStats>({
    users: 0,
    admins: 0,
    routes: 0,
    publicRoutes: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchStats = async () => {
      // Cualquiera de las dos llamadas puede fallar sin arrastrar a la otra.
      const [usersData, routesData] = await Promise.all([
        getUsers().catch(() => []),
        getRoutes().catch(() => []),
      ]);

      if (cancelled) return;

      const totalStudents = usersData.filter((user) => user.roles?.includes('STUDENT')).length;
      const totalAdmins = usersData.filter((user) => user.roles?.includes('ADMIN')).length;

      setStats({
        users: totalStudents > 0 ? totalStudents : usersData.length,
        admins: totalAdmins,
        routes: routesData.length,
        publicRoutes: routesData.filter((route) => Boolean(route.isPublic)).length,
      });
      setLoading(false);
    };

    fetchStats();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="animate-in fade-in space-y-6 duration-300 sm:space-y-8">
      {/* Bienvenida */}
      <section className="relative overflow-hidden rounded-panel border border-surface-200/80 bg-white shadow-card dark:border-surface-800 dark:bg-surface-900">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-600 via-brand-500 to-primary-500"
        />

        <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="max-w-2xl space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-surface-200 bg-surface-50 px-3 py-1 text-2xs font-semibold uppercase tracking-[0.14em] text-surface-600 dark:border-surface-700 dark:bg-surface-800/60 dark:text-surface-300">
              <Icon name="signal" className="h-3.5 w-3.5 text-surface-900 dark:text-surface-100" />
              Sesión activa · Panel de administración
            </span>

            <h2 className="font-display text-2xl font-extrabold tracking-tight text-surface-900 dark:text-white sm:text-3xl">
              Hola, Administrador
            </h2>

            <p className="max-w-xl text-sm leading-relaxed text-surface-600 dark:text-surface-300 sm:text-base">
              Gestiona las rutas de aprendizaje, supervisa el progreso de los estudiantes y
              administra los recursos educativos de la plataforma.
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Button
                type="button"
                onClick={() => onNavigate?.('rutas')}
                iconRight={<Icon name="arrowRight" className="h-4 w-4" />}
              >
                Gestionar rutas
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => onNavigate?.('usuarios')}
                iconLeft={<Icon name="users" className="h-4 w-4" />}
              >
                Gestionar usuarios
              </Button>
            </div>
          </div>

          <div className="hidden shrink-0 lg:flex">
            <div className="flex w-52 flex-col items-center justify-center gap-2 rounded-panel border border-surface-200/80 bg-surface-50/80 px-6 py-8 text-center dark:border-surface-800 dark:bg-surface-950/40">
              <span className="flex h-14 w-14 items-center justify-center rounded-control bg-brand-600 text-white shadow-sm shadow-brand-600/25">
                <Icon name="shield" className="h-7 w-7" />
              </span>
              <p className="mt-1 font-display text-sm font-bold text-surface-900 dark:text-white">
                Acceso administrativo
              </p>
              <p className="text-2xs leading-relaxed text-surface-500 dark:text-surface-400">
                Gestión integral de la plataforma
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Resumen del sistema */}
      <section aria-label="Resumen del sistema" className="space-y-4">
        <div>
          <h3 className="font-display text-lg font-bold tracking-tight text-surface-900 dark:text-white sm:text-xl">
            Resumen del Sistema
          </h3>
          <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">
            Estadísticas generales de la plataforma
          </p>
        </div>

        <div aria-busy={loading} className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <span className="sr-only">{loading ? 'Cargando estadísticas…' : 'Estadísticas cargadas'}</span>

          {loading ? (
            [0, 1, 2, 3].map((index) => (
              <Card key={index} padding="md" className="space-y-3">
                <Skeleton className="w-1/2" />
                <Skeleton variant="rect" className="h-8 w-20" />
                <Skeleton className="w-2/3" />
              </Card>
            ))
          ) : (
            <>
              <StatCard
                label="Estudiantes"
                value={stats.users}
                hint="Cuentas de estudiante"
                icon="graduationCap"
                tone="brand"
              />
              <StatCard
                label="Administradores"
                value={stats.admins}
                hint="Con acceso al panel"
                icon="shield"
                tone="brand"
              />
              <StatCard
                label="Rutas de aprendizaje"
                value={stats.routes}
                hint="Creadas en la plataforma"
                icon="route"
                tone="brand"
              />
              <StatCard
                label="Rutas públicas"
                value={stats.publicRoutes}
                hint="Visibles en el catálogo"
                icon="compass"
                tone="brand"
              />
            </>
          )}
        </div>
      </section>

      {/* Paneles de administración */}
      <section aria-labelledby="admin-panels-heading" className="space-y-4">
        <div>
          <h3
            id="admin-panels-heading"
            className="font-display text-lg font-bold tracking-tight text-surface-900 dark:text-white sm:text-xl"
          >
            Paneles de administración
          </h3>
          <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">
            Accesos directos a las tareas más frecuentes
          </p>
        </div>

        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {ADMIN_ACTIONS.map((action) => (
            <li key={action.tab}>
              <Card variant="interactive" padding="md" className="group flex h-full flex-col">
                <span className="flex h-11 w-11 items-center justify-center rounded-control bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
                  <Icon name={action.icon} className="h-5 w-5" />
                </span>

                <h4 className="mt-4 font-display text-sm font-bold text-surface-900 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400">
                  {action.label}
                </h4>
                <p className="mt-1 flex-1 text-xs leading-relaxed text-surface-500 dark:text-surface-400">
                  {action.description}
                </p>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigate?.(action.tab)}
                  aria-label={`Abrir ${action.label}`}
                  className="mt-4 self-start px-0"
                  iconRight={<Icon name="arrowRight" className="h-3.5 w-3.5" />}
                >
                  Abrir panel
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default AdminHome;
