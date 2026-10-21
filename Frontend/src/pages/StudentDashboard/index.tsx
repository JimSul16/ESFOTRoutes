import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
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

import StudentSidebar from './components/StudentSidebar';
import StudentHeader from './components/StudentHeader';
import DashboardHome from './components/DashboardHome';
import RouteExplorer from './components/RouteExplorer';
import RouteDetails from './components/RouteDetails';
import Chatbot from './components/Chatbot';
import RoutesViewer from './components/RoutesViewer';
import StudentProfile from './components/StudentProfile';
import RouteGenerator from './components/RouteGenerator';
import SelfDiagnosisModal from './components/SelfDiagnosisModal';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import Recommendations from './components/Recommendations';

/** Pestañas del panel del estudiante. */
export type StudentTab =
  | 'inicio'
  | 'explorar'
  | 'mis-rutas'
  | 'perfil'
  | 'analytics'
  | 'crear-ruta'
  | 'detalle-ruta';

export type Theme = 'light' | 'dark';

const readStoredTheme = (): Theme => (localStorage.getItem('theme') === 'dark' ? 'dark' : 'light');

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
  const [theme, setTheme] = useState<Theme>(readStoredTheme);
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
        nextRankXp: 1000,
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

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  const handleLogout = () => {
    logoutAuth();
    navigate('/');
  };

  const handleOpenChat = (moduleId: string | null = null, moduleTitle: string | null = null) => {
    setActiveModuleForChat({ id: moduleId, title: moduleTitle });
    setShowChat(true);
  };

  const handleSendCodeToAI = (code: string, language: string, output?: string) => {
    let mensajeFormateado: string;
    if (language === 'multitask') {
      mensajeFormateado = code;
    } else {
      let instruccionFinal: string;
      if (typeof contextoEvaluacion === 'object') {
        instruccionFinal = (contextoEvaluacion?.context as string) || 'Reto práctico.';
      } else {
        instruccionFinal = contextoEvaluacion || selectedRoute?.description || 'Resuelve el problema planteado.';
      }
      mensajeFormateado = `¡Hola! Necesito que evalúes mi código en ${language}.\n\nInstrucción del reto:\n${instruccionFinal}\n\nMi código:\n${code}\n\nSalida en consola:\n${output || 'Sin salida en consola'}`;
    }

    setCodeToEvaluate(mensajeFormateado);
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

    setUserData((prev) => {
      if (!prev) return prev;

      const updatedXp = data.newTotalXp ?? (prev.xp ?? 0) + gained;
      const updatedLevel = data.newLevel ?? prev.level;

      persistUserPatch({ xp: updatedXp, level: updatedLevel });
      return { ...prev, xp: updatedXp, level: updatedLevel };
    });
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
            onSelectRoute={(route) => {
              setSelectedRoute(route);
              setPreviousTab('mis-rutas');
              setRouteViewMode('teoria');
              setActiveTab('detalle-ruta');
              setContextoEvaluacion("");
            }}
          />
        );
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
      case 'perfil':
        return (
          <StudentProfile
            userData={user}
            onPhotoUpdate={handleUpdateUserPhoto}
            onProfileUpdate={handleProfileUpdate}
          />
        );
      case 'crear-ruta':
        return <RouteGenerator onBack={() => setActiveTab('mis-rutas')} />;
      case 'detalle-ruta':
        return (
          <RouteDetails
            route={selectedRoute}
            viewMode={routeViewMode}
            setViewMode={setRouteViewMode}
            onBack={() => setActiveTab(previousTab)}
            contextoEvaluacion={contextoEvaluacion}
            setContextoEvaluacion={setContextoEvaluacion}
            onSendToAI={handleSendCodeToAI}
            onOpenChat={handleOpenChat}
            onAssessmentComplete={handleAssessmentComplete}
            isAlreadyEnrolled={Boolean(selectedRoute && enrolledRouteIds.includes(selectedRoute.id))}
          />
        );
      default:
        return (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800">
            <h2 className="text-2xl font-bold mb-4">Vista Activa: {activeTab}</h2>
            <p className="text-slate-500">Módulo en construcción.</p>
          </div>
        );
    }
  };

  if (loadingProfile) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div
          role="status"
          aria-label="Cargando perfil"
          className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-600"
        />
      </div>
    );
  }

  // Antes `!userData` caía también al spinner, así que un fallo de red dejaba
  // el panel girando indefinidamente sin salida.
  if (profileError || !userData) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="max-w-md text-center space-y-6">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
            No pudimos cargar tu perfil
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            {profileError ?? 'La sesión no es válida o el servidor no responde.'}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={loadProfile}
              className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold hover:opacity-90 transition-opacity"
            >
              Reintentar
            </button>
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 rounded-xl font-semibold text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 flex overflow-hidden transition-colors duration-300">

      <StudentSidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userData={userData} 
        toggleTheme={toggleTheme} 
        onLogout={handleLogout}
        onOpenSelfDiagnosis={() => setShowSelfDiagnosis(true)}
      />

      <div className="flex-1 flex flex-col h-full min-w-0 relative overflow-hidden">
        <StudentHeader
          userData={userData}
          setActiveTab={setActiveTab}
        />
        <main className="flex-1 p-6 md:p-10 overflow-y-auto">
          {renderContent(userData)}
        </main>
      </div>

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
          onClick={() => {
            setActiveModuleForChat(null);
            setShowChat(true);
          }}
          className="fixed bottom-8 right-8 bg-slate-900 dark:bg-white text-white dark:text-slate-900 p-4 rounded-full shadow-2xl shadow-slate-900/50 hover:scale-110 transition-transform z-50 flex items-center justify-center group"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
        </button>
      )}
    </div>
  );
};

export default StudentDashboard;