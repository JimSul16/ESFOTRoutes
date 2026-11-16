import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import Icon, { type IconName } from './Icon';

export interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  /** Icono Lucide del registro curado. */
  icon?: IconName;
  /** Acción principal (botón o enlace). */
  action?: ReactNode;
  className?: string;
}

const EmptyState = ({
  title,
  description,
  icon = 'layers',
  action,
  className,
}: EmptyStateProps) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 py-12 text-center',
        className
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100 text-surface-400 dark:bg-surface-800 dark:text-surface-500">
        <Icon name={icon} className="h-7 w-7" />
      </div>

      <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">
        {title}
      </h3>

      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-pretty text-surface-500 dark:text-surface-400">
          {description}
        </p>
      )}

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
};

export default EmptyState;
