import { forwardRef, useId, useState, type InputHTMLAttributes } from 'react';
import type { IconType } from 'react-icons';
import { LuEye, LuEyeOff } from 'react-icons/lu';
import { cn } from '@/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Mensaje de error; también activa `aria-invalid` y el anillo rojo. */
  error?: string;
  /** Texto de ayuda bajo el campo. Se oculta mientras haya error. */
  hint?: string;
  /** Icono de `react-icons` renderizado dentro del campo. */
  icon?: IconType;
  /** Clases para el contenedor externo (no para el `<input>`). */
  containerClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      icon: Icon,
      className = '',
      containerClassName = '',
      id,
      type = 'text',
      ...props
    },
    ref
  ) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const messageId = `${inputId}-message`;

    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const resolvedType = isPassword && showPassword ? 'text' : type;
    const hasMessage = Boolean(error || hint);

    return (
      <div className={cn('w-full', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {Icon && (
            <Icon
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-surface-400"
            />
          )}

          <input
            ref={ref}
            id={inputId}
            type={resolvedType}
            aria-invalid={error ? true : undefined}
            aria-describedby={hasMessage ? messageId : undefined}
            className={cn(
              'w-full rounded-control border bg-surface-50 px-4 py-2.5 text-sm text-surface-900',
              'placeholder:text-surface-400 transition-colors',
              'focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-focus/25',
              'disabled:cursor-not-allowed disabled:opacity-60',
              'dark:bg-surface-800/60 dark:text-surface-100',
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/25'
                : 'border-surface-200 dark:border-surface-700',
              Icon && 'pl-10',
              isPassword && 'pr-11',
              className
            )}
            {...props}
          />

          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className={cn(
                'absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-surface-400',
                'transition-colors hover:bg-surface-100 hover:text-surface-600',
                'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus/50',
                'dark:hover:bg-surface-700 dark:hover:text-surface-200'
              )}
            >
              {showPassword ? (
                <LuEyeOff aria-hidden="true" className="h-4.5 w-4.5" />
              ) : (
                <LuEye aria-hidden="true" className="h-4.5 w-4.5" />
              )}
            </button>
          )}
        </div>

        {error ? (
          <p id={messageId} className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : (
          hint && (
            <p id={messageId} className="mt-1.5 text-xs text-surface-500 dark:text-surface-400">
              {hint}
            </p>
          )
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
