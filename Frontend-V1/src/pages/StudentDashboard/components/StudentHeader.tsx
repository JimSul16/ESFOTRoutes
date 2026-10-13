import { useState } from 'react';
import type { UserDashboard } from '../../../types';
import type { StudentTab } from '../index';

export interface StudentHeaderProps {
  userData: UserDashboard;
  setActiveTab: (tab: StudentTab) => void;
  onOpenProfileModal?: () => void;
}

const StudentHeader = ({ userData, setActiveTab, onOpenProfileModal }: StudentHeaderProps) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleOpenProfile = () => {
    setShowProfileMenu(false);
    setActiveTab('perfil');
    if (onOpenProfileModal) {
      onOpenProfileModal();
    }
  };

  return (
    <header className="h-18 px-6 md:px-8 flex justify-between items-center shrink-0 border-b border-surface-200/80 dark:border-surface-800/80 bg-white/70 dark:bg-surface-900/70 backdrop-blur-xl sticky top-0 z-20 transition-colors">
      <div className="flex items-center gap-3">
        <h1 className="text-lg md:text-xl font-display font-bold text-surface-900 dark:text-white tracking-tight">
          Centro de Aprendizaje
        </h1>
        <span className="hidden lg:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/40">
          ESFOT • EPN
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800/60 transition-all text-left focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            aria-expanded={showProfileMenu}
          >
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-surface-900 dark:text-white leading-tight">
                {userData.name}
              </div>
              <div className="text-xs text-brand-600 dark:text-brand-400 font-medium">
                Estudiante • Nvl. {userData.level ?? 1}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-800 text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-white dark:ring-surface-800 overflow-hidden shrink-0">
              {userData.profilePicture ? (
                <img src={userData.profilePicture} alt="Perfil" className="w-full h-full object-cover" />
              ) : (
                <span>{userData.initials}</span>
              )}
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-surface-900 rounded-2xl shadow-xl border border-surface-200 dark:border-surface-800 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2.5 border-b border-surface-100 dark:border-surface-800/80 mb-1">
                <p className="text-xs font-medium text-surface-400 uppercase tracking-wider">Cuenta Conectada</p>
                <p className="text-sm font-semibold text-surface-900 dark:text-white truncate">{userData.name}</p>
                <p className="text-xs text-surface-500 dark:text-surface-400 truncate">{userData.email}</p>
              </div>

              <button
                onClick={handleOpenProfile}
                className="w-full text-left px-3 py-2 text-sm font-medium text-surface-700 dark:text-surface-200 hover:bg-brand-50 dark:hover:bg-brand-950/40 hover:text-brand-600 dark:hover:text-brand-400 rounded-xl transition-colors flex items-center gap-2.5"
              >
                <svg className="w-4 h-4 text-surface-400 group-hover:text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                Gestionar Perfil
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default StudentHeader;