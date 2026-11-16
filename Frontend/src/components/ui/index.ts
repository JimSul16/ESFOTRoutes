/**
 * Barrel de la librería de UI.
 *
 * Importar siempre desde '@/components/ui' en lugar de archivos individuales,
 * para que el grafo de dependencias quede explícito.
 */

export { default as Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';

export { default as Card, CardHeader, CardBody, CardFooter } from './Card';
export type { CardProps, CardVariant, CardPadding } from './Card';

export { default as Input } from './Input';
export type { InputProps } from './Input';

export { default as Badge } from './Badge';
export type { BadgeProps, BadgeVariant, BadgeSize } from './Badge';

export { default as Spinner } from './Spinner';
export type { SpinnerProps, SpinnerSize } from './Spinner';

export { default as Icon } from './Icon';
export type { IconProps, IconName } from './Icon';

export { default as Modal } from './Modal';
export type { ModalProps, ModalSize } from './Modal';

export { default as ConfirmDialog } from './ConfirmDialog';
export type { ConfirmDialogProps } from './ConfirmDialog';

export { default as ProgressBar } from './ProgressBar';
export type { ProgressBarProps, ProgressTone, ProgressSize } from './ProgressBar';

export { default as EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { default as Skeleton } from './Skeleton';
export type { SkeletonProps, SkeletonVariant } from './Skeleton';

export { default as PageHeader } from './PageHeader';
export type { PageHeaderProps } from './PageHeader';

export { default as StatCard } from './StatCard';
export type { StatCardProps, StatTone, TrendDirection } from './StatCard';

export { default as Avatar } from './Avatar';
export type { AvatarProps, AvatarSize, AvatarStatus } from './Avatar';

export { default as ThemeToggle } from './ThemeToggle';
export type { ThemeToggleProps, ThemeToggleSize, ThemeMode } from './ThemeToggle';
