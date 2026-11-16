import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Icon, Spinner } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import AppShell from '../../layouts/AppShell';
import { getProfile } from '../../api/auth.api';
import { getRoutes, getMyRoutes } from '../../api/route.api';
import { getApiErrorMessage } from '../../api/errors';
import type {
  CompleteModuleResponse,
  LearningRoute,
  PracticalChallenge,
  User,
  UserDashboard,
} from '../../types';
import { XP_PER_LEVEL } from '../../utils/progress';

import StudentSidebar from './components/StudentSidebar';
import StudentHeader from './components/StudentHeader';
import { STUDENT_NAV_ITEMS } from './components/navigation';
import DashboardHome from './components/DashboardHome';
import RouteExplorer from './components/RouteExplorer';
import RouteDetails from './components/RouteDetails';
import Chatbot from './components/Chatbot';
import RoutesViewer from './components/RoutesViewer';
import StudentProfile from './components/StudentProfile';
import SelfDiagnosisModal from './components/SelfDiagnosisModal';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import Recommendations from './components/Recommendations';
import ResourcesCatalog from './components/ResourcesCatalog';

/**
 * Pestañas del panel del estudiante.
 *
 * No existe una pestaña de creación de rutas: la ruta personalizada del
 * estudiante se genera únicamente desde el autodiagnóstico (`SelfDiagnosisModal`),
 * que es el flujo oficial y el único que respeta el grafo curricular.
 */
export type StudentTab =
  | 'inicio'
  | 'explorar'
  | 'mis-rutas'
  | 'recursos'
  | 'perfil'
  | 'analytics'
  | 'detalle-ruta';

/** El backend persiste `initials`; esto solo cubre datos antiguos. */
const deriveInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
};

interface ChatModuleRef {
  id: string | null;
  title: string | null;
}

