import { preview } from '../landing.data';
import type { ModuleState } from '../landing.types';

/** Semántica de estado usando exclusivamente tokens del sistema (Spec S3). */
const dotByState: Record<ModuleState, string> = {
  done: 'bg-surface-900 dark:bg-surface-100',
  active: 'bg-brand-400',
  locked: 'bg-surface-300 dark:bg-surface-600',
};

const statusByState: Record<ModuleState, string> = {
  done: 'text-surface-900 dark:text-surface-100',
  active: 'text-brand-600 dark:text-brand-400',
  locked: 'text-surface-400',
};

const cardByState: Record<ModuleState, string> = {
  done: 'bg-surface-50 dark:bg-surface-850 border border-surface-200 dark:border-surface-800',
  active:
    'bg-brand-50/60 dark:bg-brand-950/30 border-2 border-brand-500/40 shadow-card relative',
  locked:
    'bg-surface-50/50 dark:bg-surface-850/50 border border-dashed border-surface-300 dark:border-surface-700 opacity-70',
};

const tagByState: Record<ModuleState, string> = {
  done: 'text-brand-600 dark:text-brand-400',
  active: 'text-brand-600 dark:text-brand-400',
  locked: 'text-surface-400',
};

/**
 * Vista previa del grafo de conocimiento: la pieza central del hero.
 * Renderiza los módulos declarados en `landing.data.ts` sin copy propio.
 */
const RoutePreviewMock = () => (
  <div className="relative mx-auto w-full max-w-4xl rounded-panel p-2 bg-gradient-to-b from-surface-200/60 via-surface-100/40 to-transparent dark:from-surface-800/80 dark:via-surface-900/40 border border-surface-200 dark:border-surface-800 shadow-float md:-rotate-[0.5deg]">
    <div className="bg-white dark:bg-surface-900 rounded-card p-6 sm:p-8 text-left border border-surface-100 dark:border-surface-800">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-surface-100 dark:border-surface-800 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-brand-400" />
          <span className="w-3 h-3 rounded-full bg-surface-500" />
          <span className="w-3 h-3 rounded-full bg-surface-300 dark:bg-surface-600" />
          <span className="text-2xs font-medium text-surface-400 ml-2">
            {preview.windowLabel}
          </span>
        </div>
        <span className="px-2.5 py-1 rounded-md text-2xs font-semibold bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
          {preview.routeBadge}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {preview.modules.map((module) => (
          <div key={module.tag} className={`p-4 rounded-card ${cardByState[module.state]}`}>
            {module.badge ? (
              <span className="absolute -top-2.5 right-3 text-2xs font-bold px-2 py-0.5 rounded-full bg-brand-600 text-white">
                {module.badge}
              </span>
            ) : null}
            <div className="flex items-center justify-between mb-2 gap-2">
              <span className={`text-2xs font-semibold ${tagByState[module.state]}`}>
                {module.tag}
              </span>
              <span className={`text-2xs font-bold ${statusByState[module.state]}`}>
                {module.status}
              </span>
            </div>
            <h4 className="text-sm font-bold text-surface-900 dark:text-white">{module.title}</h4>
            <p className="text-2xs text-surface-500 dark:text-surface-400 mt-1">{module.body}</p>
          </div>
        ))}
      </div>

      {/* Leyenda de estados: refuerza la lectura del grafo sin copy nuevo. */}
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-2xs text-surface-400">
        {preview.modules.map((module) => (
          <span key={module.tag} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${dotByState[module.state]}`} />
            {module.tag}
          </span>
        ))}
      </div>
    </div>
  </div>
);

export default RoutePreviewMock;
