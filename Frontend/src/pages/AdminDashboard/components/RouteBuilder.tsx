import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getResources } from '../../../api/resource.api';
import { createRoute, updateRoute } from '../../../api/route.api';
import { uploadCoverImage } from '../../../api/upload.api';
import { getApiErrorMessage } from '../../../api/errors';
import type { LearningRoute, Resource, RouteModuleInput } from '../../../types';

const routeSchema = z.object({
  title: z.string().min(5, "El título debe tener al menos 5 caracteres"),
  description: z.string().min(10, "Añade una descripción más detallada"),
  category: z.string().min(1, "Selecciona o escribe una categoría"),
  estimatedTime: z.coerce.number().min(1, "El tiempo es obligatorio"),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ADAPTIVE']),
  evaluationRules: z.string().optional()
});

const MAX_COVER_SIZE = 5 * 1024 * 1024; // 5 MB

/** Extensiones aceptadas como respaldo cuando el navegador no informa el MIME. */
const COVER_EXTENSIONS = /\.(png|jpe?g|gif|webp|bmp|svg)$/i;

/**
 * El atributo `accept="image/*"` solo orienta al explorador de archivos: el
 * usuario todavía puede elegir "Todos los archivos" o arrastrar el archivo.
 * Por eso el tipo real se valida aquí antes de subirlo al backend.
 */
const isImageFile = (file: File): boolean => {
  if (file.type) return file.type.startsWith('image/');
  return COVER_EXTENSIONS.test(file.name);
};

export interface RouteBuilderProps {
  initialData: LearningRoute | null;
  onCancel: () => void;
  onSaveSuccess: () => void;
}

type RouteFormValues = z.output<typeof routeSchema>;
type RouteFormInput = z.input<typeof routeSchema>;

/** Módulo en edición. `id` solo se conserva para reorderar visualmente. */
interface DraftModule extends Omit<RouteModuleInput, 'description' | 'resourceIds'> {
  id?: string;
  description: string;
  resourceIds: string[];
}

const RouteBuilder = ({ initialData, onCancel, onSaveSuccess }: RouteBuilderProps) => {
  const isEditing = !!initialData;
  const [loading, setLoading] = useState(false);
  const [availableResources, setAvailableResources] = useState<Resource[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(initialData?.imageUrl ?? null);
  /** URL blob de la vista previa, para poder revocarla y no filtrar memoria. */
  const coverPreviewRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (coverPreviewRef.current) URL.revokeObjectURL(coverPreviewRef.current);
    };
  }, []);

  const handleCoverChange = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    // 1) Tipo de archivo: solo imágenes.
    if (!isImageFile(file)) {
      toast.error('La portada debe ser una imagen (PNG, JPG, WEBP o GIF).');
      input.value = '';
      return;
    }

    // 2) Tamaño máximo.
    if (file.size > MAX_COVER_SIZE) {
      toast.error('La portada no puede superar los 5 MB.');
      input.value = '';
      return;
    }

    if (coverPreviewRef.current) {
      URL.revokeObjectURL(coverPreviewRef.current);
    }
    const previewUrl = URL.createObjectURL(file);
    coverPreviewRef.current = previewUrl;

    setCoverFile(file);
    setCoverPreview(previewUrl);
  };
  const [loadingResources, setLoadingResources] = useState(true);

  const [modules, setModules] = useState<DraftModule[]>(
    initialData?.modules?.map((mod) => ({
      id: mod.id,
      title: mod.title,
      description: mod.description || '',
      // `buildFullRoute` hace JOIN con Resource, así que cada elemento ya
      // es la fila completa del recurso y su `id` es el resourceId.
      resourceIds: mod.resources?.map((r) => r.id) ?? []
    })) || []
  );

  const predefinedCategories = [
    "Ingeniería de Software",
    "Datos e Información",
    "Infraestructura y Redes",
    "Gestión y Proyectos de TI",
    "Sistemas y Arquitectura",
    "Fundamentos y Lógica"
  ];

  // El formulario entrega `estimatedTime` como string (viene de un <input>), pero
// el esquema usa `z.coerce.number()`: `z.input` es lo que hay antes de validar
// y `z.output`, lo que recibe `onSubmit` ya convertido a número.
const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<
  RouteFormInput,
  unknown,
  RouteFormValues
