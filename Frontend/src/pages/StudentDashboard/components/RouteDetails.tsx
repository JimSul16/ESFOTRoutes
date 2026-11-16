import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { Icon } from '@/components/ui';
import { enrollRoute, getRouteById } from '../../../api/route.api';
import { generateAssessment } from '../../../api/chat.api';
import { getApiErrorMessage } from '../../../api/errors';
import AIAssessmentForm from './AIAssessmentForm';
import RouteHeader from './route-details/RouteHeader';
import ModuleList from './route-details/ModuleList';
import ModuleAssessmentsModal from './route-details/ModuleAssessmentsModal';
import type {
  AssessmentData,
  AssessmentType,
  CompleteModuleResponse,
  LearningRoute,
  PracticalChallenge,
} from '../../../types';

/**
 * Mensajes rotativos mientras la IA genera la evaluación.
 *
 * Antes vivían dentro del componente: se recreaban en cada render y el
 * `useEffect` que los usa dependía de `LOADING_MESSAGES.length`, una
 * dependencia que cambiaba en cada render (aviso de `exhaustive-deps`).
 */
const LOADING_MESSAGES = [
  'Generando cuestionario con Inteligencia Artificial...',
  'Optimizando preguntas pedagógicas...',
  'Ajustando reto práctico según tus prerrequisitos...',
  'Consultando base de conocimientos curricular...'
];

export interface RouteDetailsProps {
  route: LearningRoute | null;
  viewMode?: 'teoria' | 'practica';
  setViewMode?: (mode: 'teoria' | 'practica') => void;
  onBack: () => void;
  contextoEvaluacion?: string | PracticalChallenge;
  setContextoEvaluacion?: (value: string | PracticalChallenge) => void;
  onOpenChat?: (moduleId?: string | null, moduleTitle?: string | null) => void;
  isAlreadyEnrolled: boolean;
  onAssessmentComplete?: (data: CompleteModuleResponse | null) => void;
}

