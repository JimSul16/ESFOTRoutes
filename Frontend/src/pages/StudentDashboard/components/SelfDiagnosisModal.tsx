import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  getSubjects,
  getSubjectTopics,
  submitSelfDiagnosis,
  generatePersonalizedAdaptiveRoute,
} from '../../../api/graph.api';
import { getApiErrorMessage } from '../../../api/errors';
import type { GraphModule, Subject } from '../../../types';

const LEVEL_LABELS: Record<number, { text: string; color: string }> = {
  1: { text: '1 - Sin conocimiento', color: 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/30' },
  2: { text: '2 - Básico / Teórico', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  3: { text: '3 - Intermedio', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
  4: { text: '4 - Práctico', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' },
  5: { text: '5 - Avanzado', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
};

export interface SelfDiagnosisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRouteGenerated?: (result: unknown) => void;
}

const SelfDiagnosisModal = ({ isOpen, onClose, onRouteGenerated }: SelfDiagnosisModalProps) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [modules, setModules] = useState<GraphModule[]>([]);
  /**
   * Módulo visible en el cuerpo del modal.
   *
   * El grafo curricular puede traer decenas de módulos con temas: listarlos
   * todos seguidos era ilegible. Se muestran como pestañas y solo se renderiza
   * el módulo activo, con su propio contador de temas evaluados.
   */
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  /**
   * Temas que el estudiante ha tocado de verdad.
   *
   * Antes `ratings` se inicializaba con TODOS los temas en 3, así que
   * `evaluatedCount` valía `totalTopics` desde el primer segundo: el botón
   * "Generar Mi Ruta Adaptativa" nunca se deshabilitaba y el pie decía
   * "9/9 temas evaluados" sin que el alumno hubiera tocado nada. Como
   * `selfLevel` es la única señal que el grafo consume, la ruta salía plana.
   */
  const [touched, setTouched] = useState<Record<string, true>>({});
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSubjects();
    }
  }, [isOpen]);

  const loadSubjects = async () => {
    setLoadingSubjects(true);
    try {
      const data = await getSubjects();
      setSubjects(data);
      if (data.length > 0) {
        handleSelectSubject(data[0]);
      }
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al cargar catálogo curricular.'));
    } finally {
      setLoadingSubjects(false);
    }
  };

  const handleSelectSubject = async (subject: Subject) => {
    setSelectedSubject(subject);
    setLoadingTopics(true);
    setRatings({});
    setTouched({});
    try {
      const data = await getSubjectTopics(subject.id);
      setModules(data);
      // Al cambiar de materia arranca siempre en el primer módulo.
      setActiveModuleId(data[0]?.id ?? null);
      // Nivel por defecto 3 (Intermedio) como punto de partida visual, pero
      // SIN marcar el tema como evaluado: hace falta que el alumno lo toque.
      const initial: Record<string, number> = {};
      data.forEach((m) => {
        m.topics?.forEach((t) => {
          initial[t.id] = 3;
        });
      });
      setRatings(initial);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al cargar temas de la materia.'));
    } finally {
      setLoadingTopics(false);
    }
  };

  const handleRate = (topicId: string, level: number) => {
    setRatings((prev) => ({ ...prev, [topicId]: level }));
    setTouched((prev) => ({ ...prev, [topicId]: true }));
  };

  const totalTopics = modules.reduce((acc, m) => acc + (m.topics?.length || 0), 0);
  // Solo cuentan los temas realmente calificados por el estudiante.
  const evaluatedCount = Object.keys(touched).length;
  const isComplete = totalTopics > 0 && evaluatedCount >= totalTopics;

  /** Módulo visible: el elegido o, si ya no existe, el primero disponible. */
  const activeModuleIndex = modules.findIndex((m) => m.id === activeModuleId);
  const activeModule =
    modules[activeModuleIndex] ?? modules[0] ?? null;

  /** Progreso del módulo: temas calificados sobre los que lo componen. */
  const moduleProgress = (mod: GraphModule) => {
    const topics = mod.topics ?? [];
    return {
      total: topics.length,
      rated: topics.filter((t) => touched[t.id]).length,
    };
  };

  const goToModule = (index: number) => {
    const target = modules[index];
    if (target) setActiveModuleId(target.id);
  };

  const handleSubmit = async () => {
    if (!selectedSubject) return;

    if (!isComplete) {
      toast.warning(`Por favor califica todos los temas de la materia (${evaluatedCount}/${totalTopics}) antes de continuar.`);
      return;
    }

    // Solo se envían los temas realmente evaluados por el estudiante.
    const diagnoses = Object.entries(touched).map(([topicId]) => ({
      topicId,
      level: ratings[topicId] ?? 3,
    }));

    setIsSubmitting(true);
    try {
      // 1. Guardar autodiagnóstico
      const saved = await submitSelfDiagnosis(diagnoses);
      toast.info(`Diagnóstico registrado exitosamente (${saved.savedCount} temas evaluados).`);

      // 2. Generar ruta adaptativa
      const result = await generatePersonalizedAdaptiveRoute(selectedSubject.id);

      if (result.routeId) {
        toast.success(`🎉 ¡Ruta adaptativa creada con éxito! Módulos optimizados.`);
        if (onRouteGenerated) {
          onRouteGenerated(result);
        }
        onClose();
      } else {
        toast.error('No se pudo generar la ruta adaptativa.');
      }
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Error al generar la ruta adaptativa.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-surface-900 dark:text-surface-100">
        {/* Header */}
        <div className="p-6 border-b border-surface-200 dark:border-surface-800 flex justify-between items-center bg-surface-50/80 dark:bg-surface-850/80">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🧭</span>
            <div>
              <h2 className="text-lg sm:text-xl font-display font-bold text-surface-900 dark:text-white flex items-center gap-2">
                Autodiagnóstico Curricular
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200/80 dark:border-brand-800/60 font-semibold">
                  Ruta Adaptativa
                </span>
              </h2>
              <p className="text-surface-500 dark:text-surface-400 text-xs mt-0.5">
                Evalúa tu nivel previo en cada tema. El sistema estructurará tu plan personalizado respetando los prerrequisitos de la materia.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-surface-400 hover:text-surface-600 dark:hover:text-white p-2 rounded-xl hover:bg-surface-200/60 dark:hover:bg-surface-800 transition-colors"
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        {/* Selector de Materias Troncales */}
        <div className="px-6 py-3.5 bg-surface-100/60 dark:bg-surface-950/50 border-b border-surface-200 dark:border-surface-800 flex items-center gap-3 overflow-x-auto">
          <span className="text-xs font-semibold uppercase text-surface-500 dark:text-surface-400 tracking-wider shrink-0">
            Materia Troncal:
          </span>
          {loadingSubjects ? (
            <div className="text-xs text-surface-400">Cargando catálogo...</div>
          ) : (
            subjects.map((s) => {
              const isSelected = selectedSubject?.id === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => handleSelectSubject(s)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border shrink-0 ${
                    isSelected
                      ? 'bg-brand-600 text-white border-brand-500 shadow-sm'
                      : 'bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-300 border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-750'
                  }`}
                >
                  <span>{s.id === 'redes' ? '🌐' : '💻'}</span>
                  <span>{s.name}</span>
                  <span className="text-[10px] opacity-75">({s.topicCount} temas)</span>
                </button>
              );
            })
          )}
        </div>

        {/* Pestañas por módulo: agrupan los temas del grafo en bloques navegables */}
        {modules.length > 0 && !loadingTopics && (
          <div className="px-6 pt-3.5 pb-3 border-b border-surface-200 dark:border-surface-800 bg-surface-100/60 dark:bg-surface-950/50">
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <span className="text-xs font-semibold uppercase text-surface-500 dark:text-surface-400 tracking-wider">
                Módulos de la Materia
              </span>
              <span className="text-[11px] text-surface-400 font-mono">
                {modules.length} módulo{modules.length === 1 ? '' : 's'} · {totalTopics} temas
              </span>
            </div>
            <div
              role="tablist"
              aria-label="Módulos de la materia"
              className="flex gap-2 overflow-x-auto pb-1"
            >
              {modules.map((mod, idx) => {
                const { total, rated } = moduleProgress(mod);
                const isActive = activeModule?.id === mod.id;
                const isDone = total > 0 && rated === total;
                const pct = total > 0 ? Math.round((rated / total) * 100) : 0;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`Módulo ${idx + 1}: ${mod.name} — ${rated} de ${total} temas evaluados`}
                    onClick={() => setActiveModuleId(mod.id)}
                    className={`shrink-0 w-40 text-left rounded-xl border px-3 py-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                      isActive
                        ? 'bg-brand-600 border-brand-500 text-white shadow-sm'
                        : 'bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:border-brand-400'
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold truncate">Módulo {idx + 1}</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md shrink-0 ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : isDone
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                              : 'bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400'
                        }`}
                      >
                        {isDone ? '✓ ' : ''}
                        {rated}/{total}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={`block mt-1.5 h-1 w-full rounded-full overflow-hidden ${
                        isActive ? 'bg-white/25' : 'bg-surface-200 dark:bg-surface-700'
                      }`}
                    >
                      <span
                        className={`block h-full rounded-full transition-all duration-300 ${
                          isActive ? 'bg-white' : 'bg-brand-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Contenido: temas del módulo activo */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {loadingTopics ? (
            <div className="py-20 flex flex-col items-center justify-center text-surface-400">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent mb-3" />
              <p className="text-xs sm:text-sm">Analizando grafo curricular y prerrequisitos...</p>
            </div>
          ) : activeModule ? (
            modules
              .filter((mod) => mod.id === activeModule?.id)
              .map((mod) => (
              <div key={mod.id} className="bg-surface-50/70 dark:bg-surface-950/40 border border-surface-200 dark:border-surface-800/80 rounded-2xl p-5">
                <div className="mb-4 pb-2 border-b border-surface-200/80 dark:border-surface-800/60 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm sm:text-base font-display font-bold text-surface-900 dark:text-white flex items-center gap-2">
                      <span className="text-brand-600 dark:text-brand-400">📂</span> {mod.name}
                    </h3>
                  </div>
                  <span className="text-xs text-surface-400 font-mono">{mod.topics?.length} temas</span>
                </div>

                <div className="space-y-3.5">
                  {mod.topics?.map((topic) => {
                    const currentRating = ratings[topic.id] || 3;
                    const isRated = Boolean(touched[topic.id]);
                    return (
                      <div
                        key={topic.id}
                        className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-4 transition-all hover:border-brand-500/40 shadow-sm"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-surface-900 dark:text-white">{topic.name}</h4>
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 font-medium">
                                {topic.difficulty} • ~{topic.estimatedMinutes}m
                              </span>
                            </div>
                            <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 leading-relaxed">
                              {topic.description}
                            </p>
                          </div>

                          {/* Selector de nivel 1..5 */}
                          <div className="flex items-center gap-1.5 self-start md:self-center shrink-0">
                            {[1, 2, 3, 4, 5].map((lvl) => (
                              <button
                                key={lvl}
                                onClick={() => handleRate(topic.id, lvl)}
                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all border ${
                                  isRated && currentRating === lvl
                                    ? 'bg-brand-600 text-white border-brand-500 shadow-sm scale-105'
                                    : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white hover:bg-surface-200 dark:hover:bg-surface-700 border-surface-200 dark:border-surface-700'
                                }`}
                                title={LEVEL_LABELS[lvl].text}
                              >
                                {lvl}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Badges de Prerrequisitos */}
                        <div className="flex items-center gap-2 pt-2 border-t border-surface-100 dark:border-surface-800/60 flex-wrap">
                          <span className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold ${
                            isRated
                              ? LEVEL_LABELS[currentRating].color
                              : 'bg-surface-100 dark:bg-surface-800 text-surface-400 dark:text-surface-500 border-surface-200 dark:border-surface-700'
                          }`}>
                            {isRated ? LEVEL_LABELS[currentRating].text : 'Sin evaluar'}
                          </span>

                          {topic.prerequisites && topic.prerequisites.length > 0 ? (
                            topic.prerequisites.map((p) => (
                              <span
                                key={p.id}
                                className={`text-[10px] px-2 py-0.5 rounded-md border font-medium ${
                                  p.strength === 'HARD'
                                    ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800/40'
                                    : 'bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-300 border-sky-200 dark:border-sky-800/40'
                                }`}
                              >
                                🔒 Requiere {p.strength === 'HARD' ? 'estricto' : 'sugerido'}: {p.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-surface-400 font-mono">
                              🌱 Concepto inicial (Sin prerrequisitos)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="py-16 px-6 text-center text-surface-500 dark:text-surface-400">
              <span className="text-3xl block mb-3">🗂️</span>
              <p className="text-sm">
                Esta materia todavía no tiene módulos con temas registrados en el grafo curricular.
              </p>
            </div>
          )}

          {/* Navegación entre módulos */}
          {modules.length > 1 && activeModule && (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => goToModule(activeModuleIndex - 1)}
                disabled={activeModuleIndex <= 0}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Módulo anterior
              </button>
              <span className="text-xs text-surface-400 font-mono">
                {activeModuleIndex + 1} / {modules.length}
              </span>
              <button
                type="button"
                onClick={() => goToModule(activeModuleIndex + 1)}
                disabled={activeModuleIndex >= modules.length - 1}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Módulo siguiente →
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-950 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-surface-500 dark:text-surface-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              Progreso del diagnóstico: <strong>{evaluatedCount}/{totalTopics}</strong> temas evaluados
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-semibold text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white bg-white dark:bg-surface-800 hover:bg-surface-100 dark:hover:bg-surface-700 border border-surface-200 dark:border-surface-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || loadingTopics || !isComplete}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 border border-brand-500 shadow-md shadow-brand-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Optimizando secuencia pedagógica y sincronizando grafo...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Generar Mi Ruta Adaptativa</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelfDiagnosisModal;
