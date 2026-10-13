import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getResources, deleteResource } from '../../../api/resource.api';
import { getApiErrorMessage } from '../../../api/errors';
import ResourceBuilder from './ResourceBuilder';
import type { Resource } from '../../../types';

const sanitizeUrl = (url: string) => {
  if (!url) return '#';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return '#';
};

const ResourcesManager = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [fetching, setFetching] = useState(true);
  const [currentView, setCurrentView] = useState<'list' | 'form'>('list');
  const [resourceToEdit, setResourceToEdit] = useState<Resource | null>(null);

  const loadResources = async () => {
    setFetching(true);
    try {
      const data = await getResources();
      setResources(data);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al cargar los recursos'));
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este recurso?')) return;
    try {
      await deleteResource(id);
      toast.success('Recurso eliminado exitosamente');
      loadResources();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al eliminar el recurso'));
    }
  };

  const handleCreateNew = () => {
    setResourceToEdit(null);
    setCurrentView('form');
  };

  const handleEdit = (resource: Resource) => {
    setResourceToEdit(resource);
    setCurrentView('form');
  };

  const handleFormClose = (wasSaved: boolean) => {
    setCurrentView('list');
    setResourceToEdit(null);
    if (wasSaved) {
      loadResources();
    }
  };

  if (currentView === 'form') {
    return (
      <ResourceBuilder 
        initialData={resourceToEdit} 
        onCancel={() => handleFormClose(false)} 
        onSaveSuccess={() => handleFormClose(true)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-gray-200 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Gestión de Recursos</h1>
            <p className="text-gray-400 mt-2">Catálogo centralizado de materiales y archivos para tus rutas.</p>
          </div>
          <button 
            onClick={handleCreateNew}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg shadow-blue-900/20 transition-transform hover:scale-105 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            Agregar Nuevo Recurso
          </button>
        </div>

        <div className="bg-[#1e2333] border border-gray-800 rounded-xl p-8 shadow-lg">
          <h2 className="text-xl font-semibold text-white mb-6">Recursos Disponibles</h2>
          
          {fetching ? (
            <p className="text-gray-400 text-center py-4">Cargando catálogo...</p>
          ) : resources.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No hay recursos guardados aún.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="py-4 px-4 font-semibold text-gray-400">Título</th>
                    <th className="py-4 px-4 font-semibold text-gray-400">Tipo</th>
                    <th className="py-4 px-4 font-semibold text-gray-400">Enlace / Archivo</th>
                    <th className="py-4 px-4 font-semibold text-gray-400 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {resources.map((resource) => (
                    <tr key={resource.id} className="border-b border-gray-800/50 hover:bg-[#252b3e] transition-colors">
                      <td className="py-4 px-4 font-medium text-white max-w-[200px] truncate" title={resource.title}>
                        {resource.title}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded text-xs font-bold tracking-wider ${
                          resource.type === 'VIDEO' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          resource.type === 'PDF' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                          resource.type === 'IMAGE' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                          'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {resource.type}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-blue-400 text-sm">
                        <a href={sanitizeUrl(resource.url)} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1 w-max">
                          Ver Recurso
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                        </a>
                      </td>
                      <td className="py-4 px-4 text-right space-x-3">
                        <button
                          onClick={() => handleEdit(resource)}
                          className="text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 px-3 py-1 rounded transition-colors font-medium"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(resource.id)}
                          className="text-red-500 hover:text-red-400 hover:bg-red-500/10 px-3 py-1 rounded transition-colors font-medium"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ResourcesManager;