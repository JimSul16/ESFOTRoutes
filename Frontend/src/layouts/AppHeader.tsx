import { useEffect, useRef, useState } from 'react';
import { Badge, Icon } from '@/components/ui';
import { cn } from '@/utils/cn';

import type { UserDashboard } from '@/types';

export interface AppHeaderProps {
  title: string;
  userData: UserDashboard;
  /** Rol y contexto que se muestran bajo el nombre (ej. "Estudiante • Nvl. 2"). */
  roleLabel: string;
  onOpenMenu: () => void;
  /** Chip institucional junto al título. */
  badge?: string;
  profileImageAlt?: string;
}

/**
 * Cabecera compartida de los paneles.
 *
 * Centraliza el botón de menú móvil, el título, el chip institucional y el
 * menú de cuenta. El menú se cierra al hacer click fuera o con Escape.
 */
const AppHeader = ({
  title,
  userData,
  roleLabel,
  onOpenMenu,
  badge,
  profileImageAlt = 'Perfil',
}: AppHeaderProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-surface-200/80 bg-white/80 px-4 backdrop-blur-xl transition-colors dark:border-surface-800/80 dark:bg-surface-900/80 sm:px-6 md:h-18 md:px-8 z-50">
      <div className="flex min-w-0 items-center gap-2.5">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Abrir navegación"
          className="-ml-1 shrink-0 rounded-control p-2 text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus/50 dark:text-surface-400 dark:hover:bg-surface-100 dark:hover:text-white md:hidden"
        >
          <Icon name="menu" className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <div className="truncate font-display text-base font-bold tracking-tight text-surface-900 dark:text-white sm:text-lg md:text-xl">
            {title}
          </div>
          <p className="hidden truncate text-2xs font-medium text-surface-400 sm:block">
            {roleLabel}
          </p>
        </div>

        {badge && (
          <Badge variant="default" size="sm" className="hidden shrink-0 lg:inline-flex">
            {badge}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden text-xs text-surface-500 dark:text-surface-400">
          Perfil
        </span>
      </div>

      <div ref={menuRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className="flex items-center gap-3 rounded-control p-1.5 text-left transition-colors hover:bg-surface-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus/50 dark:hover:bg-surface-800/60"
        >
          <div className="hidden text-right sm:block">
            <div className="max-w-[12rem] truncate text-sm font-semibold leading-tight text-surface-900 dark:text-white">
              {userData.name}
            </div>
            <div className="max-w-[12rem] truncate text-xs font-medium text-brand-600 dark:text-brand-400">
              {roleLabel}
            </div>
          </div>

          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-tr from-brand-600 to-brand-800 text-sm font-bold text-white shadow-sm ring-2 ring-white dark:ring-surface-800">
            {userData.profilePicture ? (
              <img src={userData.profilePicture} alt={profileImageAlt} className="h-full w-full object-cover" />
            ) : (
              <span>{userData.initials}</span>
            )}
          </div>
        </button>

        {menuOpen && (
          <div
            role="menu"
            className={cn(
              'absolute right-0 z-50 mt-2 w-64 rounded-card border border-surface-200 bg-white p-2 shadow-xl',
              'animate-in fade-in zoom-in-95 duration-150 dark:border-surface-800 dark:bg-surface-900'
            )}
          >
            <div className="mb-1 border-b border-surface-100 px-3 py-2.5 dark:border-surface-800/80">
              <p className="text-2xs font-medium uppercase tracking-wider text-surface-400">
                Cuenta conectada
              </p>
              <p className="truncate text-sm font-semibold text-surface-900 dark:text-white">
                {userData.name}
              </p>
              <p className="truncate text-xs text-surface-500 dark:text-surface-400">
                {userData.email}
              </p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default AppHeader;