const AdminSidebar = ({ activeTab, setActiveTab, toggleTheme, onLogout }) => {
  return (
    <aside className="w-64 min-w-[16rem] h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden md:flex flex-col justify-between p-6 z-10 flex-shrink-0">
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-2 rounded-xl font-black text-lg tracking-tighter">
            EPN
          </div>
          <div>
            <span className="text-xl font-bold text-slate-800 dark:text-white tracking-tight block leading-none">Rutas</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Administración</span>
          </div>
        </div>

        <nav className="space-y-2">
          <button onClick={() => setActiveTab('inicio')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${activeTab === 'inicio' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Resumen Operativo</button>
          <button onClick={() => setActiveTab('usuarios')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${activeTab === 'usuarios' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Gestión de Usuarios</button>
          <button onClick={() => setActiveTab('recursos')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${activeTab === 'recursos' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Gestión de Recursos</button>
          <button onClick={() => setActiveTab('rutas')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${activeTab === 'rutas' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Rutas de Aprendizaje</button>
        </nav>
      </div>

      <div className="space-y-4">
        <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex gap-2">
          <button onClick={toggleTheme} className="flex-1 flex justify-center items-center p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Tema</button>
          <button onClick={onLogout} className="flex-[4] flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-xl transition-all">Salir</button>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;