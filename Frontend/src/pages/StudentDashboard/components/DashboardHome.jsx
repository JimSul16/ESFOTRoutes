import { useState, useEffect } from 'react';

const DashboardHome = ({ userData, setActiveTab }) => {
  const [activeRoutes, setActiveRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentRoutes = async () => {
      try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
        
        const response = await fetch(`${apiUrl}/routes/my-routes`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setActiveRoutes(data.slice(0, 2));
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecentRoutes();
  }, []);

  return (
    <>
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm mb-8 overflow-hidden relative">
        <div className="p-8 md:p-10 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-lg text-xs font-bold uppercase tracking-wider mb-4 border border-violet-100 dark:border-violet-500/20">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"></path></svg>
              Bienvenido de nuevo
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white mb-3 tracking-tight">Hola, {userData.name.split(' ')[0]}</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-xl text-base leading-relaxed">Tienes rutas en progreso y retos pendientes. Sigue sumando experiencia para subir de nivel.</p>
            <button onClick={() => setActiveTab('mis-rutas')} className="mt-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold px-6 py-3 rounded-xl hover:scale-105 transition-transform">
              Continuar Aprendiendo
            </button>
          </div>
        </div>
      </section>

      <div className="w-full">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">Mis Rutas Activas</h3>
          <button onClick={() => setActiveTab('mis-rutas')} className="text-sm font-bold text-violet-600 dark:text-violet-400 hover:underline">Ver todas</button>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
          </div>
        ) : activeRoutes.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center">
            <p className="text-slate-500 dark:text-slate-400 mb-4">No tienes rutas activas en este momento.</p>
            <button onClick={() => setActiveTab('explorar')} className="bg-violet-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-violet-700 transition-colors">
              Explorar Catálogo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {activeRoutes.map((route) => {
              const progressValue = route.enrollments?.[0]?.progress || 0;
              return (
                <div key={route.id} onClick={() => setActiveTab('mis-rutas')} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-violet-400 transition-colors cursor-pointer group">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-bold px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md">En curso</span>
                    <span className="text-xs font-bold text-violet-600 dark:text-violet-400">{progressValue}%</span>
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-white mb-1 group-hover:text-violet-600 line-clamp-1">{route.title}</h4>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-4">
                    <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${progressValue}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default DashboardHome;