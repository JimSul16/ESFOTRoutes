import { forwardRef, type ButtonHTMLAttributes } from 'react';

const variants = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 focus:ring-primary-500/30 shadow-2xs hover:shadow-primary-500/20',
  secondary: 'bg-surface-100 text-surface-800 hover:bg-surface-200/80 active:bg-surface-200 focus:ring-surface-400 dark:bg-surface-800 dark:text-surface-200 dark:hover:bg-surface-700 border border-surface-200/80 dark:border-surface-700',
  ghost: 'bg-transparent text-surface-600 hover:bg-surface-100/80 focus:ring-surface-400 dark:text-surface-300 dark:hover:bg-surface-800',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus:ring-red-500/30 shadow-2xs',
  accent: 'bg-accent-500 text-white hover:bg-accent-600 focus:ring-accent-400 shadow-2xs',
} as const;

export type ButtonVariant = keyof typeof variants;

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
} as const;

export type ButtonSize = keyof typeof sizes;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={`
        inline-flex items-center justify-center gap-2 font-semibold rounded-xl
        transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer
        ${variants[variant]} ${sizes[size]} ${className}
      `}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;