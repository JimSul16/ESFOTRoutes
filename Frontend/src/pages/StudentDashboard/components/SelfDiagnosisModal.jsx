import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getSubjects, getSubjectTopics, submitSelfDiagnosis, generatePersonalizedAdaptiveRoute } from '../../../api/graph.api';

const LEVEL_LABELS = {
  1: { text: '1 - Sin conocimiento', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
  2: { text: '2 - Básico / Teórico', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  3: { text: '3 - Intermedio', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  4: { text: '4 - Práctico', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' },
  5: { text: '5 - Avanzado', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' }
};

const SelfDiagnosisModal = ({ isOpen, onClose, onRouteGenerated }) => {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [modules, setModules] = useState([]);
  const [ratings, setRatings] = useState({}); // { [topicId]: number }
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
      if (data.success && data.subjects) {
        setSubjects(data.subjects);
        if (data.subjects.length > 0) {
          handleSelectSubject(data.subjects[0]);
        }
      }
    } catch (err) {
      toast.error('Error al cargar materias del catálogo de conocimiento.');
    } finally {
      setLoadingSubjects(false);
    }
  };

  const handleSelectSubject = async (subject) => {
    setSelectedSubject(subject);
    setLoadingTopics(true);
    setRatings({});
    try {
      const data = await getSubjectTopics(subject.id);
      if (data.success && data.modules) {
        setModules(data.modules);
        // Inicializar niveles por defecto en 3 (Intermedio)
        const initial = {};
        data.modules.forEach(m => {
          m.topics?.forEach(t => {
            initial[t.id] = 3;
          });
        });
        setRatings(initial);
      }
    } catch (err) {
      toast.error('Error al cargar temas de la materia.');
    } finally {
      setLoadingTopics(false);
    }
  };

  const handleRate = (topicId, level) => {
    setRatings(prev => ({ ...prev, [topicId]: level }));
  };

  const handleSubmit = async () => {
    if (!selectedSubject) return;

    const diagnoses = Object.entries(ratings).map(([topicId, level]) => ({
      topicId,
      level
    }));

    if (diagnoses.length === 0) {
      toast.warning('Por favor califica al menos un tema antes de continuar.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Guardar autodiagnóstico en Neo4j
      await submitSelfDiagnosis(diagnoses);
      toast.info('Diagnóstico registrado en el Grafo de Conocimiento.');

      // 2. Ejecutar algoritmo topológico y generar ruta adaptativa
      const result = await generatePersonalizedAdaptiveRoute(selectedSubject.id);

      if (result.success) {
        toast.success(`🎉 ¡Ruta adaptativa creada! Con ${result.modules?.length || 0} módulos optimizados.`);
        if (onRouteGenerated) {
          onRouteGenerated(result);
        }
        onClose();
      } else {
        toast.error(result.error || 'Error al generar la ruta.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Error al generar la ruta adaptativa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const totalTopics = modules.reduce((acc, m) => acc + (m.topics?.length || 0), 0);
  const evaluatedCount = Object.keys(ratings).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-gradient-to-r from-violet-950/40 to-slate-900">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🧭</span>
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                Autodiagnóstico Curricular y Rutas Adaptativas
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">HU-013 & HU-014</span>
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Evalúa tu nivel previo. El motor de grafos (Neo4j) creará una ruta personalizada respetando prerrequisitos estrictos.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Selector de Materias Troncales */}
        <div className="px-6 py-4 bg-slate-950/50 border-b border-slate-800/80 flex items-center gap-3 overflow-x-auto">
          <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Materia Troncal:</span>
          {loadingSubjects ? (
            <div className="text-xs text-slate-500">Cargando catálogo...</div>
          ) : (
            subjects.map(s => {
              const isSelected = selectedSubject?.id === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => handleSelectSubject(s)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                    isSelected
                      ? 'bg-violet-600 text-white border-violet-500 shadow-lg shadow-violet-600/30'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/60'
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

        {/* Contenido: Módulos y Temas */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {loadingTopics ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-violet-500 mb-3"></div>
              <p className="text-sm">Consultando dependencias y prerrequisitos en Neo4j...</p>
            </div>
          ) : (
            modules.map(mod => (
              <div key={mod.id} className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5">
                <div className="mb-4 pb-2 border-b border-slate-800/60 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span className="text-violet-400">📂</span> {mod.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">{mod.description}</p>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">{mod.topics?.length} temas</span>
                </div>

                <div className="space-y-4">
                  {mod.topics?.map(topic => {
                    const currentRating = ratings[topic.id] || 3;
                    return (
                      <div key={topic.id} className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 transition-all hover:border-slate-700">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-white">{topic.name}</h4>
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-medium">
                                {topic.difficulty} • ~{topic.estimatedMinutes}m
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">{topic.description}</p>
                          </div>

                          {/* Selector de nivel 1..5 */}
                          <div className="flex items-center gap-1.5 self-start md:self-center">
                            {[1, 2, 3, 4, 5].map(lvl => (
                              <button
                                key={lvl}
                                onClick={() => handleRate(topic.id, lvl)}
                                className={`w-8 h-8 rounded-lg text-xs font-black transition-all border ${
                                  currentRating === lvl
                                    ? 'bg-violet-600 text-white border-violet-400 scale-105 shadow-md shadow-violet-600/40'
                                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border-slate-700'
                                }`}
                                title={LEVEL_LABELS[lvl].text}
                              >
                                {lvl}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Badges de Prerrequisitos */}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60 flex-wrap">
                          <span className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold ${LEVEL_LABELS[currentRating].color}`}>
                            {LEVEL_LABELS[currentRating].text}
                          </span>

                          {topic.prerequisites && topic.prerequisites.length > 0 ? (
                            topic.prerequisites.map(p => (
                              <span
                                key={p.id}
                                className={`text-[10px] px-2 py-0.5 rounded-md border font-medium ${
                                  p.strength === 'HARD'
                                    ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                                    : 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                                }`}
                              >
                                🔒 Requiere {p.strength === 'HARD' ? 'estricto' : 'sugerido'}: {p.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-500 font-mono">
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
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Progreso del diagnóstico: <strong>{evaluatedCount}/{totalTopics}</strong> temas evaluados</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || loadingTopics || evaluatedCount === 0}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border border-violet-500 shadow-lg shadow-violet-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Optimizando Secuencia DAG en Neo4j...</span>
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
