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
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-surface-900 dark:text-white">Gestión de Recursos</h1>
            <p className="text-surface-500 dark:text-surface-400 mt-2">Catálogo centralizado de materiales y archivos para tus rutas.</p>
          </div>
          <button 
            onClick={handleCreateNew}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-xl shadow-md shadow-brand-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 text-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            Agregar Nuevo Recurso
          </button>
        </div>

        <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-6 md:p-8 shadow-sm">
          <h2 className="text-lg font-display font-semibold text-surface-900 dark:text-white mb-6">Recursos Disponibles</h2>
          
          {fetching ? (
            <p className="text-surface-500 dark:text-surface-400 text-center py-4">Cargando catálogo...</p>
          ) : resources.length === 0 ? (
            <p className="text-surface-500 dark:text-surface-400 text-center py-4">No hay recursos guardados aún.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-800">
                    <th className="py-4 px-4 font-semibold text-surface-500 dark:text-surface-400">Título</th>
                    <th className="py-4 px-4 font-semibold text-surface-500 dark:text-surface-400">Tipo</th>
                    <th className="py-4 px-4 font-semibold text-surface-500 dark:text-surface-400">Enlace / Archivo</th>
                    <th className="py-4 px-4 font-semibold text-surface-500 dark:text-surface-400 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {resources.map((resource) => (
                    <tr key={resource.id} className="border-b border-surface-200/50 dark:border-surface-800/50 hover:bg-surface-100 dark:hover:bg-surface-800/50 transition-colors">
                      <td className="py-4 px-4 font-medium text-surface-900 dark:text-white max-w-[200px] truncate" title={resource.title}>
                        {resource.title}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          resource.type === 'VIDEO' ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border-brand-200/60 dark:border-brand-800/60' :
                          resource.type === 'PDF' ? 'bg-accent-50 text-accent-700 dark:bg-accent-950/60 dark:text-accent-300 border-accent-200/60 dark:border-accent-800/60' :
                          resource.type === 'IMAGE' ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/60' :
                          'bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300 border-primary-200/60 dark:border-primary-800/60'
                        }`}>
                          {resource.type}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-brand-600 dark:text-brand-400 text-sm">
                        <a href={sanitizeUrl(resource.url)} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1 w-max font-medium">
                          Ver Recurso
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                        </a>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(resource)}
                            aria-label="Editar recurso"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 hover:bg-brand-100 dark:hover:bg-brand-900/40 border border-brand-200/60 dark:border-brand-800/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(resource.id)}
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
          )}
        </div>

      </div>
  );
};

export default ResourcesManager;