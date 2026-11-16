import { Link } from 'react-router-dom';
import { ThemeToggle } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { navItems } from '../landing.data';

/**
 * Barra superior de la landing: logo, enlaces ancla y accesos de sesión.
 * Comportamiento extraído verbatim desde la versión monolítica de la página.
 */
const LandingNav = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-surface-950/80 backdrop-blur-xl border-b border-surface-200/80 dark:border-surface-800/80">
      <div className="max-w-7xl mx-auto px-6 md:px-10 h-18 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-800 text-white flex items-center justify-center font-bold font-display text-base shadow-sm ring-2 ring-brand-500/20">
            EPN
          </div>
          <div>
            <span className="text-xl font-display font-bold tracking-tight text-surface-900 dark:text-white">
              Rutas <span className="text-brand-600 dark:text-brand-400">ESFOT</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-2xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 border border-surface-200 dark:border-surface-700">
              v3.0 SaaS
            </span>
          </div>
        </div>

        <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-surface-600 dark:text-surface-300">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="flex items-center space-x-3">
          <ThemeToggle theme={theme} onToggle={toggleTheme} className="shadow-xs" />
          <Link
            to="/login"
            className="hidden sm:inline-flex text-sm font-semibold text-surface-700 dark:text-surface-200 hover:text-brand-600 dark:hover:text-brand-400 px-3 py-2 transition-colors"
          >
            Iniciar sesión
          </Link>
          <Link
            to="/register"
            className="bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm hover:shadow-brand-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Registrarse
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default LandingNav;
