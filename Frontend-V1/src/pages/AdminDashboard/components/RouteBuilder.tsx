import { useState, useEffect, type ChangeEvent } from 'react';
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

  const handleCoverChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La portada no puede superar los 5 MB.');
      e.target.value = '';
      return;
    }

    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
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
    <div className="min-h-screen bg-[#0f172a] text-gray-200 p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              {isEditing ? 'Editar Ruta de Aprendizaje' : 'Diseño de Rutas de Aprendizaje'}
            </h1>
            <p className="text-gray-400 mt-2 text-base">
              {isEditing ? 'Modifica los detalles, cursos o recursos asignados.' : 'Estructura el aprendizaje organizado por Escuelas, Rutas y Cursos.'}
            </p>
          </div>
          <button 
            type="button" 
            onClick={onCancel}
            className="px-6 py-2 border border-gray-600 text-gray-300 hover:bg-gray-800 rounded-lg font-medium transition-colors"
          >
            Volver al Listado
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          
          <div className="bg-[#1e2333] p-8 rounded-2xl border border-gray-800 shadow-lg relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500"></div>
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <span className="bg-brand-500/20 text-brand-400 w-8 h-8 rounded-lg flex items-center justify-center text-sm">1</span>
              Eje de Conocimiento (Clasificación)
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {predefinedCategories.map((cat, idx) => (
                <label 
                  key={idx} 
                  className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${selectedCategory === cat ? 'border-brand-500 bg-brand-500/10 ring-1 ring-brand-500' : 'border-gray-700 hover:border-brand-400 bg-[#0f172a]'}`}
                >
                  <input 
                    type="radio" 
                    value={cat} 
                    {...register('category')}
                    className="hidden"
                  />
                  <span className={`font-semibold text-sm ${selectedCategory === cat ? 'text-brand-400' : 'text-gray-300'}`}>
                    {cat}
                  </span>
                </label>
              ))}
              
              <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${!predefinedCategories.includes(selectedCategory) && selectedCategory !== '' ? 'border-brand-500 bg-brand-500/10 ring-1 ring-brand-500' : 'border-gray-700 bg-[#0f172a]'}`}>
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
                  className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-semibold text-gray-300 placeholder-gray-500 outline-none"
                  onClick={() => {
                    if(predefinedCategories.includes(selectedCategory)) {
                      setValue('category', '');
                    }
                  }}
                />
              </label>
            </div>
            {errors.category && <p className="text-red-500 text-xs mt-2">{errors.category.message}</p>}
          </div>

          <div className="bg-[#1e2333] p-8 rounded-2xl border border-gray-800 shadow-lg relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-400 w-8 h-8 rounded-lg flex items-center justify-center text-sm">2</span>
              Materia / Detalles de la Ruta
            </h2>

            <div className="space-y-6">
              <div>
                <label className="text-sm font-bold text-gray-400 block mb-2">Título de la Ruta (Materia)</label>
                <input 
                  type="text" 
                  placeholder="Ej: Programación Orientada a Objetos"
                  className={`w-full bg-[#0f172a] border ${errors.title ? 'border-red-500' : 'border-gray-700'} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors`}
                  {...register('title')}
                />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
              </div>

              {/* Portada de la ruta (POST /upload/subir-portada). El campo del
                  FormData es `portada`, no `file` (ver upload.routes.js). */}
              <div>
                <label className="text-sm font-bold text-gray-400 block mb-2">Portada de la ruta</label>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-20 rounded-xl overflow-hidden bg-[#0f172a] border border-gray-700 flex items-center justify-center">
                    {coverPreview ? (
                      <img src={coverPreview} alt="Portada" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-gray-500">Sin portada</span>
                    )}
                  </div>

                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverChange}
                      className="block w-full text-sm text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#1e2333] file:text-gray-200 hover:file:bg-[#252b3e] cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">PNG o JPG, hasta 5 MB.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-bold text-gray-400 block mb-2">Tiempo estimado (Minutos)</label>
                  <input 
                    type="number" 
                    placeholder="Ej: 144"
                    className={`w-full bg-[#0f172a] border ${errors.estimatedTime ? 'border-red-500' : 'border-gray-700'} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors`}
                    {...register('estimatedTime')}
                  />
                  {errors.estimatedTime && <p className="text-red-500 text-xs mt-1">{errors.estimatedTime.message}</p>}
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-400 block mb-2">Nivel de Dificultad</label>
                  <select
                    className="w-full bg-[#0f172a] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
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
                <label className="text-sm font-bold text-gray-400 block mb-2">Descripción General</label>
                <textarea 
                  className={`w-full bg-[#0f172a] border ${errors.description ? 'border-red-500' : 'border-gray-700'} rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors h-24 resize-none`}
                  {...register('description')}
                />
                {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
              </div>

              <div className="bg-emerald-500/5 p-5 rounded-xl border border-emerald-500/20">
                <label className="flex items-center gap-2 text-sm font-bold text-emerald-400 mb-2">
                  <span className="text-xl">🤖</span> Directrices para la IA (System Prompt)
                </label>
                <p className="text-xs text-gray-400 mb-3">
                  Define cómo debe comportarse el chatbot de Gemini al evaluar esta ruta específica.
                </p>
                <textarea 
                  placeholder="Ej: Actúa como un profesor estricto de la EPN..."
                  className="w-full bg-[#0f172a] border border-emerald-500/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors h-28 resize-none"
                  {...register('evaluationRules')}
                />
              </div>
            </div>
          </div>

          <div className="bg-[#1e2333] p-8 rounded-2xl border border-gray-800 shadow-lg relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500"></div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="bg-amber-500/20 text-amber-400 w-8 h-8 rounded-lg flex items-center justify-center text-sm">3</span>
                  Cursos de la Ruta (Submódulos)
                </h2>
                <p className="text-sm text-gray-400 mt-1 sm:ml-10">Crea los submódulos y asígnales los recursos existentes.</p>
              </div>
              <button 
                type="button" 
                onClick={addModule}
                className="px-4 py-2 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl text-sm font-bold transition-colors"
              >
                + Añadir Curso
              </button>
            </div>

            <div className="space-y-4">
              {modules.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-gray-700 rounded-xl">
                  <p className="text-gray-500 text-sm">Aún no has agregado cursos a esta ruta.</p>
                </div>
              )}

              {modules.map((mod, index) => (
                <div key={index} className="bg-[#0f172a] p-5 rounded-xl border border-gray-700 relative group flex gap-4">
                  
                  <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 bg-[#1e2333] rounded-lg border border-gray-700 text-gray-500 font-bold">
                    {index + 1}
                  </div>

                  <div className="flex-grow space-y-4">
                    <input 
                      type="text" 
                      placeholder="Nombre del Curso (Ej: Conceptos básicos de Redes)"
                      value={mod.title}
                      onChange={(e) => updateModule(index, 'title', e.target.value)}
                      className="w-full bg-[#1e2333] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 text-sm font-bold"
                      required
                    />
                    
                    <textarea 
                      placeholder="Breve descripción del curso..."
                      value={mod.description}
                      onChange={(e) => updateModule(index, 'description', e.target.value)}
                      className="w-full bg-[#1e2333] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500 text-sm h-12 resize-none"
                    />
                    
                    <div className="mt-4 border-t border-gray-800 pt-4">
                      <label className="text-xs font-bold text-gray-400 block mb-3 uppercase tracking-wider">
                        Catálogo de Recursos (Selecciona para añadir)
                      </label>
                      
                      {loadingResources ? (
                        <div className="text-sm text-gray-500 italic">Cargando recursos...</div>
                      ) : availableResources.length === 0 ? (
                        <div className="bg-amber-500/10 text-amber-500 p-3 rounded-lg text-sm border border-amber-500/20">
                          No hay recursos disponibles. Sube recursos primero.
                        </div>
                      ) : (
                        <div className="max-h-40 overflow-y-auto bg-[#1e2333] border border-gray-700 rounded-lg p-2 space-y-1 custom-scrollbar">
                          {availableResources.map((res) => (
                            <label key={res.id} className="flex items-center gap-3 p-2 hover:bg-[#252b3e] rounded-md cursor-pointer transition-colors">
                              <input 
                                type="checkbox"
                                checked={(mod.resourceIds ?? []).includes(res.id)}
                                onChange={() => toggleResource(index, res.id)}
                                className="w-4 h-4 text-amber-500 bg-gray-900 border-gray-600 focus:ring-amber-500 rounded"
                              />
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-300 line-clamp-1">{res.title}</span>
                                <span className="text-[10px] text-gray-500 uppercase">{res.type}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <button 
                    type="button" 
                    onClick={() => removeModule(index)}
                    className="flex-shrink-0 self-start text-gray-500 hover:text-red-500 bg-[#1e2333] hover:bg-red-500/10 p-2 rounded-lg transition-colors border border-gray-700 hover:border-red-500/30"
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
              className={`px-8 py-4 font-bold rounded-xl transition-transform hover:scale-105 shadow-xl text-lg ${
                loading ? 'bg-gray-700 text-gray-400 cursor-not-allowed shadow-none' : 'bg-white text-slate-900 shadow-white/10'
              }`}
            >
              {loading ? 'Procesando...' : (isEditing ? 'Guardar Cambios' : 'Ensamblar y Guardar Ruta')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RouteBuilder;  