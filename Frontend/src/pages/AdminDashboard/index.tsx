import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Spinner } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import AppShell from '../../layouts/AppShell';
import { getProfile } from '../../api/auth.api';
import { getApiErrorMessage } from '../../api/errors';
import { useAuth } from '../../hooks/useAuth';
import type { UserDashboard } from '../../types';
import type { AdminTab } from './components/AdminSidebar';

import UsersManager from './components/UsersManager';
import ResourcesManager from './components/ResourcesManager';
import RoutesManager from './components/RoutesManager';
import RouteBuilder from './components/RouteBuilder';
import AdminSidebar from './components/AdminSidebar';
import AdminHeader from './components/AdminHeader';
import { ADMIN_NAV_ITEMS } from './components/navigation';
import AdminHome from './components/AdminHome';
import AdminProfile from './components/AdminProfile';


/** El backend ya persiste `initials`; esto solo cubre datos antiguos. */
const deriveInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
};

const AdminDashboard = () => {
  const { toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<AdminTab>('inicio');
  const [userData, setUserData] = useState<UserDashboard | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const { logoutAuth } = useAuth();
  const navigate = useNavigate();

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

  const handleLogout = () => {
    logoutAuth();
    navigate('/');
  };

  const renderContent = (user: UserDashboard) => {
    switch (activeTab) {
      case 'inicio': return <AdminHome onNavigate={setActiveTab} />;
      case 'usuarios': return <UsersManager />;
      case 'recursos': return <ResourcesManager />;
      case 'rutas': return <RoutesManager />;
      // Antes se renderizaba `<RouteBuilder />` sin props: `onCancel` y
      // `onSaveSuccess` llegaban `undefined` y el formulario reventaba al
      // pulsar Cancelar o Guardar.
      case 'constructor': return (
        <RouteBuilder initialData={null} onCancel={() => setActiveTab('inicio')} onSaveSuccess={() => setActiveTab('rutas')} />
      );
      case 'perfil': return <AdminProfile userData={user} onPhotoUpdate={handleUpdateUserPhoto} />;
      default: return <div><h2 className="text-2xl font-display font-bold mb-4 text-surface-900 dark:text-white">Vista Activa: {activeTab}</h2><p className="text-surface-500 dark:text-surface-400">Módulo en construcción...</p></div>;
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-surface-50 dark:bg-surface-950">
        <Spinner size="lg" label="Cargando perfil" className="text-brand-600" />
      </div>
    );
  }

  // Antes `!userData` caía también aquí, así que cualquier fallo de red
  // dejaba el panel girando indefinidamente sin salida. Ahora hay pantalla de
  // error con reintento y salida.
  if (profileError || !userData) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-surface-50 p-6 dark:bg-surface-950">
        <div className="max-w-md space-y-6 text-center">
          <h2 className="font-display text-2xl font-bold text-surface-900 dark:text-white">
            No pudimos cargar tu perfil
          </h2>
          <p className="text-surface-500 dark:text-surface-400">
            {profileError ?? 'La sesión no es válida o el servidor no responde.'}
          </p>
          <div className="flex justify-center gap-3">
            <Button type="button" onClick={loadProfile}>
              Reintentar
            </Button>
            <Button type="button" variant="danger" onClick={handleLogout}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      sidebar={
        <AdminSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          toggleTheme={toggleTheme}
          onLogout={handleLogout}
        />
      }
      header={<AdminHeader userData={userData} />}
      mobileNav={{
        items: ADMIN_NAV_ITEMS,
        activeTab,
        onNavigate: (tab) => setActiveTab(tab as AdminTab),
        brandSubtitle: 'Administración',
        onLogout: handleLogout,
      }}
    >
      {renderContent(userData)}
    </AppShell>
  );
};

export default AdminDashboard;