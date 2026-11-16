import { cn } from '@/utils/cn';
import type { FeatureItem, FeatureTone } from '../landing.types';

/** Iconos SVG por id: markup en el componente, copy en los datos. */
const iconPaths: Record<FeatureItem['icon'], string> = {
  graph: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
  tutor: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  progress: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
};

/**
 * Tono -> clases de icono, borde de hover y pie, solo tokens del sistema.
 * Cada tono define SU gradiente completo: nunca se combinan clases
 * conflictivas (misma propiedad) porque `cn` no resuelve conflictos.
 */
const toneMap: Record<
  FeatureTone,
  { gradient: string; border: string; hover: string; footer: string }
> = {
  brand: {
    gradient: 'from-brand-600 to-brand-700',
    border: 'border-brand-500/40',
    hover: 'hover:border-brand-500/40',
    footer: 'text-brand-600 dark:text-brand-400',
  },
  accent: {
    gradient: 'from-surface-600 to-surface-900',
    border: 'border-surface-400/40',
    hover: 'hover:border-surface-500/40',
    footer: 'text-surface-700 dark:text-surface-300',
  },
  primary: {
    gradient: 'from-primary-500 to-primary-700',
    border: 'border-primary-400/40',
    hover: 'hover:border-primary-500/40',
    footer: 'text-primary-600 dark:text-primary-400',
  },
};

interface FeatureCardProps {
  item: FeatureItem;
  /** Tarjeta principal (alto mayor, tipografía ampliada) vs. compacta. */
  featured?: boolean;
}

/**
 * Tarjeta de característica. `featured` controla la desigualdad de altura
 * entre tarjetas (Spec S5): la primera respira, las compactas no.
 */
const FeatureCard = ({ item, featured = false }: FeatureCardProps) => {
  const tone = toneMap[item.tone];

  return (
    <article
      className={cn(
        'group bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-card transition-all flex flex-col',
        tone.hover,
        'hover:shadow-soft hover:-translate-y-0.5',
        featured ? 'rounded-panel p-8 lg:p-10' : 'rounded-card p-6',
      )}
    >
      <div
        className={cn(
          'rounded-xl bg-gradient-to-br text-white flex items-center justify-center border shrink-0',
          tone.gradient,
          tone.border,
          featured ? 'w-14 h-14 mb-7' : 'w-11 h-11 mb-5',
        )}
      >
        <svg
          className={featured ? 'w-7 h-7' : 'w-5 h-5'}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={iconPaths[item.icon]}
          />
        </svg>
      </div>

      <h3
        className={cn(
          'font-display font-bold text-surface-900 dark:text-white',
          featured ? 'text-2xl lg:text-3xl tracking-tight' : 'text-lg',
        )}
      >
        {item.title}
      </h3>
      <p
        className={cn(
          'mt-3 text-surface-600 dark:text-surface-400 leading-relaxed',
          featured ? 'text-base max-w-2xl' : 'text-sm',
        )}
      >
        {item.body}
      </p>

      {/* `mt-auto` empuja el pie al fondo sin competir con el padding:
          la desigualdad de altura la resuelve el propio `pt`. */}
      <div
        className={cn(
          'mt-auto border-t border-surface-100 dark:border-surface-800 text-2xs font-semibold',
          featured ? 'pt-7' : 'pt-5',
          tone.footer,
        )}
      >
        {item.footer}
      </div>
    </article>
  );
};

export default FeatureCard;
