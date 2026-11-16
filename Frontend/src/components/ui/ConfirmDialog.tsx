import type { ReactNode } from 'react';
import Button, { type ButtonVariant } from './Button';
import Modal, { type ModalSize } from './Modal';

export type { ModalSize } from './Modal';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: ReactNode;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ButtonVariant;
  isLoading?: boolean;
  /** Tamaño del modal (por defecto 'sm'). */
  size?: ModalSize;
}

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmar acción',
  message = '¿Estás seguro de que deseas continuar?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  isLoading = false,
  size = 'sm',
}: ConfirmDialogProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button variant={variant} onClick={onConfirm} isLoading={isLoading}>
            {isLoading ? 'Procesando...' : confirmText}
          </Button>
        </div>
      }
    >
      <p className="text-surface-600 dark:text-surface-400">{message}</p>
    </Modal>
  );
};

export default ConfirmDialog;
