import { useState, useEffect } from 'react';

const RoutesViewer = ({ onSelectRoute, setActiveTab }) => {
  const [rutas, setRutas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRutas = async () => {
      try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
        
        const response = await fetch(`${apiUrl}/routes/my-routes`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) throw new Error('Error al cargar las rutas');
        
        const data = await response.json();
        setRutas(data);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchRutas();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Mis Rutas de Aprendizaje</h1>
          <p className="text-slate-400 mt-2 text-lg">Continúa con tu progreso o evalúa tus conocimientos con la IA.</p>
        </div>
        <button
          onClick={() => setActiveTab('crear-ruta')}
          className="shrink-0 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all transform hover:scale-105 shadow-lg shadow-violet-600/25 border border-violet-500/30"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          Crear Ruta Personalizada
        </button>
      </div>

      {rutas.length === 0 ? (
        <div className="text-center mt-20 p-12 bg-[#1a1d27] rounded-xl border border-slate-700/50 shadow-2xl flex flex-col items-center">
          <svg className="w-16 h-16 text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
          <p className="text-xl text-slate-300 font-medium mb-2">Aún no estás inscrito en ninguna ruta</p>
          <p className="text-slate-500 max-w-md mb-6">Explora el catálogo general para inscribirte en el material oficial o utiliza la inteligencia artificial para crear una ruta adaptada a ti.</p>
          <button
            onClick={() => setActiveTab('explorar')}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-6 rounded-lg transition-colors border border-slate-700"
          >
            Ir al Catálogo de Exploración
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rutas.map((ruta) => {
            const userEnrollment = ruta.enrollments && ruta.enrollments[0];
            const progress = userEnrollment ? userEnrollment.progress : 0;

            return (
              <div key={ruta.id} className="bg-[#1a1d27] rounded-2xl overflow-hidden border border-slate-700/50 shadow-xl hover:border-violet-500/50 transition-colors flex flex-col">
                <div className="p-6 flex-grow">
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-3 py-1 bg-violet-500/10 text-violet-400 rounded-lg text-xs font-bold border border-violet-500/20">
                      {ruta.difficulty}
                    </span>
                    <span className="text-slate-500 text-xs font-bold flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      {ruta.estimatedTime || 0} min
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">{ruta.title}</h3>
                  
                  <p className="text-slate-400 text-sm line-clamp-3 mb-6">
                    {ruta.description || "Ruta de aprendizaje estructurada con IA."}
                  </p>
                </div>

                <div className="p-6 bg-[#12141c] border-t border-slate-700/50">
                  <div className="mb-4">
                    <div className="flex justify-between text-xs font-bold mb-2">
                      <span className="text-slate-400">Progreso General</span>
                      <span className="text-emerald-400">{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>

                  <button 
                    onClick={() => onSelectRoute(ruta)}
                    className="w-full py-3 bg-[#252b3e] hover:bg-violet-600 text-white text-sm font-bold rounded-xl transition-colors border border-slate-700 hover:border-violet-500 flex items-center justify-center gap-2"
                  >
                    Continuar Ruta
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RoutesViewer;