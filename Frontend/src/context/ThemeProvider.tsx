import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ThemeContext, type Theme } from './ThemeContext';

const STORAGE_KEY = 'theme';

/**
 * Solo `'dark'` activa el modo oscuro; cualquier otro valor guardado cae a
 * claro. Antes cada pantalla repetía esta lectura y su propio `useEffect`.
 */
const readStoredTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light';
  return window.localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
};

export interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Fuente única de verdad del tema claro/oscuro.
 *
 * Mantiene la clase `dark` en `<html>` (que es lo que leen todos los estilos)
 * y persiste la preferencia en `localStorage`. El script inline de
 * `index.html` aplica la misma clase antes del primer paint para evitar el
 * flash de modo claro al recargar.
 */
const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [theme, setTheme] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'));
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export default ThemeProvider;
