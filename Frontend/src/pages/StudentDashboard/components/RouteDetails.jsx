import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-toastify';
import CodeWorkspace from './CodeWorkspace';
import AIAssessmentForm from './AIAssessmentForm';

const sanitizeUrl = (url) => {
  if (!url) return '#';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return '#';
};

const CODING_KEYWORDS = ['javascript', 'js', 'react', 'node', 'python', 'html', 'css', 'web', 'programación'];

const RouteDetail = ({ route, viewMode, setViewMode, onBack, contextoEvaluacion, setContextoEvaluacion, onSendToAI, onOpenChat, isAlreadyEnrolled }) => {
  const [expandedModule, setExpandedModule] = useState(null);
  const [assessmentData, setAssessmentData] = useState(null);
  const [assessingModuleId, setAssessingModuleId] = useState(null);
  const [assessmentType, setAssessmentType] = useState(null);
  const [isGeneratingAssessment, setIsGeneratingAssessment] = useState(false);
  const [loadingType, setLoadingType] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);

  useEffect(() => {
    if (isAlreadyEnrolled || (route?.enrollments && route.enrollments.length > 0)) {
      setIsEnrolled(true);
    } else {
      setIsEnrolled(false);
    }
  }, [route, isAlreadyEnrolled]);

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'BEGINNER': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'INTERMEDIATE': return 'bg-sky-500/10 text-sky-500 border-sky-500/20';
      case 'ADVANCED': return 'bg-violet-500/10 text-violet-500 border-violet-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  const getDifficultyText = (difficulty) => {
    switch (difficulty) {
      case 'BEGINNER': return 'Principiante';
      case 'INTERMEDIATE': return 'Intermedio';
      case 'ADVANCED': return 'Avanzado';
      default: return difficulty;
    }
  };

  const getResourceIcon = (type) => {
    switch (type) {
      case 'PDF': return '📄';
      case 'VIDEO': return '▶️';
      case 'LINK': return '🔗';
      case 'IMAGE': return '🖼️';
      default: return '📁';
    }
  };

  const toggleModule = (moduleId) => {
    setExpandedModule(expandedModule === moduleId ? null : moduleId);
  };

  const handleEnroll = async () => {
    if (isEnrolling) return;
    setIsEnrolling(true);
    
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      const endpoint = apiUrl.endsWith('/api') 
        ? `${apiUrl}/routes/${route.id}/enroll` 
        : `${apiUrl}/api/routes/${route.id}/enroll`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success('¡Te has inscrito en la ruta exitosamente!');
        setIsEnrolled(true);
      } else if (response.status === 400) {
        toast.info(data.message || 'Ya estás inscrito en esta ruta.');
        setIsEnrolled(true);
      } else {
        throw new Error(data.error || 'Error al inscribirse');
      }
    } catch (error) {
      toast.error('Ocurrió un error de conexión al intentar inscribirte.');
    } finally {
      setIsEnrolling(false);
    }
  };

  const [completingModule, setCompletingModule] = useState(null);

  const handleCompleteModule = async (moduleId) => {
    if (completingModule) return;
    setCompletingModule(moduleId);
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const endpoint = apiUrl.endsWith('/api') 
        ? `${apiUrl}/routes/complete-module` 
        : `${apiUrl}/api/routes/complete-module`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ moduleId })
      });

      const data = await response.json();
      if (response.ok) {
        if (data.xpGained) {
          toast.success(`¡Material completado! +${data.xpGained} XP ganados.`);
        } else {
          toast.success(data.message || 'Módulo marcado como completado.');
        }
      } else {
        toast.error(data.error || 'Error al marcar como completado.');
      }
    } catch (error) {
      toast.error('Error de conexión al guardar el progreso.');
    } finally {
      setCompletingModule(null);
    }
  };


  const handleGenerateAssessment = async (moduleId, type) => {
    if (isGeneratingAssessment) return;
    
    setIsGeneratingAssessment(true);
    setLoadingType(type);
    setAssessingModuleId(moduleId);
    
    setAssessmentData(null);
    setAssessmentType(null);
    if (setContextoEvaluacion) {
      setContextoEvaluacion("");
    }
    
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      const endpoint = apiUrl.endsWith('/api') 
        ? `${apiUrl}/chat/assessment` 
        : `${apiUrl}/api/chat/assessment`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ moduleId, type })
      });

      if (response.status === 429) {
        throw new Error('429');
      }

      if (!response.ok) {
        throw new Error('Error al generar material con IA');
      }

      const data = await response.json();
      
      if (type === 'teoria') {
        setAssessmentData(data);
        setAssessmentType(type);
        setViewMode('teoria');
        toast.success('¡Cuestionario de práctica generado!');
      } else if (type === 'practica') {
        if (setContextoEvaluacion) setContextoEvaluacion(data.practicalChallenge);
        setViewMode('practica');
        toast.success('¡Reto práctico generado!');
      } else if (type === 'completa') {
        setAssessmentData(data);
        setAssessmentType(type);
        if (setContextoEvaluacion) setContextoEvaluacion(data.practicalChallenge);
        setViewMode('teoria');
        toast.success('¡Reto Final y Cuestionario generados con éxito!');
      }

    } catch (error) {
      setAssessingModuleId(null);
      setAssessmentType(null);
      if (error.message === '429') {
        toast.warning('La IA está procesando demasiadas solicitudes. Espera un minuto y vuelve a intentarlo.');
      } else {
        toast.error('Hubo un error al generar la información. Inténtalo de nuevo.');
      }
    } finally {
      setIsGeneratingAssessment(false);
      setLoadingType(null);
    }
  };

  const closeAssessment = () => {
    setAssessmentData(null);
    setAssessingModuleId(null);
    setAssessmentType(null);
  };

  const isMultiTask = typeof contextoEvaluacion === 'object' && contextoEvaluacion?.tasks;

  const isCodingRoute = () => {
    const checkText = (text) => {
      if (!text) return false;
      const lower = text.toLowerCase();
      return CODING_KEYWORDS.some(kw => lower.includes(kw));
    };
    
    if (checkText(route?.title)) return true;
    
    if (route?.modules) {
      return route.modules.some(mod => checkText(mod.title));
    }
    
    return false;
  };

  const showWorkspace = isCodingRoute();

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 font-semibold transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        Regresar al listado de rutas
      </button>

      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
        <div className="flex flex-wrap gap-3 mb-6">
          <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getDifficultyColor(route.difficulty)}`}>
            {getDifficultyText(route.difficulty)}
          </span>
          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700">
            ⏱️ {route.estimatedTime || 0} Minutos
          </span>
        </div>

        <h2 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tight mb-4">{route.title}</h2>
        <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed mb-6 max-w-3xl">
          {route.description}
        </p>

        {!isEnrolled ? (
          <button 
            onClick={handleEnroll}
            disabled={isEnrolling}
            className="mb-8 bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 px-8 rounded-xl transition-colors shadow-lg shadow-violet-600/20 disabled:opacity-50 flex items-center gap-2"
          >
            {isEnrolling ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                Procesando...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
                Inscribirse en esta Ruta
              </>
            )}
          </button>
        ) : (
          <div className="mb-8 inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-xl font-bold text-sm border border-emerald-500/20">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            Inscrito Correctamente
          </div>
        )}

        <div className="flex gap-4 mb-8 border-b border-slate-200 dark:border-slate-800 pb-px">
          <button
            onClick={() => setViewMode('teoria')}
            className={`pb-4 px-2 text-sm font-bold border-b-2 transition-colors ${viewMode === 'teoria' ? 'border-violet-600 text-violet-600 dark:text-violet-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Módulos de Estudio
          </button>
          {showWorkspace && (
            <button
              onClick={() => setViewMode('practica')}
              className={`pb-4 px-2 text-sm font-bold border-b-2 transition-colors ${viewMode === 'practica' ? 'border-violet-600 text-violet-600 dark:text-violet-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Entorno de Práctica
            </button>
          )}
        </div>

        {viewMode === 'teoria' ? (
          <div className="space-y-4">
            {assessmentData ? (
              <div className="animate-in fade-in duration-300">
                <div className="mb-6 flex justify-between items-center bg-[#1e2333] p-4 rounded-xl border border-slate-800 shadow-md">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{assessmentType === 'completa' ? '⚡' : '📝'}</span>
                    <div>
                      <h3 className="text-white font-bold">
                        {assessmentType === 'completa' ? 'Reto Final Oficial' : 'Cuestionario de Práctica'}
                      </h3>
                      <p className="text-slate-400 text-xs">
                        {assessmentType === 'completa' ? 'Requiere 70% para aprobar.' : 'Práctica libre sin calificación mínima.'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={closeAssessment}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg flex items-center gap-2 text-sm font-bold transition-colors border border-slate-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                    Volver al módulo
                  </button>
                </div>

                <AIAssessmentForm 
                  assessmentData={assessmentData} 
                  moduleId={assessingModuleId}
                  assessmentType={assessmentType}
                  onRetake={closeAssessment} 
                />
              </div>
            ) : (
              (!route.modules || route.modules.length === 0) ? (
                <div className="bg-[#1e2333] border border-gray-800 rounded-2xl p-8 text-center">
                  <p className="text-slate-400">Esta ruta aún no tiene módulos asignados.</p>
                </div>
              ) : (
                route.modules.map((mod, index) => {
                  const isExpanded = expandedModule === mod.id;
                  
                  return (
                    <div key={mod.id} className="bg-[#1e2333] border border-gray-800 rounded-xl overflow-hidden transition-all duration-300">
                      <button
                        onClick={() => toggleModule(mod.id)}
                        className="w-full flex items-center justify-between p-5 hover:bg-[#252b3e] transition-colors text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-violet-600/20 text-violet-400 flex items-center justify-center font-bold text-sm border border-violet-500/30">
                            {index + 1}
                          </div>
                          <h3 className="text-lg font-bold text-white">{mod.title}</h3>
                        </div>
                        <svg 
                          className={`w-5 h-5 text-gray-400 transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                      </button>

                      {isExpanded && (
                        <div className="p-6 border-t border-gray-800 bg-[#161a27] animate-in slide-in-from-top-2 duration-200">
                          {mod.description && (
                            <p className="text-gray-400 text-sm mb-6 leading-relaxed">{mod.description}</p>
                          )}

                          <div className="space-y-3 mb-6">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Recursos del módulo</h4>
                            {(!mod.resources || mod.resources.length === 0) ? (
                              <p className="text-gray-500 text-sm italic">No hay recursos en este módulo.</p>
                            ) : (
                              mod.resources.map((mr, rIndex) => {
                                const res = mr.resource;
                                if (!res) return null;
                                return (
                                  <a
                                    key={rIndex}
                                    href={sanitizeUrl(res.url)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between p-4 bg-[#1e2333] rounded-lg border border-gray-700 hover:border-violet-500/50 hover:bg-[#252b3e] transition-colors group"
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="text-xl">{getResourceIcon(res.type)}</span>
                                      <div>
                                        <h5 className="font-semibold text-gray-200 group-hover:text-violet-300 transition-colors">{res.title}</h5>
                                        <span className="text-xs text-gray-500">{res.type}</span>
                                      </div>
                                    </div>
                                    <svg className="w-4 h-4 text-gray-500 group-hover:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                  </a>
                                );
                              })
                            )}
                          </div>

                          <div className="mt-4 pt-6 border-t border-gray-800 flex flex-wrap items-center justify-end gap-3">
                            <button
                              onClick={() => handleGenerateAssessment(mod.id, 'teoria')}
                              disabled={isGeneratingAssessment}
                              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-sky-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {loadingType === 'teoria' ? 'Generando...' : '📝 Generar Cuestionario'}
                            </button>
                            {index === route.modules.length - 1 && (
                              <button
                                onClick={() => handleGenerateAssessment(mod.id, 'completa')}
                                disabled={isGeneratingAssessment}
                                className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-violet-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {loadingType === 'completa' ? 'Generando...' : '⚡ Iniciar Reto Final'}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )
            )}
          </div>
        ) : (
          <div className="animate-in fade-in space-y-6">
            <div className="p-5 bg-slate-100 dark:bg-[#12141c] border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Instrucciones del Reto</h2>
                {contextoEvaluacion && (
                  <span className="px-2 py-1 bg-violet-500/20 text-violet-400 text-xs font-bold rounded">Generado por IA</span>
                )}
              </div>
              
              {isMultiTask ? (
                <div className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                  <h3 className="font-bold text-slate-800 dark:text-white mb-2 text-base">{contextoEvaluacion.title}</h3>
                  <p className="mb-4">{contextoEvaluacion.context}</p>
                </div>
              ) : (
                <div className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                  <ReactMarkdown
                    components={{
                      p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-bold text-slate-800 dark:text-slate-200" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
                      li: ({node, ...props}) => <li {...props} />,
                      code: ({node, className, children, ...props}) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const isInline = !match && !String(children).includes('\n');
                        return isInline ? (
                          <code className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-violet-600 dark:text-violet-400 font-mono text-[13px]" {...props}>
                            {children}
                          </code>
                        ) : (
                          <code className="block bg-slate-200 dark:bg-slate-800 p-3 rounded-lg text-violet-600 dark:text-violet-400 font-mono text-[13px] my-3 overflow-x-auto" {...props}>
                            {children}
                          </code>
                        );
                      }
                    }}
                  >
                    {contextoEvaluacion || route?.description || "Escribe el código necesario para resolver este ejercicio o pide un reto a la IA."}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            {showWorkspace && (
              <CodeWorkspace 
                onSendToAI={onSendToAI} 
                challengeData={isMultiTask ? contextoEvaluacion : null} 
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RouteDetail;