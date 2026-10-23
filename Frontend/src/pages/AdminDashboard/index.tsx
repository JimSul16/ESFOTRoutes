import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile } from '../../api/auth.api';
import { getApiErrorMessage } from '../../api/errors';
import { useAuth } from '../../hooks/useAuth';
import type { UserDashboard } from '../../types';
import type { AdminTab } from './components/AdminSidebar';

import UsersManager from './components/UsersManager';
import ResourcesManager from './components/ResourcesManager';
import RoutesManager from './components/RoutesManager';
import RouteBuilder from './components/RouteBuilder';
import RoleManager from './components/RoleManager';
import AdminSidebar from './components/AdminSidebar';
import AdminHeader from './components/AdminHeader';
import AdminHome from './components/AdminHome';
import AdminProfile from './components/AdminProfile';


type Theme = 'light' | 'dark';

const readStoredTheme = (): Theme => (localStorage.getItem('theme') === 'dark' ? 'dark' : 'light');

/** El backend ya persiste `initials`; esto solo cubre datos antiguos. */
const deriveInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
};

const AdminDashboard = () => {
  const [theme, setTheme] = useState<Theme>(readStoredTheme);
  const [activeTab, setActiveTab] = useState<AdminTab>('inicio');
  const [userData, setUserData] = useState<UserDashboard | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const { logoutAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const loadProfile = useCallback(async () => {
    setProfileError(null);
    setLoadingProfile(true);

    try {
      // Antes leía `response.name` sobre la respuesta de Axios (que trae
      // `.data.name`), así que el nombre real nunca llegaba y siempre caía
      // al literal 'Administrador'.
      const profile = await getProfile();

      setUserData({
        ...profile,
        primaryRole: 'ADMIN',
        initials: profile.initials || deriveInitials(profile.name),
      });
    } catch (error: unknown) {
      // Sin esto la promesa quedaba rechazada sin capturar y `userData`
      // se quedaba en null, con lo que el panel se quedaba en un spinner
      // infinito y sin forma de reintentar.
      setProfileError(getApiErrorMessage(error, 'No se pudo cargar tu perfil.'));
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleUpdateUserPhoto = (newPhotoUrl: string) => {
    setUserData((prev) => (prev ? { ...prev, profilePicture: newPhotoUrl } : prev));

    // `AuthProvider` solo escribe en sessionStorage; el fallback a
    // localStorage se conserva por compatibilidad con sesiones antiguas.
    for (const storage of [sessionStorage, localStorage]) {
      const storedUser = storage.getItem('user');
      if (!storedUser) continue;

      try {
        const parsed = JSON.parse(storedUser);
        parsed.profilePicture = newPhotoUrl;
        storage.setItem('user', JSON.stringify(parsed));
      } catch {
        // Dato corrupto: se ignora en vez de romper el cambio de foto.
      }
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleLogout = () => {
    logoutAuth();
    navigate('/');
  };

  const renderContent = (user: UserDashboard) => {
    switch (activeTab) {
      case 'inicio': return <AdminHome />;
      case 'usuarios': return <UsersManager />;
      case 'recursos': return <ResourcesManager />;
      case 'rutas': return <RoutesManager />;
      // Antes se renderizaba `<RouteBuilder />` sin props: `onCancel` y
      // `onSaveSuccess` llegaban `undefined` y el formulario reventaba al
      // pulsar Cancelar o Guardar.
      case 'constructor': return (
        <RouteBuilder initialData={null} onCancel={() => setActiveTab('inicio')} onSaveSuccess={() => setActiveTab('rutas')} />
      );
      case 'roles': return <RoleManager />;
      case 'perfil': return <AdminProfile userData={user} onPhotoUpdate={handleUpdateUserPhoto} />;
      default: return <div><h2 className="text-2xl font-display font-bold mb-4 text-surface-900 dark:text-white">Vista Activa: {activeTab}</h2><p className="text-surface-500 dark:text-surface-400">Módulo en construcción...</p></div>;
    }
  };

  if (loadingProfile) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">
        <div
          role="status"
          aria-label="Cargando perfil"
          className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-600"
        />
      </div>
    );
  }

  // Antes `!userData` caía también aquí, así que cualquier fallo de red
  // dejaba el panel girando indefinidamente sin salida. Ahora hay pantalla de
  // error con reintento y salida.
  if (profileError || !userData) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950 p-6">
        <div className="max-w-md text-center space-y-6">
          <h2 className="text-2xl font-display font-bold text-surface-900 dark:text-white">
            No pudimos cargar tu perfil
          </h2>
          <p className="text-surface-500 dark:text-surface-400">
            {profileError ?? 'La sesión no es válida o el servidor no responde.'}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={loadProfile}
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold shadow-md shadow-brand-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Reintentar
            </button>
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 rounded-xl font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 border border-rose-200/60 dark:border-rose-900/40 transition-all"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-surface-50 dark:bg-surface-950 font-sans text-surface-900 dark:text-surface-100 flex overflow-hidden transition-colors duration-300">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} toggleTheme={toggleTheme} onLogout={handleLogout} />
      <div className="flex-1 flex flex-col h-full min-w-0 relative overflow-hidden">
        <AdminHeader userData={userData} setActiveTab={setActiveTab} />
        <main className="flex-1 p-6 md:p-10 overflow-y-auto">
          {renderContent(userData)}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;