import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getRoutes, deleteRoute } from '../../../api/route.api';
import RouteBuilder from './RouteBuilder';
import { getApiErrorMessage } from '../../../api/errors';
import type { LearningRoute } from '../../../types';

const RoutesManager = () => {
  const [routes, setRoutes] = useState<LearningRoute[]>([]);
  const [fetching, setFetching] = useState(true);
  const [currentView, setCurrentView] = useState<'list' | 'form'>('list');
  const [routeToEdit, setRouteToEdit] = useState<LearningRoute | null>(null);

  const loadInitialData = async () => {
    setFetching(true);
    try {
      const routesData = await getRoutes();
      setRoutes(routesData);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al cargar las rutas'));
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar esta ruta? Se perderán sus submódulos asociados.')) return;
    try {
      await deleteRoute(id);
      toast.success('Ruta eliminada correctamente');
      loadInitialData();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al eliminar la ruta'));
    }
  };

  const handleCreateNew = () => {
    setRouteToEdit(null);
    setCurrentView('form');
  };

  const handleEdit = (route: LearningRoute) => {
    setRouteToEdit(route);
    setCurrentView('form');
  };

  const handleFormClose = (wasSaved: boolean) => {
    setCurrentView('list');
    setRouteToEdit(null);
    if (wasSaved) {
      loadInitialData();
    }
  };

  const groupedRoutes = routes.reduce<Record<string, LearningRoute[]>>((acc, route) => {
    const category = route.category || 'Sin Clasificar';
    (acc[category] ??= []).push(route);
    return acc;
  }, {});

  if (currentView === 'form') {
    return (
      <RouteBuilder 
        initialData={routeToEdit} 
        onCancel={() => handleFormClose(false)} 
        onSaveSuccess={() => handleFormClose(true)} 
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-surface-900 dark:text-white">Gestión de Rutas de Aprendizaje</h1>
            <p className="text-surface-500 dark:text-surface-400 mt-2">Administra, edita o elimina las rutas categorizadas por ejes de conocimiento.</p>
          </div>
          <button 
            onClick={handleCreateNew}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl shadow-md shadow-brand-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 text-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            Crear Nueva Ruta
          </button>
        </div>

        {fetching ? (
          <p className="text-surface-500 dark:text-surface-400 text-center py-8">Cargando rutas...</p>
        ) : routes.length === 0 ? (
          <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-8 text-center shadow-sm">
            <p className="text-surface-500 dark:text-surface-400 text-lg">No hay rutas estructuradas aún.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedRoutes).map(([category, categoryRoutes]) => (
              <div key={category} className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-display font-semibold text-surface-900 dark:text-white mb-6 border-b border-surface-200 dark:border-surface-800 pb-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-brand-500"></span>
                  {category}
                  <span className="text-sm font-normal text-surface-500 dark:text-surface-400 ml-2">({categoryRoutes.length})</span>
                </h2>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-surface-200 dark:border-surface-800">
                        <th className="py-3 px-4 font-semibold text-surface-500 dark:text-surface-400">Título de la Ruta</th>
                        <th className="py-3 px-4 font-semibold text-surface-500 dark:text-surface-400">Dificultad</th>
                        <th className="py-3 px-4 font-semibold text-surface-500 dark:text-surface-400">Tiempo</th>
                        <th className="py-3 px-4 font-semibold text-surface-500 dark:text-surface-400">Evaluación IA</th>
                        <th className="py-3 px-4 font-semibold text-surface-500 dark:text-surface-400 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryRoutes.map((route) => (
                        <tr key={route.id} className="border-b border-surface-200/50 dark:border-surface-800/50 hover:bg-surface-100 dark:hover:bg-surface-800/50 transition-colors">
                          <td className="py-4 px-4 font-medium text-surface-900 dark:text-white">{route.title}</td>
                          <td className="py-4 px-4">
                            <span className="bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 px-2 py-1 rounded-lg text-xs font-semibold">
                              {route.difficulty}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-surface-500 dark:text-surface-400 text-sm">
                            {route.estimatedTime} min
                          </td>
                          <td className="py-4 px-4">
                            {route.evaluationRules ? (
                              <span className="text-brand-600 dark:text-brand-400 flex items-center gap-1 text-sm font-medium">Sí</span>
                            ) : (
                              <span className="text-surface-500 dark:text-surface-400 text-sm">No</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEdit(route)}
                                aria-label="Editar ruta"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 hover:bg-brand-100 dark:hover:bg-brand-900/40 border border-brand-200/60 dark:border-brand-800/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                Editar
                              </button>
                              <button
                                onClick={() => handleDelete(route.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200/60 dark:border-rose-800/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
  );
};

export default RoutesManager;