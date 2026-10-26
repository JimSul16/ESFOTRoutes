import { useState, useEffect } from 'react';
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

  const fetchRutas = async () => {
    try {
      setRutas(await getMyRoutes());
    } catch (error: unknown) {
      console.error(getApiErrorMessage(error, 'No se pudieron cargar tus rutas.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRutas();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-surface-900 dark:text-white tracking-tight">
            Mis Rutas de Aprendizaje
          </h1>
          <p className="text-surface-500 dark:text-surface-400 text-sm mt-1">
            Continúa tu avance estructurado o pon a prueba tus conocimientos con el tutor IA.
          </p>
        </div>
        <button
          onClick={onOpenSelfDiagnosis}
          className="shrink-0 bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 px-5 rounded-xl flex items-center gap-2 text-sm shadow-sm hover:shadow-brand-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] self-start sm:self-auto"
        >
          <span aria-hidden="true">🧭</span>
          <span>Autodiagnóstico y Ruta Adaptativa</span>
        </button>
      </div>

      {rutas.length === 0 ? (
        <div className="text-center py-16 px-6 bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-4 border border-brand-200/60 dark:border-brand-800/40">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          </div>
          <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-1">Aún no estás inscrito en ninguna ruta</h3>
          <p className="text-surface-500 dark:text-surface-400 text-xs sm:text-sm max-w-md mb-6 leading-relaxed">
            Inscríbete en el material oficial del catálogo o realiza un autodiagnóstico inteligente para que el sistema diseñe una ruta adaptada a ti.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setActiveTab('explorar')}
              className="bg-brand-600 hover:bg-brand-500 text-white font-semibold py-2.5 px-5 rounded-xl text-xs sm:text-sm transition-all shadow-sm"
            >
              Explorar Catálogo General
            </button>
            <button
              onClick={onOpenSelfDiagnosis}
              className="bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 border border-surface-200 dark:border-surface-700 font-semibold py-2.5 px-5 rounded-xl text-xs sm:text-sm transition-all"
            >
              🧭 Autodiagnóstico
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rutas.map((ruta) => {
            const progress = ruta.progress ?? 0;
            const isCompleted = progress >= 100;

            return (
              <div
                key={ruta.id}
                className="bg-white dark:bg-surface-900 rounded-2xl overflow-hidden border border-surface-200/90 dark:border-surface-800 shadow-sm hover:border-brand-500/50 hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="px-2.5 py-1 bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 rounded-md text-xs font-semibold border border-surface-200 dark:border-surface-700">
                      {ruta.difficulty || 'Intermedio'}
                    </span>
                    <span className="text-surface-500 dark:text-surface-400 text-xs font-medium flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {ruta.estimatedTime || 45} min
                    </span>
                  </div>

                  <h3 className="text-lg font-display font-bold text-surface-900 dark:text-white mb-2 line-clamp-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {ruta.title}
                  </h3>

                  <p className="text-surface-500 dark:text-surface-400 text-xs sm:text-sm line-clamp-3 mb-6 leading-relaxed">
                    {ruta.description || 'Ruta de estudio estructurada con recursos conceptuales y prácticos.'}
                  </p>
                </div>

                <div className="p-5 bg-surface-50 dark:bg-surface-850/60 border-t border-surface-100 dark:border-surface-800">
                  <div className="mb-4">
                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                      <span className="text-surface-500 dark:text-surface-400">Progreso de la Ruta</span>
                      <span className={isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-brand-600 dark:text-brand-400'}>
                        {progress}%
                      </span>
                    </div>
                    <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-brand-600 to-brand-700'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectRoute(ruta)}
                    className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                  >
                    <span>{progress > 0 ? 'Continuar Ruta' : 'Iniciar Ruta'}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RoutesViewer;