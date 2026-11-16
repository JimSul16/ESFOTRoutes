import { useId } from 'react';
import { Badge, Button, Icon, Spinner } from '@/components/ui';
import { getModuleToneMeta } from '@/utils/uiMaps';
import ResourceCard from './ResourceCard';
import type { Module } from '../../../../types';
import type { AssessmentType } from '../../../../types';

export interface ModuleItemProps {
  module: Module;
  index: number;
  isExpanded: boolean;
  isLast: boolean;
  onToggle: () => void;
  onGenerateAssessment: (moduleId: string, type: AssessmentType) => void;
  isGeneratingAssessment: boolean;
  loadingType?: AssessmentType | null;
  /** Abre el tutor IA con el contexto de este módulo (GraphRAG). */
  onAskTutor?: (moduleId: string, moduleTitle: string) => void;
  /** Abre el modal con el historial de evaluaciones del módulo (RR-008). */
  onViewAssessments?: (moduleId: string, moduleTitle: string) => void;
}

const ModuleItem = ({
  module: mod,
  index,
  isExpanded,
  isLast,
  onToggle,
  onGenerateAssessment,
  isGeneratingAssessment,
  loadingType,
  onAskTutor,
  onViewAssessments,
}: ModuleItemProps) => {
  const panelId = useId();
  const tone = getModuleToneMeta(mod.title);
  const resources = mod.resources ?? [];

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border bg-white shadow-card transition-all duration-300 hover:shadow-soft dark:bg-surface-900 ${
        mod.isPassed
          ? 'border-surface-500 dark:border-surface-400'
          : 'border-surface-200/80 dark:border-surface-800'
      }`}
    >
      {/* Rail lateral: codifica el tipo de módulo sin depender del texto. */}
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${tone.rail}`} />

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        className="flex w-full items-start gap-4 py-4 pl-5 pr-4 text-left transition-colors hover:bg-surface-50/70 sm:py-5 sm:pl-6 sm:pr-5 dark:hover:bg-surface-800/40"
      >
        {/* Contador del módulo */}
        <span
          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-bold transition-transform duration-300 group-hover:scale-105 ${
            mod.isPassed
              ? 'bg-surface-900 text-surface-50 border-surface-900 dark:bg-surface-100 dark:text-surface-900 dark:border-surface-100'
              : tone.counter
          }`}
        >
          {mod.isPassed ? <Icon name="check" className="h-4 w-4" /> : index + 1}
        </span>

        <div className="min-w-0 flex-1">
          {/* Título del módulo */}
          <h3 className="font-display text-base font-bold leading-snug text-surface-900 sm:text-lg dark:text-surface-100">
            {mod.title}
          </h3>

          {/* Etiquetas: tipo pedagógico + estado de avance */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <Badge variant={tone.variant} className="gap-1.5 font-semibold">
              <Icon name={tone.icon} className="h-3.5 w-3.5" />
              {tone.label}
            </Badge>

            {mod.isPassed && (
              <Badge variant="success" className="gap-1.5 font-semibold">
                <Icon name="check" className="h-4 w-4" />
                Completado{mod.score != null ? ` · ${mod.score}%` : ''}
              </Badge>
            )}
          </div>

          {/* Vista previa de la descripción (el texto completo se muestra al expandir). */}
          {!isExpanded && mod.description && (
            <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-surface-500 dark:text-surface-400">
              {mod.description}
            </p>
          )}
        </div>

        {/* Indicador de expansión */}
        <span
          aria-hidden="true"
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-all duration-300 ${
            isExpanded
              ? 'rotate-180 border-brand-200 bg-brand-50 text-brand-600 dark:border-brand-500/25 dark:bg-brand-500/10 dark:text-brand-300'
              : 'border-surface-200 text-surface-400 group-hover:border-surface-300 group-hover:text-surface-600 dark:border-surface-800 dark:group-hover:border-surface-700 dark:group-hover:text-surface-300'
          }`}
        >
          <Icon name="chevronDown" className="h-4 w-4" />
        </span>
      </button>

      {isExpanded && (
        <div
          id={panelId}
          className="border-t border-surface-100 bg-surface-50/60 px-5 py-5 sm:px-6 sm:py-6 dark:border-surface-800/80 dark:bg-surface-950/30"
        >
          {mod.description && (
            <p className="mb-6 text-sm leading-relaxed text-surface-600 dark:text-surface-300">
              {mod.description}
            </p>
          )}

          <div className="mb-6 space-y-3">
            <div className="mb-3 flex items-center gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                Recursos del módulo
              </h4>
              <span className="rounded-md bg-surface-100 px-1.5 py-0.5 text-[11px] font-semibold text-surface-500 dark:bg-surface-800 dark:text-surface-400">
                {resources.length}
              </span>
            </div>

            {resources.length === 0 ? (
              <p className="text-sm italic text-surface-400">No hay recursos en este módulo.</p>
            ) : (
              resources.map((res) => <ResourceCard key={res.id} resource={res} />)
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-3 border-t border-surface-200 pt-6 dark:border-surface-700">
            {onViewAssessments && (
              <Button
                variant="ghost"
                onClick={() => onViewAssessments(mod.id, mod.title)}
                className="gap-2"
              >
                <Icon name="listChecks" className="h-4 w-4" />
                Historial de evaluaciones
              </Button>
            )}
            {onAskTutor && (
              <Button
                variant="secondary"
                onClick={() => onAskTutor(mod.id, mod.title)}
                disabled={isGeneratingAssessment}
                className="gap-2"
              >
                <Icon name="bot" className="h-4 w-4" />
                Consultar al tutor IA
              </Button>
            )}
            <Button
              variant="accent"
              onClick={() => onGenerateAssessment(mod.id, 'teoria')}
              disabled={isGeneratingAssessment}
            >
              {loadingType === 'teoria' ? <Spinner size="sm" /> : null}
              {loadingType === 'teoria' ? 'Generando...' : mod.isPassed ? 'Repasar cuestionario' : 'Generar cuestionario'}
            </Button>
            {isLast && (
              <Button
                onClick={() => onGenerateAssessment(mod.id, 'completa')}
                disabled={isGeneratingAssessment}
              >
                {loadingType === 'completa' ? <Spinner size="sm" /> : null}
                {loadingType === 'completa' ? 'Generando...' : 'Iniciar reto final'}
              </Button>
            )}
          </div>
        </div>
      )}
    </article>
  );
};

export default ModuleItem;
