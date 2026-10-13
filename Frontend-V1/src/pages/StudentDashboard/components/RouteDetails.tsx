import { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'react-toastify';
import { enrollRoute, getRouteById } from '../../../api/route.api';
import { generateAssessment } from '../../../api/chat.api';
import { getApiErrorMessage } from '../../../api/errors';
import CodeWorkspace from './CodeWorkspace';
import AIAssessmentForm from './AIAssessmentForm';
import RouteHeader from './route-details/RouteHeader';
import ModuleList from './route-details/ModuleList';
import type {
  AssessmentData,
  AssessmentType,
  CompleteModuleResponse,
  LearningRoute,
  PracticalChallenge,
} from '../../../types';

const CODING_KEYWORDS = ['javascript', 'js', 'react', 'node', 'python', 'html', 'css', 'web', 'programación'];

export interface RouteDetailsProps {
  route: LearningRoute | null;
  viewMode: 'teoria' | 'practica';
  setViewMode: (mode: 'teoria' | 'practica') => void;
  onBack: () => void;
  contextoEvaluacion: string | PracticalChallenge;
  setContextoEvaluacion: (value: string | PracticalChallenge) => void;
  onSendToAI: (code: string, language: string, output?: string) => void;
  onOpenChat?: (moduleId?: string | null, moduleTitle?: string | null) => void;
  isAlreadyEnrolled: boolean;
  onAssessmentComplete?: (data: CompleteModuleResponse | null) => void;
}

const RouteDetail = ({
  route,
  viewMode,
  setViewMode,
  onBack,
  contextoEvaluacion,
  setContextoEvaluacion,
  onSendToAI,
  isAlreadyEnrolled,
  onAssessmentComplete,
}: RouteDetailsProps) => {
  // Copia local: `route` llega por prop y el padre no la vuelve a actualizar tras
  // aprobar un módulo, así que queda obsoleta. `GET /routes/:id` la refresca al
  // montar y tras cada evaluación superada; la UI debe leer siempre de aquí.
  const [routeData, setRouteData] = useState<LearningRoute | null>(route);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(null);
  const [assessingModuleId, setAssessingModuleId] = useState<string | null>(null);
  const [assessmentType, setAssessmentType] = useState<AssessmentType | null>(null);
  const [isGeneratingAssessment, setIsGeneratingAssessment] = useState(false);
  const [loadingType, setLoadingType] = useState<AssessmentType | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);

  const routeId = route?.id;

  /**
   * Relee la ruta desde el backend para obtener `progress` y el estado de
   * inscripción al día. Ante error se mantiene la versión previa: es preferible
   * mostrar datos ligeramente viejos a dejar la pantalla en blanco.
   */
  const refreshRoute = useCallback(async () => {
    if (!routeId) return;

    try {
      const fresh = await getRouteById(routeId);
      setRouteData(fresh);
    } catch {
      // silencioso a propósito
    }
  }, [routeId]);

  useEffect(() => {
    setRouteData(route);
  }, [route]);

  useEffect(() => {
    void refreshRoute();
  }, [refreshRoute]);

  useEffect(() => {
    setIsEnrolled(isAlreadyEnrolled || (routeData?.enrollments?.length ?? 0) > 0);
  }, [routeData, isAlreadyEnrolled]);

  const toggleModule = (moduleId: string) => {
    setExpandedModule(expandedModule === moduleId ? null : moduleId);
  };

  const handleEnroll = async () => {
    if (isEnrolling || !routeId) return;
    setIsEnrolling(true);
    try {
      const res = await enrollRoute(routeId);
      toast.success(res.message || 'Te has inscrito en la ruta exitosamente');
      setIsEnrolled(true);
      await refreshRoute();
    } catch (error: unknown) {
      // 400 significa que ya estaba inscrito: no es un fallo real.
      if ((error as { response?: { status?: number } })?.response?.status === 400) {
        toast.info(getApiErrorMessage(error, 'Ya estás inscrito en esta ruta.'));
        setIsEnrolled(true);
      } else {
        toast.error(getApiErrorMessage(error, 'Ocurrió un error de conexión al intentar inscribirte.'));
      }
    } finally {
      setIsEnrolling(false);
    }
  };

  /**
   * El padre solo actualiza XP/nivel, no la ruta. Al superar una evaluación hay
   * que releerla para que el módulo aparezca completado y el progreso sume.
   */
  const handleAssessmentComplete = (data: CompleteModuleResponse | null) => {
    onAssessmentComplete?.(data);
    if (data) void refreshRoute();
  };

  const handleGenerateAssessment = async (moduleId: string, type: AssessmentType) => {
    if (isGeneratingAssessment) return;
    setIsGeneratingAssessment(true);
    setLoadingType(type);
    setAssessingModuleId(moduleId);
    setAssessmentData(null);
    setAssessmentType(null);
    setContextoEvaluacion('');

    try {
      const data = await generateAssessment({ moduleId, type });

      if (type === 'teoria') {
        setAssessmentData(data);
        setAssessmentType(type);
        setViewMode('teoria');
        toast.success('Cuestionario de práctica generado');
      } else if (type === 'practica') {
        if (data.practicalChallenge) setContextoEvaluacion(data.practicalChallenge);
        setViewMode('practica');
        toast.success('Reto práctico generado');
      } else {
        setAssessmentData(data);
        setAssessmentType(type);
        if (data.practicalChallenge) setContextoEvaluacion(data.practicalChallenge);
        setViewMode('teoria');
        toast.success('Reto final y cuestionario generados con éxito');
      }
    } catch (error: unknown) {
      setAssessingModuleId(null);
      setAssessmentType(null);
      if ((error as { response?: { status?: number } })?.response?.status === 429) {
        toast.warning('La IA está procesando demasiadas solicitudes. Espera un minuto y vuelve a intentarlo.');
      } else {
        toast.error(getApiErrorMessage(error, 'Hubo un error al generar la información. Inténtalo de nuevo.'));
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

  // `ReactMarkdown` solo acepta texto como children. Si `contextoEvaluacion` es
  // un objeto sin `tasks`, la rama de `isMultiTask` no lo cubre y antes se le
  // pasaba el objeto entero como children.
  const contextoTexto =
    typeof contextoEvaluacion === 'string' && contextoEvaluacion
      ? contextoEvaluacion
      : routeData?.description ||
        'Escribe el código necesario para resolver este ejercicio o pide un reto a la IA.';

  const isCodingRoute = () => {
    const checkText = (text?: string | null) => {
      if (!text) return false;
      const lower = text.toLowerCase();
      return CODING_KEYWORDS.some(kw => lower.includes(kw));
    };
    if (checkText(routeData?.title)) return true;
    if (routeData?.modules) return routeData.modules.some(mod => checkText(mod.title));
    return false;
  };

  const showWorkspace = isCodingRoute();

  // Guarda después de todos los hooks: sin ruta seleccionada el panel no tiene
  // nada que pintar y antes reventaba al leer `route.title`.
  if (!routeData) {
    return (
      <div className="text-center py-16 text-surface-500 dark:text-surface-400">
        Selecciona una ruta para ver su detalle.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-surface-500 hover:text-brand-600 dark:hover:text-brand-400 font-semibold text-sm transition-colors group"
      >
        <span className="p-1 rounded-lg bg-surface-100 dark:bg-surface-800 group-hover:bg-brand-50 dark:group-hover:bg-brand-900/30 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </span>
        Regresar al catálogo de rutas
      </button>

      <RouteHeader
        route={routeData}
        isEnrolled={isEnrolled}
        isEnrolling={isEnrolling}
        onEnroll={handleEnroll}
      />

      <div className="flex gap-2 border-b border-surface-200 dark:border-surface-800 pb-px">
        <button
          onClick={() => setViewMode('teoria')}
          className={`pb-3.5 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            viewMode === 'teoria' 
              ? 'border-brand-600 text-brand-600 dark:text-brand-400' 
              : 'border-transparent text-surface-500 hover:text-surface-800 dark:hover:text-surface-200'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Módulos de estudio
        </button>
        {showWorkspace && (
          <button
            onClick={() => setViewMode('practica')}
            className={`pb-3.5 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              viewMode === 'practica' 
                ? 'border-brand-600 text-brand-600 dark:text-brand-400' 
                : 'border-transparent text-surface-500 hover:text-surface-800 dark:hover:text-surface-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Entorno de práctica y código
          </button>
        )}
      </div>

      {viewMode === 'teoria' ? (
        <div className="space-y-4">
          {assessmentData && assessingModuleId && assessmentType ? (
            <div className="animate-in fade-in duration-300">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-surface-900 p-5 rounded-2xl border border-surface-200/80 dark:border-surface-800 shadow-sm">
                <div className="flex items-center gap-3.5">
                  <span className="w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-500/20 flex items-center justify-center text-2xl shadow-2xs">
                    {assessmentType === 'completa' ? '🏆' : '📝'}
                  </span>
                  <div>
                    <h3 className="text-surface-900 dark:text-surface-100 font-bold text-base sm:text-lg">
                      {assessmentType === 'completa' ? 'Reto final de certificación' : 'Cuestionario interactivo de práctica'}
                    </h3>
                    <p className="text-surface-500 dark:text-surface-400 text-xs sm:text-sm">
                      {assessmentType === 'completa' ? 'Requiere al menos 70% de aciertos para aprobar el módulo.' : 'Evaluación formativa para consolidar conceptos sin penalización.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeAssessment}
                  className="px-4 py-2 bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-300 rounded-xl flex items-center gap-2 text-xs sm:text-sm font-semibold transition-colors self-start sm:self-auto border border-surface-200 dark:border-surface-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  Volver al módulo
                </button>
              </div>
              <AIAssessmentForm
                assessmentData={assessmentData}
                moduleId={assessingModuleId}
                assessmentType={assessmentType}
                onRetake={closeAssessment}
                onAssessmentComplete={handleAssessmentComplete}
              />
            </div>
          ) : (
            <ModuleList
              modules={routeData.modules}
              expandedModule={expandedModule}
              onToggle={toggleModule}
              onGenerateAssessment={handleGenerateAssessment}
              isGeneratingAssessment={isGeneratingAssessment}
              loadingType={loadingType}
            />
          )}
        </div>
      ) : (
        <div className="animate-in fade-in space-y-6">
          <div className="p-6 bg-white dark:bg-surface-900 border border-surface-200/80 dark:border-surface-800 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-surface-900 dark:text-surface-100">Instrucciones del reto</h2>
              {contextoEvaluacion && (
                <span className="px-2.5 py-1 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-xs font-semibold rounded-full border border-brand-200 dark:border-brand-800/60 inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                  Generado por IA
                </span>
              )}
            </div>
            {isMultiTask ? (
              <div className="text-surface-600 dark:text-surface-300 text-sm leading-relaxed">
                <h3 className="font-semibold text-surface-900 dark:text-surface-100 mb-2 text-base">{contextoEvaluacion.title}</h3>
                <p className="mb-4">{contextoEvaluacion.context}</p>
              </div>
            ) : (
              <div className="text-surface-600 dark:text-surface-300 text-sm leading-relaxed">
                <ReactMarkdown
                  components={{
                    p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-semibold text-surface-900 dark:text-surface-100" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
                    li: ({node, ...props}) => <li {...props} />,
                    code: ({node, className, children, ...props}) => {
                      const match = /language-(\w+)/.exec(className || '');
                      const isInline = !match && !String(children).includes('\n');
                      return isInline ? (
                        <code className="bg-surface-100 dark:bg-surface-800 px-1.5 py-0.5 rounded-md text-brand-600 dark:text-brand-400 font-mono text-[12.5px] font-semibold" {...props}>
                          {children}
                        </code>
                      ) : (
                        <code className="block bg-surface-900 text-surface-100 p-4 rounded-xl text-brand-300 font-mono text-[12.5px] my-3 overflow-x-auto border border-surface-800" {...props}>
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {contextoTexto}
                </ReactMarkdown>
              </div>
            )}
          </div>
          {showWorkspace && (
            <CodeWorkspace
              onSendToAI={onSendToAI}
              challengeData={isMultiTask ? contextoEvaluacion : undefined}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default RouteDetail;
