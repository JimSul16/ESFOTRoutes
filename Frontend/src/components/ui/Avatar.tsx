import { useState, type HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

const sizes = {
  xs: 'h-6 w-6 text-2xs',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
} as const;

export type AvatarSize = keyof typeof sizes;

const statusStyles = {
  online: 'bg-surface-900 dark:bg-surface-100',
  away: 'bg-surface-400',
  offline: 'bg-surface-300 dark:bg-surface-600',
} as const;

export type AvatarStatus = keyof typeof statusStyles;

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  /** Nombre completo; se usa para las iniciales y como texto alternativo. */
  name: string;
  src?: string | null;
  size?: AvatarSize;
  status?: AvatarStatus;
}

const getInitials = (name: string): string => {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || '?';
};

const Avatar = ({
  name,
  src,
  size = 'md',
  status,
  className = '',
  ...props
}: AvatarProps) => {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div className={cn('relative inline-flex shrink-0', className)} {...props}>
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={name}
          onError={() => setFailed(true)}
          className={cn(
            'rounded-full object-cover ring-1 ring-surface-200/80 dark:ring-surface-700',
            sizes[size]
          )}
        />
      ) : (
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700',
            'ring-1 ring-brand-200/70 dark:bg-brand-500/15 dark:text-brand-200 dark:ring-brand-500/25',
            sizes[size]
          )}
        >
          <span aria-hidden="true">{getInitials(name)}</span>
          <span className="sr-only">{name}</span>
        </span>
      )}

      {status && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-surface-900',
            statusStyles[status]
          )}
        />
      )}
    </div>
  );
};

export default Avatar;
