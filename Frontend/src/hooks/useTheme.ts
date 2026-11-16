import { useContext } from 'react';
import { ThemeContext, type ThemeContextValue } from '@/context/ThemeContext';

/**
 * Acceso al tema global.
 *
 * Devuelve el valor por defecto del contexto cuando se usa fuera de
 * `<ThemeProvider>` (por ejemplo, en tests que montan una pantalla aislada),
 * de modo que el componente siempre puede leer `theme` y `toggleTheme` sin
 * comprobaciones defensivas.
 */
export const useTheme = (): ThemeContextValue => useContext(ThemeContext);

export default useTheme;
