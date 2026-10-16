import { forwardRef, type InputHTMLAttributes } from 'react';
import type { IconComponent } from './types';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** Icono de `react-icons` renderizado dentro del campo. */
  icon?: IconComponent;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      icon: Icon,
      className = '',
      ...props
    },
    ref
  ) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
          )}
          <input
            ref={ref}
            className={`
            w-full px-4 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-800/60
            border ${error ? 'border-red-500' : 'border-surface-200 dark:border-surface-700'}
            text-surface-900 dark:text-surface-100 placeholder:text-surface-400
            focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500
            outline-hidden transition-all text-sm
            ${Icon ? 'pl-10' : ''} ${className}
          `}
            {...props}
          />
        </div>
        {error && (
          <p className="text-rose-500 dark:text-rose-400 text-xs mt-1.5 font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;