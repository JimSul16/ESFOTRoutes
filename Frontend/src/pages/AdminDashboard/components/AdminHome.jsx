import { useState, useEffect } from 'react';
import { getUsers } from '../../../api/admin.api';
import { getRoutes } from '../../../api/route.api';

const AdminHome = () => {
  const [stats, setStats] = useState({ users: 0, routes: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        
        const usersPromise = getUsers(token).catch(() => []);
        const routesPromise = getRoutes().catch(() => []);

        const [usersData, routesData] = await Promise.all([usersPromise, routesPromise]);
        
        const totalStudents = Array.isArray(usersData) 
          ? usersData.filter(user => user.roles && user.roles.includes('STUDENT')).length 
          : 0;

        const finalUsersCount = totalStudents > 0 ? totalStudents : (Array.isArray(usersData) ? usersData.length : 0);

        setStats({
          users: finalUsersCount,
          routes: Array.isArray(routesData) ? routesData.length : 0
        });
      } catch (error) {
        console.error("Error cargando estadísticas", error);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-8 md:p-10 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold uppercase tracking-wider mb-4 border border-emerald-100 dark:border-emerald-500/20">
              Panel de Administración
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white mb-3 tracking-tight">Gestión Operativa de Rutas</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-xl text-base leading-relaxed">Desde aquí puedes configurar el acceso de los estudiantes, gestionar la base de conocimientos y asegurar el correcto funcionamiento de la plataforma.</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 hover:border-emerald-500/50 transition-colors group">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider">Estudiantes Activos</h3>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-lg group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            </div>
          </div>
          <p className="text-5xl font-black text-slate-800 dark:text-white">{stats.users}</p>
        </div>
        
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 hover:border-violet-500/50 transition-colors group">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider">Rutas Creadas</h3>
            <div className="p-2 bg-violet-50 dark:bg-violet-500/10 text-violet-500 rounded-lg group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
            </div>
          </div>
          <p className="text-5xl font-black text-slate-800 dark:text-white">{stats.routes}</p>
        </div>
      </div>
    </div>
  );
};

export default AdminHome;