/* oxlint-disable jsx-a11y/prefer-tag-over-role -- El foco atrapado, el bloqueo de scroll y el portal se implementan a mano; <dialog> nativo no está disponible en jsdom y limita el control del backdrop. */
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';
import Icon from './Icon';

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-6xl',
} as const;

export type ModalSize = keyof typeof sizes;

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Título visible. Si se omite, usa `aria-label` para nombrar el diálogo. */
  title?: ReactNode;
  /** Descripción breve bajo el título. */
  description?: ReactNode;
  children?: ReactNode;
  /** Zona de acciones fija al pie del modal. */
  footer?: ReactNode;
  size?: ModalSize;
  /** Cerrar al hacer click en el fondo. */
  closeOnBackdrop?: boolean;
  /** Cerrar con la tecla Escape. */
  closeOnEscape?: boolean;
  /** Oculta el botón de la esquina superior derecha. */
  hideCloseButton?: boolean;
  /** Permite que el contenido decida su propio padding. */
  bodyClassName?: string;
  className?: string;
  'aria-label'?: string;
}

/**
 * Modal accesible base del sistema de diseño.
 *
 * - Se renderiza en un portal para escapar de `overflow-hidden` y `z-index`.
 * - Bloquea el scroll del documento mientras está abierto.
 * - Atrapa el foco dentro del diálogo y lo devuelve al disparador al cerrar.
 * - `role="dialog"` + `aria-modal` + título/descripción asociados.
 */
const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  hideCloseButton = false,
  bodyClassName = 'px-6 py-5',
  className,
  'aria-label': ariaLabel,
}: ModalProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Refs para que el efecto de foco solo dependa de `isOpen`: si dependiera de
  // `onClose`, cada render del padre devolvería el foco al disparador y lo
  // robaría de nuevo, interrumpiendo al usuario mientras escribe.
  const onCloseRef = useRef(onClose);
  const closeOnEscapeRef = useRef(closeOnEscape);

  useEffect(() => {
    onCloseRef.current = onClose;
    closeOnEscapeRef.current = closeOnEscape;
  }, [onClose, closeOnEscape]);

  const autoId = useId();
  const titleId = title ? `${autoId}-title` : undefined;
  const descriptionId = description ? `${autoId}-description` : undefined;

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const focusFirst = () => {
      const panel = panelRef.current;
      if (!panel) return;

      const focusable = panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      const target = focusable[0] ?? panel;
      target.focus();
    };

    // El portal ya está montado cuando corre el efecto, así que el foco entra
    // en el primer elemento interactivo (o en el panel si no hay ninguno).
    focusFirst();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEscapeRef.current) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((element) => element.getAttribute('aria-hidden') !== 'true');

      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !panel.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = overflow;

      const previous = previouslyFocusedRef.current;
      if (previous?.isConnected) previous.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4">
      <div
        data-testid="modal-backdrop"
        className="fixed inset-0 bg-surface-950/60 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none"
        aria-hidden="true"
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-label={title ? undefined : ariaLabel}
        tabIndex={-1}
        className={cn(
          'relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden',
          'rounded-t-panel border border-surface-200/80 bg-white shadow-float',
          'animate-in fade-in zoom-in-95 duration-200 motion-reduce:animate-none',
          'dark:border-surface-800 dark:bg-surface-900',
          'sm:max-h-[calc(100dvh-2rem)] sm:rounded-panel',
          sizes[size],
          className
        )}
      >
        {(title || !hideCloseButton) && (
          <div className="flex items-start justify-between gap-4 border-b border-surface-100 px-6 py-4 dark:border-surface-800">
            <div className="min-w-0">
              {title && (
                <h2
                  id={titleId}
                  className="font-display text-lg font-bold text-surface-900 dark:text-surface-50"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p
                  id={descriptionId}
                  className="mt-1 text-sm text-surface-500 dark:text-surface-400"
                >
                  {description}
                </p>
              )}
            </div>

            {!hideCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar modal"
                className={cn(
                  'shrink-0 rounded-control p-1.5 text-surface-400 transition-colors',
                  'hover:bg-surface-100 hover:text-surface-700',
                  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus/50',
                  'dark:hover:bg-surface-800 dark:hover:text-surface-200'
                )}
              >
                <Icon name="x" className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        <div className={cn('min-h-0 flex-1 overflow-y-auto custom-scrollbar', bodyClassName)}>
          {children}
        </div>

        {footer && (
          <div className="border-t border-surface-100 px-6 py-4 dark:border-surface-800">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
