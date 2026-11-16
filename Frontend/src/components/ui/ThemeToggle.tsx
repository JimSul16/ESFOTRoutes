import { cn } from '@/utils/cn';
import Icon from './Icon';

export type ThemeMode = 'light' | 'dark';

const sizes = {
  sm: 'h-9 w-9',
  md: 'h-10 w-10',
} as const;

export type ThemeToggleSize = keyof typeof sizes;

export interface ThemeToggleProps {
  theme: ThemeMode;
  onToggle: () => void;
  size?: ThemeToggleSize;
  className?: string;
}

/**
 * Botón de cambio de tema.
 *
 * Es controlado a propósito: el estado vive en el `ThemeProvider` (o en el
 * contenedor de la pantalla) para que todos los toggles de la app compartan
 * la misma fuente de verdad.
 */
const ThemeToggle = ({ theme, onToggle, size = 'md', className }: ThemeToggleProps) => {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
      aria-pressed={isDark}
      className={cn(
        'inline-flex items-center justify-center rounded-control border transition-colors',
        'border-surface-200 bg-white text-surface-600 hover:bg-surface-100 hover:text-surface-900',
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2',
        'dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:bg-surface-800 dark:hover:text-white',
        sizes[size],
        className
      )}
    >
      <Icon name={isDark ? 'sun' : 'moon'} className="h-4.5 w-4.5" />
    </button>
  );
};

export default ThemeToggle;
