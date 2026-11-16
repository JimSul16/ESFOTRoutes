import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

const variants = {
  default:
    'bg-surface-100 text-surface-700 border border-surface-200/80 dark:bg-surface-800 dark:text-surface-300 dark:border-surface-700',
  brand:
    'bg-brand-50 text-brand-700 border border-brand-200/80 dark:bg-brand-500/10 dark:text-brand-300 dark:border-brand-500/20',
  primary:
    'bg-brand-600 text-white border border-brand-600 dark:bg-brand-500 dark:text-white dark:border-brand-500',
  success:
    'bg-surface-900 text-surface-50 border border-surface-900 dark:bg-surface-100 dark:text-surface-900 dark:border-surface-100',
  warning:
    'bg-transparent text-brand-700 border border-brand-300 dark:text-brand-300 dark:border-brand-500/40',
  danger:
    'bg-brand-600 text-white border border-brand-600 dark:bg-brand-500 dark:text-white dark:border-brand-500',
  accent:
    'bg-transparent text-surface-700 border border-surface-400 dark:text-surface-300 dark:border-surface-600',
} as const;

export type BadgeVariant = keyof typeof variants;

const sizes = {
  sm: 'px-2 py-0.5 text-2xs gap-1',
  md: 'px-2.5 py-0.5 text-xs gap-1.5',
} as const;

export type BadgeSize = keyof typeof sizes;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Punto de estado a la izquierda; hereda el color del texto. */
  dot?: boolean;
}

const Badge = ({
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
  children,
  ...props
}: BadgeProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium whitespace-nowrap',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {dot && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
};

export default Badge;
