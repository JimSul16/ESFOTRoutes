import { createContext, useContext } from 'react';

export interface ShellContextValue {
  openMobileNav: () => void;
}

/**
 * Valor por defecto para cabeceras montadas fuera de `<AppShell>` (tests).
 * Sin shell, el botón de menú simplemente no hace nada.
 */
export const ShellContext = createContext<ShellContextValue>({
  openMobileNav: () => {},
});

export const useShell = (): ShellContextValue => useContext(ShellContext);
