import { useState, type ChangeEvent } from 'react';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createResource, updateResource } from '../../../api/resource.api';
import { uploadFile } from '../../../api/upload.api';
import { getApiErrorMessage } from '../../../api/errors';
import type { Resource } from '../../../types';

const resourceSchema = z.object({
  title: z.string().min(3, "El título debe tener al menos 3 caracteres"),
  description: z.string().optional(),
  type: z.enum(['LINK', 'VIDEO', 'PDF', 'IMAGE']),
  url: z.string().optional()
});

export interface ResourceBuilderProps {
  initialData: Resource | null;
  onCancel: () => void;
  onSaveSuccess: () => void;
}

type ResourceFormValues = z.infer<typeof resourceSchema>;

const ResourceBuilder = ({ initialData, onCancel, onSaveSuccess }: ResourceBuilderProps) => {
  const isEditing = !!initialData;
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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

  const onSubmit = async (dataForm: ResourceFormValues) => {
    setLoading(true);
    try {
      let finalUrl = dataForm.url;

      if ((dataForm.type === 'PDF' || dataForm.type === 'IMAGE') && selectedFile) {
        toast.info('Subiendo archivo a la nube...', { autoClose: 2000 });
        // `uploadFile` devuelve `{ message, url }`: había que extraer `.url`,
        // si no el recurso se guardaba con un objeto como enlace.
        finalUrl = (await uploadFile(selectedFile)).url;
      }

      if (!finalUrl && !isEditing) {
        setLoading(false);
        return toast.warning('Debes proporcionar un enlace o subir un archivo');
      }

      const resourcePayload = {
        title: dataForm.title,
        description: dataForm.description ?? '',
        type: dataForm.type,
        url: finalUrl ?? '',
      };

      if (isEditing && initialData) {
        // Antes: `fetch()` a `${apiUrl}/api/resources/${id}`, que generaba
        // `/api/api/resources/...` y devolvía 404 al editar.
        await updateResource(initialData.id, resourcePayload);
      } else {
        await createResource(resourcePayload);
      }

      toast.success(isEditing ? 'Recurso actualizado exitosamente' : 'Recurso guardado exitosamente');
      onSaveSuccess();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al guardar el recurso. Verifica tu conexión.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-surface-900 dark:text-white">
              {isEditing ? 'Editar Recurso' : 'Nuevo Recurso'}
            </h1>
          </div>
          <button 
            type="button"
            onClick={onCancel}
            className="px-5 py-2 border border-surface-300 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl font-medium transition-colors text-sm"
          >
            Volver
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-surface-900 p-6 md:p-8 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm relative overflow-hidden space-y-6">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500"></div>
          
          <div>
            <label className="block text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-2">Título</label>
            <input
              type="text"
              className={`w-full bg-surface-50 dark:bg-surface-800 border ${errors.title ? 'border-red-500' : 'border-surface-200 dark:border-surface-700'} rounded-xl px-4 py-2.5 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm`}
              {...register('title')}
            />
            {errors.title && <p className="text-rose-500 dark:text-rose-400 text-xs mt-1.5 font-medium">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-2">Tipo</label>
              <select
                className="w-full bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl px-4 py-2.5 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
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
                <label className="block text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-2">URL Pública</label>
                <input
                  type="url"
                  className={`w-full bg-surface-50 dark:bg-surface-800 border ${errors.url ? 'border-red-500' : 'border-surface-200 dark:border-surface-700'} rounded-xl px-4 py-2.5 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-mono text-sm`}
                  placeholder="https://"
                  {...register('url')}
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-2">Subir Archivo (Máx 5MB)</label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept={selectedType === 'PDF' ? '.pdf' : 'image/*'}
                  className="w-full text-surface-600 dark:text-surface-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-600 file:text-white hover:file:bg-brand-500 cursor-pointer text-sm"
                />
                {isEditing && currentUrl && !selectedFile && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5 font-medium">Ya existe un archivo guardado.</p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-2">Descripción</label>
            <textarea
              className="w-full bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl px-4 py-2.5 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all h-24 resize-none text-sm"
              {...register('description')}
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl font-semibold transition-all text-base ${
              loading ? 'bg-surface-200 text-surface-500 cursor-not-allowed' : 'bg-brand-600 text-white hover:bg-brand-500 shadow-md shadow-brand-600/20 hover:scale-[1.01] active:scale-[0.99]'
            }`}
          >
            {loading ? 'Guardando...' : 'Guardar en Catálogo'}
          </button>
        </form>
      </div>
  );
};

export default ResourceBuilder;