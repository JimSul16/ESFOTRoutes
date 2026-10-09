import { useState } from 'react';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createResource, uploadFile } from '../../../api/resource.api';

const resourceSchema = z.object({
  title: z.string().min(3, "El título debe tener al menos 3 caracteres"),
  description: z.string().optional(),
  type: z.enum(['LINK', 'VIDEO', 'PDF', 'IMAGE']),
  url: z.string().optional()
});

const ResourceBuilder = ({ initialData, onCancel, onSaveSuccess }) => {
  const isEditing = !!initialData;
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      type: initialData?.type || 'LINK',
      url: initialData?.url || ''
    }
  });

  const selectedType = watch('type');
  const currentUrl = watch('url');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const maxSizeBytes = 5 * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        toast.error('El archivo es demasiado pesado. El límite máximo es de 5MB.');
        e.target.value = '';
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
    }
  };

  const onSubmit = async (dataForm) => {
    setLoading(true);
    try {
      let finalUrl = dataForm.url;

      if ((dataForm.type === 'PDF' || dataForm.type === 'IMAGE') && selectedFile) {
        toast.info('Subiendo archivo a la nube...', { autoClose: 2000 });
        finalUrl = await uploadFile(selectedFile);
      }

      if (!finalUrl && !isEditing) {
        setLoading(false);
        return toast.warning('Debes proporcionar un enlace o subir un archivo');
      }

      const resourcePayload = {
        title: dataForm.title,
        description: dataForm.description || '',
        type: dataForm.type,
        url: finalUrl
      };

      if (isEditing) {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/api/resources/${initialData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(resourcePayload)
        });
        if (!response.ok) throw new Error('Error al actualizar');
      } else {
        await createResource(resourcePayload);
      }

      toast.success(isEditing ? 'Recurso actualizado exitosamente' : 'Recurso guardado exitosamente');
      onSaveSuccess();
      
    } catch (error) {
      toast.error('Error al guardar el recurso. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-gray-200 p-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              {isEditing ? 'Editar Recurso' : 'Nuevo Recurso'}
            </h1>
          </div>
          <button 
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-600 text-gray-300 hover:bg-gray-800 rounded-lg font-medium transition-colors"
          >
            Volver
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-[#1e2333] p-8 rounded-2xl border border-gray-800 shadow-xl relative overflow-hidden space-y-6">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
          
          <div>
            <label className="block text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Título</label>
            <input
              type="text"
              className={`w-full bg-[#0f172a] border ${errors.title ? 'border-red-500' : 'border-gray-700'} rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors`}
              {...register('title')}
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Tipo</label>
              <select
                className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                {...register('type', {
                  onChange: () => setValue('url', '') 
                })}
              >
                <option value="LINK">Link</option>
                <option value="VIDEO">Video</option>
                <option value="PDF">PDF</option>
                <option value="IMAGE">Imagen</option>
              </select>
            </div>

            {selectedType === 'LINK' || selectedType === 'VIDEO' ? (
              <div>
                <label className="block text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">URL Pública</label>
                <input
                  type="url"
                  className={`w-full bg-[#0f172a] border ${errors.url ? 'border-red-500' : 'border-gray-700'} rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors font-mono text-sm`}
                  placeholder="https://"
                  {...register('url')}
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Subir Archivo (Máx 5MB)</label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept={selectedType === 'PDF' ? '.pdf' : 'image/*'}
                  className="w-full text-white file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer text-sm"
                />
                {isEditing && currentUrl && !selectedFile && (
                  <p className="text-xs text-emerald-500 mt-2">Ya existe un archivo guardado.</p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">Descripción</label>
            <textarea
              className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors h-24 resize-none"
              {...register('description')}
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-xl font-bold transition-all text-lg ${
              loading ? 'bg-blue-800 text-gray-300 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-900/20'
            }`}
          >
            {loading ? 'Guardando...' : 'Guardar en Catálogo'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResourceBuilder;