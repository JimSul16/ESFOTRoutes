import type { HTMLAttributes } from 'react';

const variants = {
  default: 'bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-300 border border-surface-200/80 dark:border-surface-700',
  primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 border border-primary-200/80 dark:border-primary-500/20',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-500/20',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200/80 dark:border-amber-500/20',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200/80 dark:border-red-500/20',
  accent: 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300 border border-accent-200/80 dark:border-accent-500/20',
} as const;

export type BadgeVariant = keyof typeof variants;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const Badge = ({ variant = 'default', className = '', children }: BadgeProps) => {
  return (
    <span
      className={`
      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
      ${variants[variant]} ${className}
    `}
    >
      {children}
    </span>
  );
};

export default Badge;