const StudentDashboard = () => {
  const { toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<StudentTab>('inicio');
  const [previousTab, setPreviousTab] = useState<StudentTab>('explorar');
  const [routeViewMode, setRouteViewMode] = useState<'teoria' | 'practica'>('teoria');
  const [showChat, setShowChat] = useState(false);
  const [showSelfDiagnosis, setShowSelfDiagnosis] = useState(false);
  const [routesRefreshKey, setRoutesRefreshKey] = useState(0);
  const [userData, setUserData] = useState<UserDashboard | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [availableRoutes, setAvailableRoutes] = useState<LearningRoute[]>([]);
  const [enrolledRouteIds, setEnrolledRouteIds] = useState<string[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<LearningRoute | null>(null);
  const [activeModuleForChat, setActiveModuleForChat] = useState<ChatModuleRef | null>(null);

  const { logoutAuth } = useAuth();
  const navigate = useNavigate();

  const [codeToEvaluate, setCodeToEvaluate] = useState<string | null>(null);
  const [contextoEvaluacion, setContextoEvaluacion] = useState<string | PracticalChallenge>(() => {
    const saved = localStorage.getItem('retoActualIA');
    if (!saved) return '';
    try {
      return JSON.parse(saved);
    } catch {
      return saved;
    }
  });

  const loadProfile = useCallback(async () => {
    setProfileError(null);
    setLoadingProfile(true);

    try {
      // Antes leía `response.name` sobre la respuesta de Axios (que expone
      // `.data.name`), así que el nombre real nunca llegaba al panel.
      const profile = await getProfile();

      setUserData({
        ...profile,
        primaryRole: 'STUDENT',
        initials: profile.initials || deriveInitials(profile.name),
        streak: profile.streak ?? 0,
        level: profile.level ?? 1,
        xp: profile.xp ?? 0,
        nextRankXp: XP_PER_LEVEL,
      });
    } catch (error: unknown) {
      setProfileError(getApiErrorMessage(error, 'No se pudo cargar tu perfil.'));
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    const fetchAvailableRoutes = async () => {
      try {
        setAvailableRoutes(await getRoutes());
      } catch (error: unknown) {
        console.error(getApiErrorMessage(error, 'No se pudieron cargar las rutas.'));
      } finally {
        setLoadingRoutes(false);
      }
    };
    fetchAvailableRoutes();
  }, []);

  useEffect(() => {
    const fetchMyRoutes = async () => {
      try {
        // Antes: `httpClient.get('/routes/my-routes')` y `response.data.map(...)`,
        // que funciona por el doble `.data` accidental. Ahora `getMyRoutes()`
        // ya devuelve el array.
        const mine = await getMyRoutes();
        setEnrolledRouteIds(mine.map((r) => r.id));
      } catch (error: unknown) {
        console.error(getApiErrorMessage(error, 'No se pudieron cargar tus rutas.'));
      }
    };

    if (activeTab === 'explorar' || activeTab === 'mis-rutas' || activeTab === 'inicio') {
      fetchMyRoutes();
    }
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem(
      'retoActualIA',
      typeof contextoEvaluacion === 'object' ? JSON.stringify(contextoEvaluacion) : contextoEvaluacion
    );
  }, [contextoEvaluacion]);

  const handleLogout = () => {
    logoutAuth();
    navigate('/');
  };

  const handleOpenChat = (moduleId: string | null = null, moduleTitle: string | null = null) => {
    setActiveModuleForChat({ id: moduleId, title: moduleTitle });
    setShowChat(true);
  };

  /** Persiste la foto en el storage que corresponda; ignora datos corruptos. */
  const persistUserPatch = (patch: Record<string, unknown>) => {
    for (const storage of [sessionStorage, localStorage]) {
      const storedUser = storage.getItem('user');
      if (!storedUser) continue;

      try {
        storage.setItem('user', JSON.stringify({ ...JSON.parse(storedUser), ...patch }));
      } catch {
        // Dato corrupto: se ignora sin romper la UI.
      }
    }
  };

  const handleUpdateUserPhoto = (newPhotoUrl: string) => {
    setUserData((prev) => (prev ? { ...prev, profilePicture: newPhotoUrl } : prev));
    persistUserPatch({ profilePicture: newPhotoUrl });
  };

  /** Refresca nombre e iniciales tras editar el perfil. */
  const handleProfileUpdate = (updated: User) => {
    setUserData((prev) =>
      prev
        ? {
            ...prev,
            name: updated.name,
            initials: updated.initials || deriveInitials(updated.name),
            profilePicture: updated.profilePicture ?? prev.profilePicture,
          }
        : prev
    );
    persistUserPatch({ name: updated.name, initials: updated.initials });
  };

  const handleAssessmentComplete = (data: CompleteModuleResponse | null) => {
    if (!data) return;

    const gained = data.xpGained ?? 0;

    // El updater de `setState` debe ser puro: escribir en el storage dentro
    // de él hacía que React lo ejecutara dos veces en modo estricto.
    const updatedXp = data.newTotalXp ?? (userData?.xp ?? 0) + gained;
    const updatedLevel = data.newLevel ?? userData?.level;

    setUserData((prev) => (prev ? { ...prev, xp: updatedXp, level: updatedLevel } : prev));
    persistUserPatch({ xp: updatedXp, level: updatedLevel });
  };

  const handleRouteGenerated = async () => {
    try {
      const [avail, mine] = await Promise.all([getRoutes(), getMyRoutes()]);
      setAvailableRoutes(avail);
      setEnrolledRouteIds(mine.map((r) => r.id));
      setRoutesRefreshKey((k) => k + 1);
      setActiveTab('mis-rutas');
    } catch (error: unknown) {
      console.error(getApiErrorMessage(error, 'No se pudieron refrescar las rutas.'));
    }
  };

  const renderContent = (user: UserDashboard) => {
    switch (activeTab) {
      case 'inicio':
        return (
          <>
            <DashboardHome userData={user} setActiveTab={setActiveTab} />
            {/* Recomendaciones del grafo: se ocultan solas si no hay ninguna. */}
            <div className="mt-10">
              <Recommendations onExploreSubject={() => setActiveTab('explorar')} />
            </div>
          </>
        );
      case 'explorar':
        return (
          <RouteExplorer
            routes={availableRoutes}
            loading={loadingRoutes}
            onOpenSelfDiagnosis={() => setShowSelfDiagnosis(true)}
            onSelectRoute={(route) => {
              setSelectedRoute(route);
              setPreviousTab('explorar');
              setRouteViewMode('teoria');
              setActiveTab('detalle-ruta');
              setContextoEvaluacion("");
            }}
          />
        );
      case 'mis-rutas':
        return (
          <RoutesViewer
            key={routesRefreshKey}
            setActiveTab={setActiveTab}
            onOpenSelfDiagnosis={() => setShowSelfDiagnosis(true)}
            onSelectRoute={(route) => {
              setSelectedRoute(route);
              setPreviousTab('mis-rutas');
              setRouteViewMode('teoria');
              setActiveTab('detalle-ruta');
              setContextoEvaluacion("");
            }}
          />
        );
      case 'recursos':
        return <ResourcesCatalog />;
      case 'perfil':
        return (
          <StudentProfile
            userData={user}
            onPhotoUpdate={handleUpdateUserPhoto}
            onProfileUpdate={handleProfileUpdate}
          />
        );
      case 'analytics':
        return <AnalyticsDashboard userData={user} />;
      case 'detalle-ruta':
        return (
          <RouteDetails
            route={selectedRoute}
            viewMode={routeViewMode}
            setViewMode={setRouteViewMode}
            onBack={() => setActiveTab(previousTab)}
            contextoEvaluacion={contextoEvaluacion}
            setContextoEvaluacion={setContextoEvaluacion}
            onOpenChat={handleOpenChat}
            onAssessmentComplete={handleAssessmentComplete}
            isAlreadyEnrolled={Boolean(selectedRoute && enrolledRouteIds.includes(selectedRoute.id))}
          />
        );
      default:
        return (
          <div className="rounded-card border border-surface-200 bg-white p-8 dark:border-surface-800 dark:bg-surface-900">
            <h2 className="mb-4 text-2xl font-bold">Vista Activa: {activeTab}</h2>
            <p className="text-surface-500 dark:text-surface-400">Módulo en construcción.</p>
          </div>
        );
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-surface-50 dark:bg-surface-950">
        <Spinner size="lg" label="Cargando perfil" className="text-brand-600" />
      </div>
    );
  }

  // Antes `!userData` caía también al spinner, así que un fallo de red dejaba
  // el panel girando indefinidamente sin salida.
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
    <>
      <AppShell
        sidebar={
          <StudentSidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            userData={userData}
            toggleTheme={toggleTheme}
            onLogout={handleLogout}
            onOpenSelfDiagnosis={() => setShowSelfDiagnosis(true)}
          />
        }
        header={<StudentHeader userData={userData} />}
        mobileNav={{
          items: STUDENT_NAV_ITEMS,
          activeTab,
          onNavigate: (tab) => setActiveTab(tab as StudentTab),
          brandSubtitle: 'Estudiante',
          onLogout: handleLogout,
          onOpenSelfDiagnosis: () => setShowSelfDiagnosis(true),
          selfDiagnosisLabel: 'Autodiagnóstico',
        }}
      >
        {renderContent(userData)}
      </AppShell>

      <SelfDiagnosisModal
        isOpen={showSelfDiagnosis}
        onClose={() => setShowSelfDiagnosis(false)}
        onRouteGenerated={handleRouteGenerated}
      />

      <Chatbot
        showChat={showChat}
        routeId={selectedRoute?.id}
        routeTitle={selectedRoute?.title}
        activeModule={activeModuleForChat}
        onClose={() => setShowChat(false)}
        onAsignarNuevoReto={(nuevoRetoTexto) => setContextoEvaluacion(nuevoRetoTexto)}
        codeToEvaluate={codeToEvaluate}
        onCodeEvaluated={() => setCodeToEvaluate(null)}
      />

      {!showChat && (
        <button
          type="button"
          onClick={() => {
            setActiveModuleForChat(null);
            setShowChat(true);
          }}
          aria-label="Abrir el tutor IA"
          className="fixed bottom-24 right-4 z-50 flex items-center justify-center rounded-full bg-surface-900 p-4 text-white shadow-2xl shadow-surface-900/30 transition-transform hover:scale-105 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus/50 dark:bg-white dark:text-surface-900 md:bottom-8 md:right-8"
        >
          <Icon name="messageCircle" className="h-7 w-7" />
        </button>
      )}
    </>
  );
};

export default StudentDashboard;