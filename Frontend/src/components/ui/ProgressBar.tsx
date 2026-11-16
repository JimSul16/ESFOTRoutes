/* oxlint-disable jsx-a11y/prefer-tag-over-role -- Se usa role="progressbar" sobre divs para poder estilar el track y el relleno de forma consistente en todos los navegadores; <progress> nativo no permite el mismo control visual. */
import { cn } from '@/utils/cn';

const tones = {
  brand: 'bg-brand-500',
  primary: 'bg-brand-500',
  accent: 'bg-surface-700',
  success: 'bg-surface-900 dark:bg-surface-100',
} as const;

export type ProgressTone = keyof typeof tones;

const sizes = {
  sm: 'h-1.5',
  md: 'h-2.5',
} as const;

export type ProgressSize = keyof typeof sizes;

export interface ProgressBarProps {
  value: number;
  max?: number;
  /** Etiqueta visible y nombre accesible de la barra. */
  label?: string;
  /** Muestra el porcentaje a la derecha de la etiqueta. */
  showValue?: boolean;
  tone?: ProgressTone;
  size?: ProgressSize;
  className?: string;
}

const ProgressBar = ({
  value,
  max = 100,
  label,
  showValue = false,
  tone = 'brand',
  size = 'md',
  className,
}: ProgressBarProps) => {
  const safeMax = max > 0 ? max : 100;
  const ratio = Number.isFinite(value) ? value / safeMax : 0;
  const percentage = Math.min(100, Math.max(0, ratio * 100));
  const rounded = Math.round(percentage);

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between gap-3">
          {label && (
            <span className="text-xs font-medium text-surface-600 dark:text-surface-400">
              {label}
            </span>
          )}
          {showValue && (
            <span className="text-xs font-semibold tabular-nums text-surface-700 dark:text-surface-300">
              {rounded}%
            </span>
          )}
        </div>
      )}

      <div
        role="progressbar"
        aria-label={label ?? 'Progreso'}
        aria-valuenow={rounded}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn(
          'w-full overflow-hidden rounded-full bg-surface-100 dark:bg-surface-800',
          sizes[size]
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none',
            tones[tone]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
