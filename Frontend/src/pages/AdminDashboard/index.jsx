import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import AuthContext from '../../context/AuthProvider';

import UsersManager from './components/UsersManager';
import ResourcesManager from './components/ResourcesManager';
import RoutesManager from './components/RoutesManager';
import RouteBuilder from './components/RouteBuilder';
import RoleManager from './components/RoleManager';
import AdminSidebar from './components/AdminSidebar';
import AdminHeader from './components/AdminHeader';
import AdminHome from './components/AdminHome';
import AdminProfile from './components/AdminProfile';

import LiveSupportChat from '../../shared/LiveSupportChat';

const AdminDashboard = () => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [activeTab, setActiveTab] = useState('inicio');
  const [userData, setUserData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const { fetchDataBackend } = useFetch();
  const { logoutAuth } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const loadProfile = async () => {
      const response = await fetchDataBackend('/auth/profile', null, 'GET', {}, false);

      if (response && !response.error) {
        const userName = response.name || response.user?.name || 'Administrador';
        const nameParts = userName.split(' ');

        const calculatedInitials = nameParts.length > 1
          ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
          : userName.substring(0, 2).toUpperCase();

        setUserData({
          ...response,
          primaryRole: 'ADMIN',
          initials: calculatedInitials,
        });
      }
      setLoadingProfile(false);
    };

    loadProfile();
  }, []);

  const handleUpdateUserPhoto = (newPhotoUrl) => {
    setUserData(prev => ({ ...prev, profilePicture: newPhotoUrl }));
    
    const storageUser = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (storageUser) {
      const parsedUser = JSON.parse(storageUser);
      parsedUser.profilePicture = newPhotoUrl;
      const storageType = localStorage.getItem('user') ? localStorage : sessionStorage;
      storageType.setItem('user', JSON.stringify(parsedUser));
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleLogout = () => {
    logoutAuth();
    navigate('/');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'inicio': return <AdminHome />;
      case 'usuarios': return <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800"><UsersManager /></div>;
      case 'recursos': return <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800"><ResourcesManager /></div>;
      case 'rutas': return <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800"><RoutesManager /></div>;
      case 'constructor': return <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800"><RouteBuilder /></div>;
      case 'roles': return <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800"><RoleManager /></div>;
      case 'perfil': return <AdminProfile userData={userData} onPhotoUpdate={handleUpdateUserPhoto} />;
      default: return <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800"><h2 className="text-2xl font-bold mb-4">Vista Activa: {activeTab}</h2><p>Módulo en construcción...</p></div>;
    }
  };

  if (loadingProfile || !userData) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 flex overflow-hidden transition-colors duration-300">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} toggleTheme={toggleTheme} onLogout={handleLogout} />
      <div className="flex-1 flex flex-col h-full min-w-0 relative overflow-hidden">
        <AdminHeader userData={userData} setActiveTab={setActiveTab} />
        <main className="flex-1 p-6 md:p-10 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
      <LiveSupportChat userData={userData} />
    </div>
  );
};

export default AdminDashboard;