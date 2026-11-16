import { createContext } from 'react';

export type Theme = 'light' | 'dark';

export interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

/**
 * Valor por defecto seguro para tests y para componentes aislados.
 *
 * La app real siempre se monta dentro de `<ThemeProvider>`; este fallback evita
 * que un componente que llama a `useTheme()` sin provider reviente, sin
 * esconder el hecho de que, en ese caso, el tema no se persiste.
 */
export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
});
