import { useState, useEffect } from 'react';
import { getUsers } from '../../../api/admin.api';
import { getRoutes } from '../../../api/route.api';

interface AdminStats {
  users: number;
  routes: number;
}

const AdminHome = () => {
  const [stats, setStats] = useState<AdminStats>({ users: 0, routes: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      // Cualquiera de las dos llamadas puede fallar sin arrastrar a la otra.
      const [usersData, routesData] = await Promise.all([
        getUsers().catch(() => []),
        getRoutes().catch(() => []),
      ]);

      const totalStudents = usersData.filter((user) => user.roles?.includes('STUDENT')).length;

      setStats({
        users: totalStudents > 0 ? totalStudents : usersData.length,
        routes: routesData.length,
      });
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Banner de Bienvenida */}
      <section className="bg-gradient-to-r from-brand-950 via-surface-900 to-surface-950 border border-brand-500/20 rounded-2xl shadow-md overflow-hidden relative text-white p-7 sm:p-9">
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Sesión Activa • Panel de Administración</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-display font-extrabold tracking-tight">
            Hola, Administrador
          </h2>

          <p className="text-surface-300 text-sm sm:text-base leading-relaxed">
            Gestiona las rutas de aprendizaje, supervisa el progreso de los estudiantes y administra los recursos educativos de la plataforma.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button className="bg-white hover:bg-surface-100 text-surface-950 font-semibold px-5 py-2.5 rounded-xl text-sm shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2">
              <span>Gestionar Rutas</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
            <button className="bg-surface-800/80 hover:bg-surface-800 text-white font-medium px-4 py-2.5 rounded-xl text-sm border border-surface-700 transition-all">
              Ver Catálogo
            </button>
          </div>
        </div>
      </section>

      {/* Stats del Sistema */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg sm:text-xl font-display font-bold text-surface-900 dark:text-white tracking-tight">
              Resumen del Sistema
            </h3>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
              Estadísticas generales de la plataforma
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white dark:bg-surface-900 border border-surface-200/90 dark:border-surface-800 rounded-2xl p-5 hover:border-brand-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-[11px] font-semibold px-2.5 py-0.5 bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 rounded-md border border-surface-200 dark:border-surface-700 uppercase tracking-wider">
                  Estudiantes
                </span>
                <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                  Activos
                </span>
              </div>
              <h4 className="font-display font-bold text-surface-900 dark:text-white text-base mb-1.5 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                Estudiantes Registrados
              </h4>
            </div>
            <div className="mt-5 pt-3 border-t border-surface-100 dark:border-surface-800/80">
              <div className="flex items-center justify-between">
                <p className="text-3xl font-display font-bold text-surface-900 dark:text-white">{stats.users}</p>
                <div className="p-2 bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 rounded-xl group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-900 border border-surface-200/90 dark:border-surface-800 rounded-2xl p-5 hover:border-brand-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-[11px] font-semibold px-2.5 py-0.5 bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 rounded-md border border-surface-200 dark:border-surface-700 uppercase tracking-wider">
                  Rutas
                </span>
                <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                  Creadas
                </span>
              </div>
              <h4 className="font-display font-bold text-surface-900 dark:text-white text-base mb-1.5 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                Rutas de Aprendizaje
              </h4>
            </div>
            <div className="mt-5 pt-3 border-t border-surface-100 dark:border-surface-800/80">
              <div className="flex items-center justify-between">
                <p className="text-3xl font-display font-bold text-surface-900 dark:text-white">{stats.routes}</p>
                <div className="p-2 bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 rounded-xl group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminHome;