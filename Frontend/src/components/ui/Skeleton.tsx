import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

const variants = {
  text: 'h-4 w-full rounded-md',
  circle: 'rounded-full',
  rect: 'rounded-card',
} as const;

export type SkeletonVariant = keyof typeof variants;

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
}

/**
 * Placeholder de carga.
 *
 * Es puramente decorativo (`aria-hidden`): el contenedor que lo usa debe
 * anunciar el estado de carga con texto o `aria-busy`.
 */
const Skeleton = ({ variant = 'text', className = '', ...props }: SkeletonProps) => {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse bg-surface-200/80 motion-reduce:animate-none dark:bg-surface-800',
        variants[variant],
        className
      )}
      {...props}
    />
  );
};

export default Skeleton;
