const StudentSidebar = ({ activeTab, setActiveTab, userData, toggleTheme, onLogout }) => {
  return (
    <aside className="w-64 min-w-[16rem] h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden md:flex flex-col justify-between p-6 z-10 flex-shrink-0">
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-violet-600 to-indigo-700 text-white p-2 rounded-xl font-black text-lg tracking-tighter shadow-lg shadow-violet-500/30">
            EPN
          </div>
          <div>
            <span className="text-xl font-bold text-slate-800 dark:text-white tracking-tight block leading-none">Rutas</span>
            <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest">Estudiante</span>
          </div>
        </div>

        <nav className="space-y-2">
          <button onClick={() => setActiveTab('inicio')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${activeTab === 'inicio' ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Centro de Mando</button>
          <button onClick={() => setActiveTab('explorar')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${activeTab === 'explorar' ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Explorar Rutas</button>
          <button onClick={() => setActiveTab('mis-rutas')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${activeTab === 'mis-rutas' ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Mis Rutas</button>
        </nav>
      </div>

      <div className="space-y-4">
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Progreso Global</span>
            <span className="text-xs font-black text-violet-600 dark:text-violet-400">Nvl. {userData.level}</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mb-1">
            <div className="bg-violet-600 h-1.5 rounded-full" style={{ width: `${(userData.xp / userData.nextRankXp) * 100}%` }}></div>
          </div>
          <span className="text-[10px] text-slate-400">{userData.xp} XP para ascender</span>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex gap-2">
          <button onClick={toggleTheme} className="flex-1 flex justify-center items-center p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Tema</button>
          <button onClick={onLogout} className="flex-[4] flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-xl transition-all">Salir</button>
        </div>
      </div>
    </aside>
  );
};

export default StudentSidebar;