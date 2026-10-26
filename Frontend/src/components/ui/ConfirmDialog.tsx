import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Button, { type ButtonVariant } from './Button';

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
} as const;

export type ModalSize = keyof typeof sizes;

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
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={`
        w-full ${sizes[size]} bg-white dark:bg-surface-900 rounded-3xl shadow-2xl
        border border-surface-200/80 dark:border-surface-800 overflow-hidden
        animate-in fade-in zoom-in-95 duration-200
      `}
      >
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-surface-100 dark:border-surface-800">
          <h3 className="text-lg font-display font-bold text-surface-900 dark:text-surface-100">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            aria-label="Cerrar modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-surface-600 dark:text-surface-400 mb-6">{message}</p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={onClose} disabled={isLoading}>
              {cancelText}
            </Button>
            <Button variant={variant} onClick={onConfirm} disabled={isLoading}>
              {isLoading ? 'Procesando...' : confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmDialog;