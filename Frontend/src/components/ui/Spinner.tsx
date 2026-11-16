import type { SVGAttributes } from 'react';
import { cn } from '@/utils/cn';

const sizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
} as const;

export type SpinnerSize = keyof typeof sizes;

export interface SpinnerProps extends SVGAttributes<SVGSVGElement> {
  size?: SpinnerSize;
  /** Texto para lectores de pantalla. Sin `label` el icono es decorativo. */
  label?: string;
}

const Spinner = ({ size = 'md', label, className = '', ...props }: SpinnerProps) => {
  return (
    <svg
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      className={cn('animate-spin', sizes[size], className)}
      fill="none"
      viewBox="0 0 24 24"
      {...props}
    >
      {label && <title>{label}</title>}
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

export default Spinner;
