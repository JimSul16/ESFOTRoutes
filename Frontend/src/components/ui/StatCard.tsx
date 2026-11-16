import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import Icon, { type IconName } from './Icon';

const tones = {
  brand: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300',
  primary: 'bg-brand-600 text-white dark:bg-brand-600 dark:text-white',
  accent: 'bg-surface-900 text-white dark:bg-surface-100 dark:text-surface-900',
  success:
    'bg-surface-200 text-surface-900 dark:bg-surface-700 dark:text-surface-50',
  neutral: 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300',
} as const;

export type StatTone = keyof typeof tones;

const trendStyles = {
  up: 'text-surface-900 dark:text-surface-100',
  down: 'text-brand-600 dark:text-brand-400',
  flat: 'text-surface-500 dark:text-surface-400',
} as const;

export type TrendDirection = keyof typeof trendStyles;

const trendIcons: Record<TrendDirection, IconName> = {
  up: 'trendingUp',
  down: 'trendingDown',
  flat: 'minus',
};

export interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  icon?: IconName;
  /** Texto auxiliar bajo el valor. */
  hint?: ReactNode;
  /** Cambio respecto al periodo anterior, p. ej. "+12%". */
  trend?: ReactNode;
  trendDirection?: TrendDirection;
  tone?: StatTone;
  className?: string;
}

const StatCard = ({
  label,
  value,
  icon,
  hint,
  trend,
  trendDirection = 'flat',
  tone = 'brand',
  className,
}: StatCardProps) => {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 rounded-card border border-surface-200 bg-white p-5 shadow-card',
        'dark:border-surface-800 dark:bg-surface-900',
        className
      )}
    >
      <div className="min-w-0">
        <p className="text-xs font-medium text-surface-500 dark:text-surface-400">{label}</p>

        <p className="mt-1.5 font-display text-2xl font-bold tabular-nums tracking-tight text-surface-900 dark:text-surface-50">
          {value}
        </p>

        {(hint || trend) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {trend && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-xs font-semibold',
                  trendStyles[trendDirection]
                )}
              >
                <Icon name={trendIcons[trendDirection]} className="h-3.5 w-3.5" />
                {trend}
              </span>
            )}

            {hint && (
              <span className="text-xs text-surface-500 dark:text-surface-400">{hint}</span>
            )}
          </div>
        )}
      </div>

      {icon && (
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-control',
            tones[tone]
          )}
        >
          <Icon name={icon} className="h-5 w-5" />
        </div>
      )}
    </div>
  );
};

export default StatCard;
