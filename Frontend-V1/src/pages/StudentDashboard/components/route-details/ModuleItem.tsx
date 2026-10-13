import { Button, Spinner } from '@/components/ui';
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
}: ModuleItemProps) => {
  const isReinforcement = mod.title?.includes('Refuerzo') || mod.title?.includes('Nivelación');

  return (
    <div className="bg-white dark:bg-surface-900 border border-surface-200/80 dark:border-surface-800 rounded-2xl overflow-hidden shadow-2xs transition-all duration-200 hover:border-surface-300 dark:hover:border-surface-700">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-surface-50/80 dark:hover:bg-surface-800/40 transition-colors text-left"
      >
        <div className="flex items-center gap-3.5">
          {mod.isPassed ? (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm border shadow-2xs bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : (
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm border shadow-2xs ${
              isReinforcement
                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                : 'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:border-brand-500/20'
            }`}>
              {index + 1}
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5">
            <h3 className="text-base sm:text-lg font-semibold text-surface-900 dark:text-surface-100">{mod.title}</h3>
            {mod.isPassed && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 self-start inline-flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Completado {mod.score != null ? `(${mod.score}%)` : ''}
              </span>
            )}
            {isReinforcement && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 self-start">
                Módulo de refuerzo
              </span>
            )}
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-surface-400 transform transition-transform duration-300 ${isExpanded ? 'rotate-180 text-brand-600' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="p-5 sm:p-6 border-t border-surface-100 dark:border-surface-800/80 bg-surface-50/50 dark:bg-surface-900/40">
          {mod.description && (
            <p className="text-surface-600 dark:text-surface-300 text-sm mb-6 leading-relaxed">{mod.description}</p>
          )}

          <div className="space-y-3 mb-6">
            <h4 className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-3">Recursos del módulo</h4>
            {(!mod.resources || mod.resources.length === 0) ? (
              <p className="text-surface-400 text-sm italic">No hay recursos en este módulo.</p>
            ) : (
              mod.resources.map((res) => (
                <ResourceCard key={res.id} resource={res} />
              ))
            )}
          </div>

          <div className="mt-4 pt-6 border-t border-surface-200 dark:border-surface-700 flex flex-wrap items-center justify-end gap-3">
            <Button
              variant="secondary"
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
    </div>
  );
};

export default ModuleItem;
