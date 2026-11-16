import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Texto pequeño sobre el título (sección, curso, rol). */
  eyebrow?: ReactNode;
  /** Acciones alineadas a la derecha en desktop y debajo en móvil. */
  actions?: ReactNode;
  className?: string;
}

const PageHeader = ({ title, description, eyebrow, actions, className }: PageHeaderProps) => {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-2xs font-semibold uppercase tracking-[0.14em] text-surface-500 dark:text-surface-400">
            {eyebrow}
          </p>
        )}

        <h1 className="font-display text-2xl font-bold tracking-tight text-surface-900 dark:text-surface-50 md:text-3xl">
          {title}
        </h1>

        {description && (
          <p className="mt-1.5 max-w-2xl text-sm text-pretty text-surface-500 dark:text-surface-400">
            {description}
          </p>
        )}
      </div>

      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
};

export default PageHeader;
