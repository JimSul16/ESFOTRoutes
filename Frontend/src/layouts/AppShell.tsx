import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import MobileNav from './MobileNav';
import { ShellContext } from './shellContext';
import type { MobileNavConfig } from './nav.types';

export interface AppShellProps {
  /** Barra lateral de escritorio (`hidden md:flex` dentro del componente). */
  sidebar: ReactNode;
  /** Cabecera de la pantalla; recibe el menú móvil a través de `useShell()`. */
  header: ReactNode;
  children: ReactNode;
  mobileNav: MobileNavConfig;
  /** Clases extra para el área de contenido (layout, no colores). */
  contentClassName?: string;
}

/**
 * Shell compartido de los paneles.
 *
 * - `h-dvh`: la app ocupa el viewport real del móvil (sin el salto de
 *   `h-screen` cuando aparece/desaparece la barra del navegador).
 * - Solo el `main` hace scroll; la cabecera y la barra lateral quedan fijas.
 * - En móvil conviven una barra inferior y un drawer; el contenido reserva
 *   espacio con `pb-24` para que la barra no tape el final de la pantalla.
 * - Incluye un skip link y un `main` enfocable para navegación por teclado.
 */
const AppShell = ({
  sidebar,
  header,
  children,
  mobileNav,
  contentClassName,
}: AppShellProps) => {
  const [navOpen, setNavOpen] = useState(false);

  const openMobileNav = useCallback(() => setNavOpen(true), []);
  const closeMobileNav = useCallback(() => setNavOpen(false), []);
  const shellContext = useMemo(() => ({ openMobileNav }), [openMobileNav]);

  return (
    <ShellContext.Provider value={shellContext}>
      <div className="flex h-dvh w-full overflow-hidden bg-surface-50 font-sans text-surface-900 transition-colors dark:bg-surface-950 dark:text-surface-100">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-control focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
        >
          Saltar al contenido principal
        </a>

        {sidebar}

        <div className="flex min-w-0 flex-1 flex-col">
          {header}

          <main
            id="main-content"
            tabIndex={-1}
            className={cn(
              'min-h-0 flex-1 overflow-y-auto px-4 pb-24 pt-5 sm:px-6 sm:pt-6',
              'md:px-8 md:pb-10 md:pt-8 lg:px-10',
              contentClassName
            )}
          >
            {children}
          </main>
        </div>

        <MobileNav config={mobileNav} open={navOpen} onClose={closeMobileNav} />
      </div>
    </ShellContext.Provider>
  );
};

export default AppShell;
