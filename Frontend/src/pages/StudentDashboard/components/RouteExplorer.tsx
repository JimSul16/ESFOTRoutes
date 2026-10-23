import type { LearningRoute } from '../../../types';

export interface RouteExplorerProps {
  routes: LearningRoute[];
  loading: boolean;
  onSelectRoute: (route: LearningRoute) => void;
  onOpenSelfDiagnosis: () => void;
}

const RouteExplorer = ({ routes, loading, onSelectRoute, onOpenSelfDiagnosis }: RouteExplorerProps) => {
  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'BEGINNER':
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60';
      case 'INTERMEDIATE':
        return 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800/60';
      case 'ADVANCED':
        return 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60';
      case 'ADAPTIVE':
        return 'bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-800/60';
      default:
        return 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 border-surface-200 dark:border-surface-700';
    }
  };

  const getDifficultyText = (difficulty?: string) => {
    switch (difficulty) {
      case 'BEGINNER': return 'Principiante';
      case 'INTERMEDIATE': return 'Intermedio';
      case 'ADVANCED': return 'Avanzado';
      case 'ADAPTIVE': return '⚡ Adaptativa';
      default: return difficulty || 'General';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Barra de Título y Acción de Autodiagnóstico */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-surface-900 dark:text-white tracking-tight">
            Explorar Rutas
          </h2>
          <p className="text-surface-500 dark:text-surface-400 text-sm mt-1">
            Descubre caminos de aprendizaje estructurados y adaptados con Inteligencia Artificial.
          </p>
        </div>

        {onOpenSelfDiagnosis && (
          <button
            onClick={onOpenSelfDiagnosis}
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-md shadow-brand-600/20 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] self-start md:self-auto border border-brand-500/30"
          >
            <span>🧭</span>
            <span>Autodiagnóstico por temas</span>
          </button>
        )}
      </div>

      {/* Hero Banner del Grafo */}
      {onOpenSelfDiagnosis && (
        <div className="bg-gradient-to-r from-brand-950 via-surface-900 to-surface-950 border border-brand-500/30 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md text-white">
          <div className="space-y-2 text-center md:text-left">
            <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
              Rutas Adaptativas Personalizadas
            </span>
            <h3 className="text-xl md:text-2xl font-display font-bold text-white">
              ¿Tienes conocimientos previos o vacíos conceptuales?
            </h3>
            <p className="text-sm text-surface-300 max-w-2xl leading-relaxed">
              Realiza una autoevaluación guiada en materias curriculares. Nuestro sistema de grafos organizará tus fortalezas y prerrequisitos en una ruta adaptada a tu ritmo.
            </p>
          </div>
          <button
            onClick={onOpenSelfDiagnosis}
            className="whitespace-nowrap px-5 py-3 rounded-xl bg-white text-surface-950 hover:bg-surface-100 font-semibold text-sm shadow-md transition-all hover:scale-105"
          >
            Comenzar autodiagnóstico
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-600 border-t-transparent" />
        </div>
      ) : routes.length === 0 ? (
        <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-12 text-center shadow-sm">
          <span className="text-4xl block mb-3">📚</span>
          <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-1">No hay rutas disponibles</h3>
          <p className="text-surface-500 dark:text-surface-400 text-sm">Pronto se añadirán nuevas rutas curriculares a la plataforma.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {routes.map((route) => (
            <div
              key={route.id}
              className="bg-white dark:bg-surface-900 border border-surface-200/90 dark:border-surface-800 rounded-2xl overflow-hidden hover:border-brand-500/50 transition-all hover:shadow-md flex flex-col justify-between group shadow-sm"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${getDifficultyColor(route.difficulty)}`}>
                    {getDifficultyText(route.difficulty)}
                  </span>
                  <span className="text-xs font-medium text-surface-500 dark:text-surface-400 flex items-center gap-1">
                    ⏱️ {route.estimatedTime || 45} min
                  </span>
                </div>

                <h3 className="text-lg font-display font-bold text-surface-900 dark:text-white mb-2 line-clamp-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                  {route.title}
                </h3>

                <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 line-clamp-3 leading-relaxed">
                  {route.description || 'Ruta formativa estructurada con recursos conceptuales y ejercicios guiados.'}
                </p>
              </div>

              <div className="p-5 pt-0 mt-auto">
                <button
                  onClick={() => onSelectRoute(route)}
                  className="w-full bg-surface-100 hover:bg-brand-600 hover:text-white dark:bg-surface-800 dark:hover:bg-brand-600 text-surface-700 dark:text-surface-200 font-semibold py-2.5 px-4 rounded-xl text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <span>Ver Detalles de la Ruta</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RouteExplorer;