>({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      title: initialData?.title ?? '',
      description: initialData?.description ?? '',
      category: initialData?.category ?? '',
      estimatedTime: initialData?.estimatedTime ?? 0,
      difficulty: initialData?.difficulty ?? 'BEGINNER',
      evaluationRules: initialData?.evaluationRules ?? ''
    }
  });

  const selectedCategory = watch('category');

  useEffect(() => {
    const fetchResources = async () => {
      try {
        const resourcesData = await getResources();
        setAvailableResources(resourcesData);
      } catch (error) {
        toast.error('No se pudieron cargar los recursos disponibles');
      } finally {
        setLoadingResources(false);
      }
    };
    fetchResources();
  }, []);

  const addModule = () => {
    setModules([...modules, { title: '', description: '', resourceIds: [] }]);
  };

  const updateModule = <K extends keyof DraftModule>(
    index: number,
    field: K,
    value: DraftModule[K]
  ) => {
    setModules((prev) => prev.map((mod, i) => (i === index ? { ...mod, [field]: value } : mod)));
  };

  const removeModule = (index: number) => {
    setModules((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleResource = (moduleIndex: number, resourceId: string) => {
    const currentIds = modules[moduleIndex]?.resourceIds ?? [];
    const next = currentIds.includes(resourceId)
      ? currentIds.filter((id) => id !== resourceId)
      : [...currentIds, resourceId];

    updateModule(moduleIndex, 'resourceIds', next);
  };

  const onSubmit = async (dataForm: RouteFormValues) => {
    if (modules.length === 0) {
      return toast.warning('Debes añadir al menos un curso (submódulo) a la ruta.');
    }

    setLoading(true);
    try {
      // La portada se sube aparte (POST /upload/subir-portada) y se devuelve la
      // URL para meterla en `imageUrl` al crear o actualizar la ruta.
      let imageUrl: string | null = initialData?.imageUrl ?? null;
      if (coverFile) {
        imageUrl = await uploadCoverImage(coverFile).then((res) => res.url_imagen);
      }

      const finalPayload = { ...dataForm, imageUrl, modules };

      if (isEditing && initialData) {
        // Antes: `fetch()` a `${apiUrl}/api/routes/${id}`, que generaba
        // `/api/api/routes/...` y devolvía 404 al editar.
        await updateRoute(initialData.id, finalPayload);
      } else {
        await createRoute(finalPayload);
      }

      toast.success(isEditing ? 'Ruta actualizada exitosamente' : 'Ruta creada exitosamente');
      onSaveSuccess();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Hubo un problema al guardar la ruta'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-surface-900 dark:text-white tracking-tight">
              {isEditing ? 'Editar Ruta de Aprendizaje' : 'Diseño de Rutas de Aprendizaje'}
            </h1>
            <p className="text-surface-500 dark:text-surface-400 mt-2 text-base">
              {isEditing ? 'Modifica los detalles, cursos o recursos asignados.' : 'Estructura el aprendizaje organizado por Escuelas, Rutas y Cursos.'}
            </p>
          </div>
          <button 
            type="button" 
            onClick={onCancel}
            className="px-5 py-2 border border-surface-300 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl font-medium transition-colors text-sm"
          >
            Volver al Listado
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          
          <div className="bg-white dark:bg-surface-900 p-6 md:p-8 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500"></div>
            <h2 className="text-lg font-display font-semibold text-surface-900 dark:text-white mb-6 flex items-center gap-2">
              <span className="bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold">1</span>
              Eje de Conocimiento (Clasificación)
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {predefinedCategories.map((cat, idx) => (
                <label 
                  key={idx} 
                  className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${selectedCategory === cat ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/60 ring-1 ring-brand-500' : 'border-surface-200 dark:border-surface-700 hover:border-brand-400 bg-surface-50 dark:bg-surface-800'}`}
                >
                  <input 
                    type="radio" 
                    value={cat} 
                    {...register('category')}
                    className="hidden"
                  />
                  <span className={`font-semibold text-sm ${selectedCategory === cat ? 'text-brand-600 dark:text-brand-400' : 'text-surface-700 dark:text-surface-300'}`}>
                    {cat}
                  </span>
                </label>
              ))}
              
              <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${!predefinedCategories.includes(selectedCategory) && selectedCategory !== '' ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/60 ring-1 ring-brand-500' : 'border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800'}`}>
                <input 
                  type="radio" 
                  value="custom"
                  checked={!predefinedCategories.includes(selectedCategory) && selectedCategory !== ''}
                  onChange={() => setValue('category', 'Nueva Categoría')}
                  className="hidden"
                />
                <input 
                  type="text"
                  placeholder="Otra clasificación..."
                  value={!predefinedCategories.includes(selectedCategory) ? selectedCategory : ''}
                  onChange={(e) => setValue('category', e.target.value)}
                  className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-semibold text-surface-700 dark:text-surface-300 placeholder-surface-400 outline-none"
                  onClick={() => {
                    if(predefinedCategories.includes(selectedCategory)) {
                      setValue('category', '');
                    }
                  }}
                />
              </label>
            </div>
            {errors.category && <p className="text-rose-500 dark:text-rose-400 text-xs mt-1.5 font-medium">{errors.category.message}</p>}
          </div>

          <div className="bg-white dark:bg-surface-900 p-6 md:p-8 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
            <h2 className="text-lg font-display font-semibold text-surface-900 dark:text-white mb-6 flex items-center gap-2">
              <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold">2</span>
              Materia / Detalles de la Ruta
            </h2>

            <div className="space-y-6">
              <div>
                <label className="text-sm font-semibold text-surface-600 dark:text-surface-400 block mb-2">Título de la Ruta (Materia)</label>
                <input 
                  type="text" 
                  placeholder="Ej: Programación Orientada a Objetos"
                  className={`w-full bg-surface-50 dark:bg-surface-800 border ${errors.title ? 'border-red-500' : 'border-surface-200 dark:border-surface-700'} rounded-xl px-4 py-2.5 text-surface-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all text-sm`}
                  {...register('title')}
                />
                {errors.title && <p className="text-rose-500 dark:text-rose-400 text-xs mt-1.5 font-medium">{errors.title.message}</p>}
              </div>

              {/* Portada de la ruta (POST /upload/subir-portada). El campo del
                  FormData es `portada`, no `file` (ver upload.routes.js). */}
              <div>
                <label className="text-sm font-semibold text-surface-600 dark:text-surface-400 block mb-2">Portada de la ruta</label>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-20 rounded-xl overflow-hidden bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 flex items-center justify-center">
                    {coverPreview ? (
                      <img src={coverPreview} alt="Portada" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-surface-500 dark:text-surface-400">Sin portada</span>
                    )}
                  </div>

                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverChange}
                      className="block w-full text-sm text-surface-500 dark:text-surface-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-surface-100 dark:file:bg-surface-800 file:text-surface-700 dark:file:text-surface-200 hover:file:bg-surface-200 dark:hover:file:bg-surface-700 cursor-pointer"
                    />
                    <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                      Solo imágenes (PNG, JPG, WEBP, GIF), hasta 5 MB.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-semibold text-surface-600 dark:text-surface-400 block mb-2">Tiempo estimado (Minutos)</label>
                  <input 
                    type="number" 
                    placeholder="Ej: 144"
                    className={`w-full bg-surface-50 dark:bg-surface-800 border ${errors.estimatedTime ? 'border-red-500' : 'border-surface-200 dark:border-surface-700'} rounded-xl px-4 py-2.5 text-surface-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all text-sm`}
                    {...register('estimatedTime')}
                  />
                  {errors.estimatedTime && <p className="text-rose-500 dark:text-rose-400 text-xs mt-1.5 font-medium">{errors.estimatedTime.message}</p>}
                </div>
                <div>
                  <label className="text-sm font-semibold text-surface-600 dark:text-surface-400 block mb-2">Nivel de Dificultad</label>
                  <select
                    className="w-full bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl px-4 py-2.5 text-surface-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all text-sm"
                    {...register('difficulty')}
                  >
                    <option value="BEGINNER">Principiante (Ej. Semestre 2)</option>
                    <option value="INTERMEDIATE">Intermedio (Ej. Semestre 3-4)</option>
                    <option value="ADVANCED">Avanzado (Ej. Semestre 5)</option>
                    <option value="ADAPTIVE">Adaptativa (Grafo Pedagógico)</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-semibold text-surface-600 dark:text-surface-400 block mb-2">Descripción General</label>
                <textarea 
                  className={`w-full bg-surface-50 dark:bg-surface-800 border ${errors.description ? 'border-red-500' : 'border-surface-200 dark:border-surface-700'} rounded-xl px-4 py-2.5 text-surface-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all h-24 resize-none text-sm`}
                  {...register('description')}
                />
                {errors.description && <p className="text-rose-500 dark:text-rose-400 text-xs mt-1.5 font-medium">{errors.description.message}</p>}
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/30 p-5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40">
                <label className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-2">
                  <span className="text-xl">🤖</span> Directrices para la IA (System Prompt)
                </label>
                <p className="text-xs text-surface-500 dark:text-surface-400 mb-3">
                  Define cómo debe comportarse el chatbot de Gemini al evaluar esta ruta específica.
                </p>
                <textarea 
                  placeholder="Ej: Actúa como un profesor estricto de la EPN..."
                  className="w-full bg-white dark:bg-surface-800 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl px-4 py-2.5 text-surface-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all h-28 resize-none text-sm"
                  {...register('evaluationRules')}
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-surface-900 p-6 md:p-8 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent-500"></div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <div>
                <h2 className="text-lg font-display font-semibold text-surface-900 dark:text-white flex items-center gap-2">
                  <span className="bg-accent-50 dark:bg-accent-950/60 text-accent-600 dark:text-accent-400 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold">3</span>
                  Cursos de la Ruta (Submódulos)
                </h2>
                <p className="text-sm text-surface-500 dark:text-surface-400 mt-1 sm:ml-10">Crea los submódulos y asígnales los recursos existentes.</p>
              </div>
              <button 
                type="button" 
                onClick={addModule}
                className="px-4 py-2 bg-accent-50 dark:bg-accent-950/60 text-accent-700 dark:text-accent-400 hover:bg-accent-100 dark:hover:bg-accent-900/40 border border-accent-200/60 dark:border-accent-800/60 rounded-xl text-sm font-semibold transition-colors"
              >
                + Añadir Curso
              </button>
            </div>

            <div className="space-y-4">
              {modules.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-surface-300 dark:border-surface-700 rounded-xl">
                  <p className="text-surface-500 dark:text-surface-400 text-sm">Aún no has agregado cursos a esta ruta.</p>
                </div>
              )}

              {modules.map((mod, index) => (
                <div key={index} className="bg-surface-50 dark:bg-surface-800 p-5 rounded-xl border border-surface-200 dark:border-surface-700 relative group flex gap-4">
                  
                  <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 bg-white dark:bg-surface-900 rounded-lg border border-surface-200 dark:border-surface-700 text-surface-500 dark:text-surface-400 font-bold">
                    {index + 1}
                  </div>

                  <div className="flex-grow space-y-4">
                    <input 
                      type="text" 
                      placeholder="Nombre del Curso (Ej: Conceptos básicos de Redes)"
                      value={mod.title}
                      onChange={(e) => updateModule(index, 'title', e.target.value)}
                      className="w-full bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg px-4 py-2.5 text-surface-900 dark:text-white focus:outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 text-sm font-semibold"
                      required
                    />
                    
                    <textarea 
                      placeholder="Breve descripción del curso..."
                      value={mod.description}
                      onChange={(e) => updateModule(index, 'description', e.target.value)}
                      className="w-full bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg px-4 py-2 text-surface-900 dark:text-white focus:outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 text-sm h-12 resize-none"
                    />
                    
                    <div className="mt-4 border-t border-surface-200 dark:border-surface-700 pt-4">
                      <label className="text-xs font-semibold text-surface-500 dark:text-surface-400 block mb-3 uppercase tracking-wider">
                        Catálogo de Recursos (Selecciona para añadir)
                      </label>
                      
                      {loadingResources ? (
                        <div className="text-sm text-surface-500 dark:text-surface-400 italic">Cargando recursos...</div>
                      ) : availableResources.length === 0 ? (
                        <div className="bg-accent-50 dark:bg-accent-950/60 text-accent-700 dark:text-accent-400 p-3 rounded-lg text-sm border border-accent-200/60 dark:border-accent-800/60">
                          No hay recursos disponibles. Sube recursos primero.
                        </div>
                      ) : (
                        <div className="max-h-40 overflow-y-auto bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg p-2 space-y-1 custom-scrollbar">
                          {availableResources.map((res) => (
                            <label key={res.id} className="flex items-center gap-3 p-2 hover:bg-surface-100 dark:hover:bg-surface-800/50 rounded-md cursor-pointer transition-colors">
                              <input 
                                type="checkbox"
                                checked={(mod.resourceIds ?? []).includes(res.id)}
                                onChange={() => toggleResource(index, res.id)}
                                className="w-4 h-4 text-accent-500 bg-white dark:bg-surface-900 border-surface-300 dark:border-surface-600 focus:ring-accent-500 rounded"
                              />
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-surface-700 dark:text-surface-300 line-clamp-1">{res.title}</span>
                                <span className="text-[10px] text-surface-500 dark:text-surface-400 uppercase">{res.type}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <button 
                    type="button" 
                    aria-label="Eliminar módulo"
                    onClick={() => removeModule(index)}
                    className="flex-shrink-0 self-start text-surface-500 hover:text-rose-500 bg-white dark:bg-surface-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-2 rounded-lg transition-colors border border-surface-200 dark:border-surface-700 hover:border-rose-500/30"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button 
              type="submit"
              disabled={loading}
              className={`px-6 py-3 font-semibold rounded-xl transition-all text-base ${
                loading ? 'bg-surface-200 text-surface-500 cursor-not-allowed' : 'bg-brand-600 text-white hover:bg-brand-500 shadow-md shadow-brand-600/20 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {loading ? 'Procesando...' : (isEditing ? 'Guardar Cambios' : 'Ensamblar y Guardar Ruta')}
            </button>
          </div>
        </form>
      </div>
  );
};

export default RouteBuilder;  