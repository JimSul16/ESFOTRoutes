import { useState } from 'react';

const StudentHeader = ({ userData, setActiveTab }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="h-20 px-6 md:px-10 flex justify-between items-center shrink-0 border-b border-slate-200 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-extrabold text-slate-800 dark:text-white hidden sm:block">Centro de Entrenamiento Técnico</h1>
      </div>

      <div className="flex items-center gap-5">
        <div className="relative">
          <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="flex items-center gap-3 text-left focus:outline-none">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-slate-800 dark:text-white">{userData.name}</div>
              <div className="text-xs font-semibold text-violet-600 dark:text-violet-400">Estudiante</div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-violet-500/20 border-2 border-white dark:border-slate-800 overflow-hidden">
              {userData.profilePicture ? (
                <img src={userData.profilePicture} alt="Perfil" className="w-full h-full object-cover" />
              ) : (
                userData.initials
              )}
            </div>
          </button>
          {showProfileMenu && (
            <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50">
              <div className="p-2">
                <button 
                  onClick={() => {
                    setActiveTab('perfil');
                    setShowProfileMenu(false);
                  }} 
                  className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                >
                  Gestionar Perfil
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default StudentHeader;