/* oxlint-disable jsx-a11y/prefer-tag-over-role -- El drawer necesita `role="dialog"` con foco gestionado a mano; <dialog> nativo no permite controlar el backdrop ni el foco de forma consistente en todos los navegadores. */
import { useEffect, useRef } from 'react';
import { Icon, ThemeToggle } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/utils/cn';
import type { MobileNavConfig } from './nav.types';

interface MobileNavProps {
  config: MobileNavConfig;
  open: boolean;
  onClose: () => void;
}

const itemBase =
  'flex w-full items-center gap-3 rounded-control px-3.5 py-2.5 text-left text-sm font-medium transition-colors';
const itemActive =
  'bg-brand-600 text-white shadow-md shadow-brand-600/20 font-semibold';
const itemIdle =
  'text-surface-600 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-300 dark:hover:bg-surface-800/70 dark:hover:text-white';

/**
 * Navegación móvil del shell.
 *
 * - Barra inferior fija con los accesos primarios (siempre visible).
 * - Drawer lateral con la navegación completa, el autodiagnóstico y las
 *   acciones de cuenta.
 *
 * Las etiquetas cortas de la barra inferior son distintas de las etiquetas
 * completas de la barra lateral a propósito: evitan duplicar nombres
 * accesibles y mantienen la barra legible a 360 px.
 */
const MobileNav = ({ config, open, onClose }: MobileNavProps) => {
  const { theme, toggleTheme } = useTheme();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const bottomItems = config.items.filter((item) => item.primary !== false).slice(0, 5);

  return (
    <>
      <nav
        aria-label="Navegación rápida"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-surface-200/80 bg-white/95 shadow-[0_-8px_24px_-16px_rgb(12_10_9/0.35)] backdrop-blur-xl dark:border-surface-800/80 dark:bg-surface-900/95 md:hidden"
      >
        <ul className="mx-auto flex max-w-md items-stretch gap-0.5 px-2 pb-1.5 pt-1">
          {bottomItems.map((item) => {
            const isActive = config.activeTab === item.tab;

            return (
              <li key={item.tab} className="flex-1">
                <button
                  type="button"
                  onClick={() => config.onNavigate(item.tab)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex w-full flex-col items-center gap-0.5 rounded-control px-1 py-1 text-2xs font-medium transition-colors',
                    'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus/50',
                    isActive
                      ? 'text-brand-600 dark:text-brand-400'
                      : 'text-surface-500 hover:text-surface-900 dark:text-surface-400 dark:hover:text-white'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-8 w-12 items-center justify-center rounded-full transition-colors',
                      isActive && 'bg-brand-50 dark:bg-brand-500/10'
                    )}
                  >
                    <Icon name={item.icon} className="h-5 w-5" />
                  </span>
                  <span className="max-w-full truncate">{item.shortLabel}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar el menú de navegación"
            className="absolute inset-0 h-full w-full bg-surface-950/50 backdrop-blur-sm"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navegación principal"
            className="relative flex h-full w-[17rem] max-w-[85vw] flex-col border-r border-surface-200/80 bg-white shadow-float animate-in fade-in duration-200 dark:border-surface-800 dark:bg-surface-900"
          >
            <div className="flex items-center justify-between gap-3 border-b border-surface-100 px-5 py-4 dark:border-surface-800">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-brand-800 font-display text-sm font-bold text-white shadow-sm ring-2 ring-brand-500/20">
                  EPN
                </div>
                <div className="min-w-0">
                  <div className="truncate font-display text-base font-bold leading-none tracking-tight text-surface-900 dark:text-white">
                    Rutas <span className="text-brand-600 dark:text-brand-400">ESFOT</span>
                  </div>
                  <div className="mt-0.5 text-2xs font-semibold uppercase tracking-widest text-surface-400">
                    {config.brandSubtitle}
                  </div>
                </div>
              </div>

              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                aria-label="Cerrar navegación"
                className="shrink-0 rounded-control p-1.5 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus/50 dark:hover:bg-surface-800 dark:hover:text-surface-200"
              >
                <Icon name="x" className="h-5 w-5" />
              </button>
            </div>

            <nav
              aria-label="Navegación del panel"
              className="custom-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto px-4 py-4"
            >
              {config.items.map((item) => {
                const isActive = config.activeTab === item.tab;

                return (
                  <button
                    key={item.tab}
                    type="button"
                    onClick={() => {
                      config.onNavigate(item.tab);
                      onClose();
                    }}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      itemBase,
                      'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus/50',
                      isActive ? itemActive : itemIdle
                    )}
                  >
                    <Icon
                      name={item.icon}
                      className={cn(
                        'h-4 w-4 shrink-0',
                        isActive ? 'text-white' : 'text-surface-400'
                      )}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {config.onOpenSelfDiagnosis && (
              <div className="px-4 pb-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    config.onOpenSelfDiagnosis?.();
                  }}
                  className="flex w-full items-center justify-between gap-2 rounded-control border border-brand-200/80 bg-brand-50 px-3.5 py-2.5 text-left text-sm font-semibold text-brand-700 shadow-sm transition-colors hover:bg-brand-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus/50 dark:border-brand-800/60 dark:bg-brand-950/50 dark:text-brand-300 dark:hover:bg-brand-900/50"
                >
                  <span className="flex items-center gap-2.5">
                    <Icon name="sparkles" className="h-4 w-4" />
                    <span>{config.selfDiagnosisLabel ?? 'Autodiagnóstico'}</span>
                  </span>
                  <span className="rounded-full bg-brand-600 px-2 py-0.5 text-2xs font-bold tracking-wider text-white">
                    IA
                  </span>
                </button>
              </div>
            )}

            <div className="space-y-3 border-t border-surface-100 px-4 py-4 dark:border-surface-800">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-surface-600 dark:text-surface-300">
                  Tema
                </span>
                <ThemeToggle theme={theme} onToggle={toggleTheme} size="sm" />
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  config.onLogout();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-control border border-brand-200/60 bg-brand-50 px-3 py-2.5 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus/50 dark:border-brand-900/40 dark:bg-brand-950/40 dark:text-brand-400 dark:hover:bg-brand-900/40"
              >
                <Icon name="logOut" className="h-4 w-4" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileNav;
