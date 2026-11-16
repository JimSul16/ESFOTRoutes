import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

const variants = {
  default:
    'bg-white border border-surface-200 shadow-card dark:bg-surface-900 dark:border-surface-800',
  elevated:
    'bg-white border border-surface-200/80 shadow-soft dark:bg-surface-900 dark:border-surface-800',
  interactive:
    'bg-white border border-surface-200 shadow-card transition-shadow hover:border-surface-300 hover:shadow-soft dark:bg-surface-900 dark:border-surface-800 dark:hover:border-surface-700',
  ghost: 'bg-transparent border border-transparent',
} as const;

export type CardVariant = keyof typeof variants;

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
} as const;

export type CardPadding = keyof typeof paddings;

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  /** Padding interno. Por defecto es `none` para no duplicarlo con CardBody. */
  padding?: CardPadding;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'none', className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('rounded-card', variants[variant], paddings[padding], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

interface CardSectionProps {
  className?: string;
  children?: ReactNode;
}

export const CardHeader = ({ className = '', children }: CardSectionProps) => (
  <div
    className={cn(
      'border-b border-surface-100 px-6 py-4 dark:border-surface-800',
      className
    )}
  >
    {children}
  </div>
);

export const CardBody = ({ className = '', children }: CardSectionProps) => (
  <div className={cn('px-6 py-4', className)}>{children}</div>
);

export const CardFooter = ({ className = '', children }: CardSectionProps) => (
  <div
    className={cn(
      'border-t border-surface-100 px-6 py-4 dark:border-surface-800',
      className
    )}
  >
    {children}
  </div>
);

export default Card;
