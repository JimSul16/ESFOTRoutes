import { Icon, ProgressBar } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/utils/cn';
import type { UserDashboard } from '../../../types';
import { levelProgress, XP_PER_LEVEL } from '../../../utils/progress';
import type { StudentTab } from '../index';
import { STUDENT_NAV_ITEMS } from './navigation';

export interface StudentSidebarProps {
  activeTab: StudentTab;
  setActiveTab: (tab: StudentTab) => void;
  userData: UserDashboard;
  toggleTheme: () => void;
  onLogout: () => void;
  onOpenSelfDiagnosis: () => void;
}

const StudentSidebar = ({
  activeTab,
  setActiveTab,
  userData,
  toggleTheme,
  onLogout,
  onOpenSelfDiagnosis,
}: StudentSidebarProps) => {
  const { theme } = useTheme();

  // Progreso dentro del nivel actual (antes se comparaba el XP total contra
  // 1000, así que la barra se quedaba al 100 % en cuanto se subía de nivel).
  const { xpInLevel, percent: xpPercent } = levelProgress(userData.xp, userData.level);

  return (
    <aside className="hidden h-full w-[17rem] min-w-[17rem] shrink-0 flex-col justify-between border-r border-surface-200/80 bg-white p-5 transition-colors dark:border-surface-800/80 dark:bg-surface-900 md:flex">
      <div className="flex min-h-0 flex-1 flex-col gap-6">
        {/* Brand */}
        <div className="flex shrink-0 items-center gap-3 px-2 py-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-brand-800 font-display text-sm font-bold text-white shadow-sm ring-2 ring-brand-500/20">
            EPN
          </div>
          <div>
            <div className="font-display text-base font-bold leading-none tracking-tight text-surface-900 dark:text-white">
              Rutas <span className="text-brand-600 dark:text-brand-400">ESFOT</span>
            </div>
            <div className="mt-0.5 text-2xs font-semibold uppercase tracking-widest text-surface-400">
              Estudiante
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav
          aria-label="Navegación del estudiante"
          className="custom-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto pr-1"
        >
          {STUDENT_NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.tab;

            return (
              <button
                key={item.tab}
                type="button"
                onClick={() => setActiveTab(item.tab)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex w-full items-center gap-3 rounded-control px-3.5 py-2.5 text-left text-sm font-medium transition-colors',
                  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus/50',
                  isActive
                    ? 'bg-brand-600 font-semibold text-white shadow-md shadow-brand-600/20'
                    : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-300 dark:hover:bg-surface-800/70 dark:hover:text-white'
                )}
              >
                <Icon
                  name={item.icon}
                  className={cn(
                    'h-4 w-4 shrink-0 transition-colors',
                    isActive ? 'text-white' : 'text-surface-400'
                  )}
                />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-2">
            <button
              type="button"
              onClick={onOpenSelfDiagnosis}
              className="flex w-full items-center justify-between rounded-control border border-brand-200/80 bg-brand-50 px-3.5 py-2.5 text-sm font-medium text-brand-700 shadow-sm transition-colors hover:bg-brand-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus/50 dark:border-brand-800/60 dark:bg-brand-950/50 dark:text-brand-300 dark:hover:bg-brand-900/50"
            >
              <span className="flex items-center gap-2.5">
                <Icon name="sparkles" className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                <span>Autodiagnóstico</span>
              </span>
              <span className="rounded-full bg-brand-600 px-2 py-0.5 text-2xs font-bold tracking-wider text-white">
                IA
              </span>
            </button>
          </div>
        </nav>
      </div>

      {/* Footer Widgets */}
      <div className="mt-4 shrink-0 space-y-4">
        {/* Progress Box */}
        <div className="rounded-card border border-surface-200/70 bg-surface-50 p-4 dark:border-surface-800 dark:bg-surface-850">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
              Nivel Académico
            </span>
            <span className="rounded-md bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-700 dark:bg-brand-950/80 dark:text-brand-300">
              Nvl. {userData.level ?? 1}
            </span>
          </div>

          <ProgressBar value={xpPercent} size="sm" className="mb-2" />

          <div className="flex items-center justify-between text-2xs text-surface-500 dark:text-surface-400">
            <span>{xpInLevel} pts</span>
            <span>Meta: {XP_PER_LEVEL} pts</span>
          </div>
        </div>

        {/* Theme and Logout Controls */}
        <div className="flex gap-2 border-t border-surface-200 pt-3 dark:border-surface-800">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-control border border-surface-200/50 bg-surface-100 px-3 py-2.5 text-xs font-medium text-surface-600 transition-colors hover:bg-surface-200 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus/50 dark:border-surface-700/50 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
            title="Alternar modo claro / oscuro"
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="h-4 w-4" />
            <span>Tema</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="flex flex-[2] items-center justify-center gap-1.5 rounded-control border border-brand-200/60 bg-brand-50 px-3 py-2.5 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus/50 dark:border-brand-900/40 dark:bg-brand-950/40 dark:text-brand-400 dark:hover:bg-brand-900/40"
          >
            <Icon name="logOut" className="h-4 w-4" />
            <span>Salir</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default StudentSidebar;
