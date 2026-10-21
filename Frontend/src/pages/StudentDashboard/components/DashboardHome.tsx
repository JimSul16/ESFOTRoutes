import { useState, useEffect } from 'react';
import { getMyRoutes } from '../../../api/route.api';
import { getApiErrorMessage } from '../../../api/errors';
import type { LearningRoute, UserDashboard } from '../../../types';
import type { StudentTab } from '../index';

export interface DashboardHomeProps {
  userData: UserDashboard;
  setActiveTab: (tab: StudentTab) => void;
}

const DashboardHome = ({ userData, setActiveTab }: DashboardHomeProps) => {
  const [activeRoutes, setActiveRoutes] = useState<LearningRoute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentRoutes = async () => {
      try {
        const routes = await getMyRoutes();
        setActiveRoutes(routes.slice(0, 3));
      } catch (error: unknown) {
        console.error(getApiErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };
    fetchRecentRoutes();
  }, []);

  const firstName = userData.name.split(' ')[0] || userData.name;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Banner de Bienvenida */}
      <section className="bg-gradient-to-r from-brand-950 via-surface-900 to-surface-950 border border-brand-500/20 rounded-2xl shadow-md overflow-hidden relative text-white p-7 sm:p-9">
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Sesión Activa • Semestre Académico</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-display font-extrabold tracking-tight">
            Hola, {firstName} 👋
          </h2>

          <p className="text-surface-300 text-sm sm:text-base leading-relaxed">
            Tienes rutas en curso y retos técnicos por resolver. Continúa tu entrenamiento para ganar experiencia y ascender de nivel curricular.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => setActiveTab('mis-rutas')}
              className="bg-white hover:bg-surface-100 text-surface-950 font-semibold px-5 py-2.5 rounded-xl text-sm shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
            >
              <span>Continuar Aprendiendo</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
            <button
              onClick={() => setActiveTab('explorar')}
              className="bg-surface-800/80 hover:bg-surface-800 text-white font-medium px-4 py-2.5 rounded-xl text-sm border border-surface-700 transition-all"
            >
              Explorar Catálogo
            </button>
          </div>
        </div>
      </section>

      {/* Mis Rutas Activas */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg sm:text-xl font-display font-bold text-surface-900 dark:text-white tracking-tight">
              Mis Rutas Activas
            </h3>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
              Rutas en las que estás inscrito actualmente
            </p>
          </div>
          <button
            onClick={() => setActiveTab('mis-rutas')}
            className="text-xs sm:text-sm font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors flex items-center gap-1"
          >
            <span>Ver todas</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent" />
          </div>
        ) : activeRoutes.length === 0 ? (
          <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-8 text-center shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-400 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </div>
            <h4 className="font-bold text-surface-900 dark:text-white text-base">Aún no tienes rutas activas</h4>
            <p className="text-surface-500 dark:text-surface-400 text-xs mt-1 max-w-sm mx-auto mb-4">
              Comienza realizando un autodiagnóstico o inscríbete en una de las rutas públicas de la facultad.
            </p>
            <button
              onClick={() => setActiveTab('explorar')}
              className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              Explorar Catálogo Curricular
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeRoutes.map((route) => {
              const progressValue = route.progress ?? 0;
              return (
                <div
                  key={route.id}
                  onClick={() => setActiveTab('mis-rutas')}
                  className="bg-white dark:bg-surface-900 border border-surface-200/90 dark:border-surface-800 rounded-2xl p-5 hover:border-brand-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 rounded-md border border-surface-200 dark:border-surface-700">
                        {route.difficulty || 'Intermedio'}
                      </span>
                      <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                        {progressValue}%
                      </span>
                    </div>

                    <h4 className="font-display font-bold text-surface-900 dark:text-white text-base mb-1.5 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-1">
                      {route.title}
                    </h4>

                    <p className="text-xs text-surface-500 dark:text-surface-400 line-clamp-2 leading-relaxed">
                      {route.description || 'Ruta formativa estructurada con recursos y módulos.'}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-surface-100 dark:border-surface-800/80">
                    <div className="w-full bg-surface-100 dark:bg-surface-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-brand-600 to-emerald-500 transition-all duration-500"
                        style={{ width: `${progressValue}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default DashboardHome;