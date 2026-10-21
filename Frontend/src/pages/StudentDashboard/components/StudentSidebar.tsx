import type { UserDashboard } from '../../../types';
import type { StudentTab } from '../index';

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
  const navItems: { tab: StudentTab; label: string; icon: string }[] = [
    {
      tab: 'inicio',
      label: 'Centro de Mando',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    },
    {
      tab: 'explorar',
      label: 'Explorar Rutas',
      icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
    },
    {
      tab: 'mis-rutas',
      label: 'Mis Rutas',
      icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    },
    {
      tab: 'analytics',
      label: 'Analítica',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    },
    {
      tab: 'perfil',
      label: 'Mi Perfil',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    },
  ];

  const currentXp = userData.xp ?? 0;
  const nextXp = userData.nextRankXp ?? 1000;
  const xpPercent = Math.min((currentXp / nextXp) * 100, 100);

  return (
    <aside className="w-64 min-w-[16rem] h-full bg-white dark:bg-surface-900 border-r border-surface-200/80 dark:border-surface-800/80 hidden md:flex flex-col justify-between p-5 z-10 flex-shrink-0 transition-colors">
      <div className="space-y-6">
        {/* Brand */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-800 text-white flex items-center justify-center font-bold font-display text-sm shadow-sm ring-2 ring-brand-500/20">
            EPN
          </div>
          <div>
            <div className="text-base font-display font-bold text-surface-900 dark:text-white tracking-tight leading-none">
              Rutas <span className="text-brand-600 dark:text-brand-400">ESFOT</span>
            </div>
            <div className="text-[10px] font-semibold text-surface-400 uppercase tracking-widest mt-0.5">
              Estudiante
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => setActiveTab(item.tab)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all text-left ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20 font-semibold'
                    : 'text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800/70 hover:text-surface-900 dark:hover:text-white'
                }`}
              >
                <svg
                  className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-surface-400'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-2">
            <button
              onClick={onOpenSelfDiagnosis}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/50 hover:bg-brand-100 dark:hover:bg-brand-900/50 border border-brand-200/80 dark:border-brand-800/60 shadow-sm"
            >
              <span className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                <span>Autodiagnóstico</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-600 text-white font-bold tracking-wider">
                IA
              </span>
            </button>
          </div>
        </nav>
      </div>

      {/* Footer Widgets */}
      <div className="space-y-4">
        {/* Progress Box */}
        <div className="bg-surface-50 dark:bg-surface-850 p-4 rounded-2xl border border-surface-200/70 dark:border-surface-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
              Nivel Académico
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-brand-100 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300">
              Nvl. {userData.level ?? 1}
            </span>
          </div>
          <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-2 mb-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-brand-600 to-brand-700 h-2 rounded-full transition-all duration-500"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-surface-500 dark:text-surface-400">
            <span>{currentXp} XP</span>
            <span>Meta: {nextXp} XP</span>
          </div>
        </div>

        {/* Theme and Logout Controls */}
        <div className="pt-3 border-t border-surface-200 dark:border-surface-800 flex gap-2">
          <button
            onClick={toggleTheme}
            className="flex-1 flex justify-center items-center py-2.5 px-3 rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors border border-surface-200/50 dark:border-surface-700/50 text-xs font-medium gap-1.5"
            title="Alternar modo claro / oscuro"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            <span>Tema</span>
          </button>
          <button
            onClick={onLogout}
            className="flex-[2] flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 rounded-xl transition-all border border-rose-200/60 dark:border-rose-900/40"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            <span>Salir</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default StudentSidebar;
