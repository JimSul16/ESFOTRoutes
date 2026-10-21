import type { ReactNode } from 'react';
import type { IconComponent } from './types';

export interface EmptyStateProps {
  /** Icono de `react-icons` que ilustra el estado vacío. */
  icon?: IconComponent;
  title: ReactNode;
  description?: ReactNode;
  /** Contenido libre (normalmente un `<Button>` de reintento). */
  action?: ReactNode;
}

const EmptyState = ({ icon: Icon, title, description, action }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-surface-400" />
        </div>
      )}
      <h3 className="text-lg font-display font-semibold text-surface-900 dark:text-white mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-surface-500 dark:text-surface-400 max-w-sm mb-6">{description}</p>
      )}
      {action}
    </div>
  );
};

export default EmptyState;