const RouteDetail = ({
  route,
  setViewMode,
  onBack,
  setContextoEvaluacion,
  onOpenChat,
  isAlreadyEnrolled,
  onAssessmentComplete,
}: RouteDetailsProps) => {
  const LOADING_MESSAGES_LENGTH = LOADING_MESSAGES.length;

  const [routeData, setRouteData] = useState<LearningRoute | null>(route);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(null);
  const [assessingModuleId, setAssessingModuleId] = useState<string | null>(null);
  const [assessmentType, setAssessmentType] = useState<AssessmentType | null>(null);
  const [isGeneratingAssessment, setIsGeneratingAssessment] = useState(false);
  const [loadingType, setLoadingType] = useState<AssessmentType | null>(null);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [assessmentTimeoutError, setAssessmentTimeoutError] = useState(false);
  const [lastRequestedAssessment, setLastRequestedAssessment] = useState<{ moduleId: string; type: AssessmentType } | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [selectedModuleForAssessments, setSelectedModuleForAssessments] = useState<{
    id: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isGeneratingAssessment) {
      setLoadingMessageIndex(0);
      interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES_LENGTH);
      }, 4000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isGeneratingAssessment, LOADING_MESSAGES_LENGTH]);

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
    if (data && assessingModuleId) {
      setRouteData((prev) => {
        if (!prev) return prev;
        const updatedModules = prev.modules?.map((m) => {
          if (m.id === assessingModuleId) {
            return { ...m, isPassed: true, score: data.score != null ? data.score : 100 };
          }
          return m;
        });
        return {
          ...prev,
          modules: updatedModules,
          progress: data.progress ?? prev.progress,
        };
      });
      void refreshRoute();
    }
  };

  const handleGenerateAssessment = async (moduleId: string, type: AssessmentType) => {
    if (isGeneratingAssessment) return;
    setIsGeneratingAssessment(true);
    setLoadingType(type);
    setAssessingModuleId(moduleId);
    setAssessmentData(null);
    setAssessmentType(null);
    setContextoEvaluacion?.('');
    setAssessmentTimeoutError(false);
    setLastRequestedAssessment({ moduleId, type });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT_15S')), 15000);
    });

    try {
      const data = await Promise.race([
        generateAssessment({ moduleId, type }),
        timeoutPromise,
      ]);

      if (type === 'teoria') {
        setAssessmentData(data);
        setAssessmentType(type);
        setViewMode?.('teoria');
        toast.success('Cuestionario de práctica generado');
      } else if (type === 'practica') {
        if (data.practicalChallenge) setContextoEvaluacion?.(data.practicalChallenge);
        setViewMode?.('practica');
        toast.success('Reto práctico generado');
      } else {
        setAssessmentData(data);
        setAssessmentType(type);
        if (data.practicalChallenge) setContextoEvaluacion?.(data.practicalChallenge);
        setViewMode?.('teoria');
        toast.success('Reto final y cuestionario generados con éxito');
      }
    } catch (error: unknown) {
      setAssessingModuleId(null);
      setAssessmentType(null);
      if ((error as Error)?.message === 'TIMEOUT_15S') {
        setAssessmentTimeoutError(true);
        toast.warning('La generación tomó más de 15 segundos. Puedes reintentar la evaluación.');
      } else if ((error as { response?: { status?: number } })?.response?.status === 429) {
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
          <Icon name="arrowLeft" className="w-4 h-4" />
        </span>
        Regresar al catálogo de rutas
      </button>

      <RouteHeader
        route={routeData}
        isEnrolled={isEnrolled}
        isEnrolling={isEnrolling}
        onEnroll={handleEnroll}
      />

      <div className="space-y-4">
        {assessmentData && assessingModuleId && assessmentType ? (
            <div className="animate-in fade-in duration-300">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-surface-900 p-5 rounded-2xl border border-surface-200/80 dark:border-surface-800 shadow-sm">
                <div className="flex items-center gap-3.5">
                  <span className="w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 shadow-2xs">
                    <Icon name={assessmentType === 'completa' ? 'trophy' : 'fileText'} className="w-6 h-6" />
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
                  <Icon name="x" className="w-4 h-4" />
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
            <>
              {isGeneratingAssessment && (
                <div className="bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800/60 rounded-2xl p-6 text-center animate-in fade-in flex flex-col items-center justify-center gap-2 mb-4 shadow-sm">
                  <div className="w-7 h-7 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-brand-700 dark:text-brand-300 font-semibold text-sm">
                    {LOADING_MESSAGES[loadingMessageIndex]}
                  </p>
                  <p className="text-xs text-surface-500 dark:text-surface-400">
                    Conectando con la malla curricular de la ESFOT...
                  </p>
                </div>
              )}
              {assessmentTimeoutError && lastRequestedAssessment && !isGeneratingAssessment && (
                <div className="bg-brand-50 dark:bg-brand-500/10 border border-brand-200 dark:border-brand-500/25 rounded-2xl p-5 text-center animate-in fade-in flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 shadow-sm">
                  <div className="text-left">
                    <p className="text-brand-800 dark:text-brand-200 font-semibold text-sm">
                      La generación de la prueba tardó más de lo esperado (15s).
                    </p>
                    <p className="text-xs text-surface-500 dark:text-surface-400">
                      Puedes reintentar inmediatamente con el sistema de contingencia curricular.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setAssessmentTimeoutError(false);
                      void handleGenerateAssessment(lastRequestedAssessment.moduleId, lastRequestedAssessment.type);
                    }}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 shrink-0"
                  >
                    <Icon name="refreshCw" className="w-3.5 h-3.5" /> Reintentar evaluación
                  </button>
                </div>
              )}
              <ModuleList
                modules={routeData.modules}
                expandedModule={expandedModule}
                onToggle={toggleModule}
                onGenerateAssessment={handleGenerateAssessment}
                isGeneratingAssessment={isGeneratingAssessment}
                loadingType={loadingType}
                onAskTutor={
                  onOpenChat
                    ? (moduleId, moduleTitle) => onOpenChat(moduleId, moduleTitle)
                    : undefined
                }
                onViewAssessments={(id, title) =>
                  setSelectedModuleForAssessments({ id, title })
                }
              />
            </>
          )}
        </div>

      {selectedModuleForAssessments && (
        <ModuleAssessmentsModal
          isOpen={Boolean(selectedModuleForAssessments)}
          onClose={() => setSelectedModuleForAssessments(null)}
          moduleId={selectedModuleForAssessments.id}
          moduleTitle={selectedModuleForAssessments.title}
        />
      )}
    </div>
  );
};

export default RouteDetail;
