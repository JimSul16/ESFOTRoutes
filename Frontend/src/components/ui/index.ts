/**
 * Barrel de la librería de UI.
 *
 * Importar siempre desde '@/components/ui' en lugar de archivos individuales,
 * para que el grafo de dependencias quede explícito.
 */

export { default as Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';

export { default as Card, CardHeader, CardBody, CardFooter } from './Card';
export type { CardProps } from './Card';

export { default as Input } from './Input';
export type { InputProps } from './Input';

export { default as Modal } from './Modal';
export type { ModalProps, ModalSize } from './Modal';

export { default as Badge } from './Badge';
export type { BadgeProps, BadgeVariant } from './Badge';

export { default as Spinner } from './Spinner';
export type { SpinnerProps, SpinnerSize } from './Spinner';

export { default as EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { default as ConfirmDialog } from './ConfirmDialog';
export type { ConfirmDialogProps } from './ConfirmDialog';

export type { IconComponent } from './types';