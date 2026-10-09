const RouteExplorer = ({ routes, loading, onSelectRoute }) => {
  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'BEGINNER': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'INTERMEDIATE': return 'bg-sky-500/10 text-sky-500 border-sky-500/20';
      case 'ADVANCED': return 'bg-violet-500/10 text-violet-500 border-violet-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  const getDifficultyText = (difficulty) => {
    switch (difficulty) {
      case 'BEGINNER': return 'Principiante';
      case 'INTERMEDIATE': return 'Intermedio';
      case 'ADVANCED': return 'Avanzado';
      default: return difficulty;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight mb-2">Explorar Rutas</h2>
        <p className="text-slate-500 dark:text-slate-400">Descubre nuevos caminos de aprendizaje estructurados por tus profesores.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-violet-600"></div>
        </div>
      ) : routes.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-sm">
          <span className="text-4xl block mb-4">📚</span>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">No hay rutas disponibles</h3>
          <p className="text-slate-500 dark:text-slate-400">Pronto se añadirán nuevas rutas de aprendizaje a la plataforma.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {routes.map((route) => (
            <div key={route.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:border-violet-500/50 transition-all hover:shadow-lg hover:shadow-violet-500/10 flex flex-col h-full group shadow-sm">
              <div className="p-6 flex-grow">
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getDifficultyColor(route.difficulty)}`}>
                    {getDifficultyText(route.difficulty)}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    ⏱️ {route.estimatedTime} min
                  </span>
                </div>

                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-3 line-clamp-2 group-hover:text-violet-500 transition-colors">
                  {route.title}
                </h3>

                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3">
                  {route.description || 'Sin descripción disponible.'}
                </p>
              </div>

              <div className="p-6 pt-0 mt-auto">
                <button
                  onClick={() => onSelectRoute(route)}
                  className="w-full bg-slate-50 dark:bg-slate-800 hover:bg-violet-600 hover:text-white dark:hover:bg-violet-600 text-slate-700 dark:text-slate-300 font-bold py-3 px-4 rounded-xl transition-all duration-300"
                >
                  Ver Detalles
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