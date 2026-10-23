import { useId } from 'react';
import { Badge, Button, Spinner, type BadgeVariant } from '@/components/ui';
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
}

/**
 * Tipos de módulo que puede producir el grafo curricular.
 *
 * `graphAlgorithm.js` arma los títulos de la ruta adaptativa:
 *   "Módulo 2: Nivelación y Refuerzo Focalizado"
 *   "Módulo 1: Validación y Maestría Práctica de ..."
 *   "Módulo 3: Dominio Práctico de ..."
 *   "Módulo 1: Convalidación y Repaso de Conceptos Dominados"
 * La tabla `Module` no guarda ningún campo de tipo, así que la única señal
 * disponible en el frontend es el título.
 */
type ModuleTone = 'reinforcement' | 'mastery' | 'practice' | 'standard';

interface ToneConfig {
  /** Variante del `Badge` con la etiqueta del tipo de módulo. */
  badge: BadgeVariant;
  /** Color del rail lateral: identifica el módulo de un vistazo. */
  rail: string;
  /** Estilo del contador numérico. */
  counter: string;
  icon: string;
  label: string;
}

/**
 * Paleta del proyecto: `brand` (rojo EPN) para la ruta troncal, `accent`
 * (ámbar) para los módulos de refuerzo, `primary` (azul) para la práctica
 * consolidada y `emerald` para los módulos acreditados.
 */
const TONES: Record<ModuleTone, ToneConfig> = {
  reinforcement: {
    badge: 'accent',
    rail: 'bg-accent-500',
    counter:
      'bg-accent-100 text-accent-700 border-accent-200 dark:bg-accent-500/10 dark:text-accent-300 dark:border-accent-500/25',
    icon: '⚡',
    label: 'Refuerzo sugerido',
  },
  mastery: {
    badge: 'success',
    rail: 'bg-emerald-500',
    counter:
      'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/25',
    icon: '⭐',
    label: 'Dominio avanzado acreditado',
  },
  practice: {
    badge: 'primary',
    rail: 'bg-primary-500',
    counter:
      'bg-primary-100 text-primary-700 border-primary-200 dark:bg-primary-900/40 dark:text-primary-300 dark:border-primary-500/25',
    icon: '✨',
    label: 'Práctica consolidada',
  },
  standard: {
    badge: 'brand',
    rail: 'bg-brand-500',
    counter:
      'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:border-brand-500/25',
    icon: '📘',
    label: 'Módulo troncal',
  },
};

/** Normaliza el título (sin acentos y en minúsculas) para poder compararlo. */
const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/**
 * Clasifica el módulo a partir de su título.
 *
 * La clasificación es EXCLUYENTE a propósito: antes "Dominio Práctico de ..."
 * pintaba a la vez "Dominio Avanzado Acreditado" y "Consolidación Práctica",
 * dos etiquetas incompatibles en el mismo encabezado. Ahora gana la primera
 * regla que encaja, en orden de especificidad.
 */
const clasificarModulo = (titulo?: string | null): ModuleTone => {
  const t = normalizar(titulo ?? '');
  if (!t) return 'standard';
  if (/refuerzo|nivelacion|⚡/.test(t)) return 'reinforcement';
  if (/maestria|acreditad|validacion|⭐/.test(t)) return 'mastery';
  if (/consolidacion|practica|practico|dominio|✨/.test(t)) return 'practice';
  return 'standard';
};

const CheckIcon = () => (
  <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
);

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
}: ModuleItemProps) => {
  const panelId = useId();
  const tone = TONES[clasificarModulo(mod.title)];
  const resources = mod.resources ?? [];

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border bg-white shadow-card transition-all duration-300 hover:shadow-soft dark:bg-surface-900 ${
        mod.isPassed
          ? 'border-emerald-200/90 dark:border-emerald-500/25'
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
              ? 'bg-emerald-100 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/25'
              : tone.counter
          }`}
        >
          {mod.isPassed ? <CheckIcon /> : index + 1}
        </span>

        <div className="min-w-0 flex-1">
          {/* Título del módulo */}
          <h3 className="font-display text-base font-bold leading-snug text-surface-900 sm:text-lg dark:text-surface-100">
            {mod.title}
          </h3>

          {/* Etiquetas: tipo pedagógico + estado de avance */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <Badge variant={tone.badge} className="gap-1.5 font-semibold">
              <span aria-hidden="true">{tone.icon}</span>
              {tone.label}
            </Badge>

            {mod.isPassed && (
              <Badge variant="success" className="gap-1.5 font-semibold">
                <CheckIcon />
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
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
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
            {onAskTutor && (
              <Button
                variant="secondary"
                onClick={() => onAskTutor(mod.id, mod.title)}
                disabled={isGeneratingAssessment}
              >
                💬 Consultar al tutor IA
              </Button>
            )}
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
    </article>
  );
};

export default ModuleItem;
