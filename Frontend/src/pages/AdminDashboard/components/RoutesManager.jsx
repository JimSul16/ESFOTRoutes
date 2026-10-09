import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getRoutes, deleteRoute } from '../../../api/route.api';
import RouteBuilder from './RouteBuilder';

const RoutesManager = () => {
  const [routes, setRoutes] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [currentView, setCurrentView] = useState('list');
  const [routeToEdit, setRouteToEdit] = useState(null);

  const loadInitialData = async () => {
    setFetching(true);
    try {
      const routesData = await getRoutes();
      setRoutes(routesData);
    } catch (error) {
      toast.error('Error al cargar las rutas');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta ruta? Se perderán sus submódulos asociados.')) return;
    try {
      await deleteRoute(id);
      toast.success('Ruta eliminada correctamente');
      loadInitialData();
    } catch (error) {
      toast.error('Error al eliminar la ruta');
    }
  };

  const handleCreateNew = () => {
    setRouteToEdit(null);
    setCurrentView('form');
  };

  const handleEdit = (route) => {
    setRouteToEdit(route);
    setCurrentView('form');
  };

  const handleFormClose = (wasSaved) => {
    setCurrentView('list');
    setRouteToEdit(null);
    if (wasSaved) {
      loadInitialData();
    }
  };

  const groupedRoutes = routes.reduce((acc, route) => {
    const category = route.category || 'Sin Clasificar';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(route);
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
    <div className="min-h-screen bg-[#0f172a] text-gray-200 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Gestión de Rutas de Aprendizaje</h1>
            <p className="text-gray-400 mt-2">Administra, edita o elimina las rutas categorizadas por ejes de conocimiento.</p>
          </div>
          <button 
            onClick={handleCreateNew}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            Crear Nueva Ruta
          </button>
        </div>

        {fetching ? (
          <p className="text-gray-400 text-center py-8">Cargando rutas...</p>
        ) : routes.length === 0 ? (
          <div className="bg-[#1e2333] border border-gray-800 rounded-xl p-8 text-center shadow-lg">
            <p className="text-gray-400 text-lg">No hay rutas estructuradas aún.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedRoutes).map(([category, categoryRoutes]) => (
              <div key={category} className="bg-[#1e2333] border border-gray-800 rounded-xl p-6 shadow-lg">
                <h2 className="text-xl font-semibold text-white mb-6 border-b border-gray-700 pb-3 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  {category}
                  <span className="text-sm font-normal text-gray-500 ml-2">({categoryRoutes.length})</span>
                </h2>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="py-3 px-4 font-semibold text-gray-400">Título de la Ruta</th>
                        <th className="py-3 px-4 font-semibold text-gray-400">Dificultad</th>
                        <th className="py-3 px-4 font-semibold text-gray-400">Tiempo</th>
                        <th className="py-3 px-4 font-semibold text-gray-400">IA Activa</th>
                        <th className="py-3 px-4 font-semibold text-gray-400 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryRoutes.map((route) => (
                        <tr key={route.id} className="border-b border-gray-800/50 hover:bg-[#252b3e] transition-colors">
                          <td className="py-4 px-4 font-medium text-white">{route.title}</td>
                          <td className="py-4 px-4">
                            <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded text-xs font-semibold">
                              {route.difficulty}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-gray-400 text-sm">
                            {route.estimatedTime} min
                          </td>
                          <td className="py-4 px-4">
                            {route.evaluationRules ? (
                              <span className="text-blue-400 flex items-center gap-1 text-sm">🤖 Sí</span>
                            ) : (
                              <span className="text-gray-500 text-sm">No</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right space-x-4">
                            <button
                              onClick={() => handleEdit(route)}
                              className="text-blue-500 hover:text-blue-400 font-medium"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(route.id)}
                              className="text-red-500 hover:text-red-400 font-medium"
                            >
                              Eliminar
                            </button>
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
    </div>
  );
};

export default RoutesManager;