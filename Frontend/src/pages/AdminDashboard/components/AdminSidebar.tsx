/** Pestañas del panel de administración. */
export type AdminTab = 'inicio' | 'usuarios' | 'recursos' | 'rutas' | 'constructor' | 'roles' | 'perfil';

export interface AdminSidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  toggleTheme: () => void;
  onLogout: () => void;
}

const AdminSidebar = ({ activeTab, setActiveTab, toggleTheme, onLogout }: AdminSidebarProps) => {
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
              Administración
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1.5">
          <button onClick={() => setActiveTab('inicio')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all text-left ${activeTab === 'inicio' ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20 font-semibold' : 'text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800/70 hover:text-surface-900 dark:hover:text-white'}`}>
            <svg className={`w-4 h-4 shrink-0 transition-colors ${activeTab === 'inicio' ? 'text-white' : 'text-surface-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m0-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            <span>Resumen Operativo</span>
          </button>
          <button onClick={() => setActiveTab('usuarios')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all text-left ${activeTab === 'usuarios' ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20 font-semibold' : 'text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800/70 hover:text-surface-900 dark:hover:text-white'}`}>
            <svg className={`w-4 h-4 shrink-0 transition-colors ${activeTab === 'usuarios' ? 'text-white' : 'text-surface-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            <span>Gestión de Usuarios</span>
          </button>
          <button onClick={() => setActiveTab('recursos')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all text-left ${activeTab === 'recursos' ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20 font-semibold' : 'text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800/70 hover:text-surface-900 dark:hover:text-white'}`}>
            <svg className={`w-4 h-4 shrink-0 transition-colors ${activeTab === 'recursos' ? 'text-white' : 'text-surface-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            <span>Gestión de Recursos</span>
          </button>
          <button onClick={() => setActiveTab('rutas')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all text-left ${activeTab === 'rutas' ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20 font-semibold' : 'text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800/70 hover:text-surface-900 dark:hover:text-white'}`}>
            <svg className={`w-4 h-4 shrink-0 transition-colors ${activeTab === 'rutas' ? 'text-white' : 'text-surface-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
            <span>Rutas de Aprendizaje</span>
          </button>
        </nav>
      </div>

      {/* Footer Widgets */}
      <div className="space-y-4">
        {/* Progress Box */}
        <div className="bg-surface-50 dark:bg-surface-850 p-4 rounded-2xl border border-surface-200/70 dark:border-surface-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
              Estado del Sistema
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-brand-100 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300">
              Admin
            </span>
          </div>
          <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-2 mb-2 overflow-hidden">
            <div className="bg-gradient-to-r from-brand-600 to-brand-700 h-2 rounded-full transition-all duration-500" style={{ width: '100%' }} />
          </div>
          <div className="flex justify-between items-center text-[11px] text-surface-500 dark:text-surface-400">
            <span>Acceso Total</span>
            <span>Activo</span>
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

export default AdminSidebar;