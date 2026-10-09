const RoleManager = () => {
  const roles = [
    { id: 1, name: 'ADMIN', description: 'Acceso total al sistema', users: 2 },
    { id: 2, name: 'STUDENT', description: 'Acceso a rutas y editor de código', users: 150 },
    { id: 3, name: 'MODERATOR', description: 'Puede gestionar rutas pero no usuarios', users: 5 }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Roles y Permisos</h1>
        <p className="text-slate-400 mt-2 text-lg">Gestiona los niveles de acceso de los usuarios en la plataforma.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {roles.map((role) => (
          <div key={role.id} className="bg-[#12141c] p-6 rounded-2xl border border-slate-800/80 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg className="w-16 h-16 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
              </svg>
            </div>
            
            <h3 className="text-xl font-bold text-emerald-400 mb-2">{role.name}</h3>
            <p className="text-slate-400 text-sm mb-4 h-10">{role.description}</p>
            
            <div className="flex items-center justify-between border-t border-slate-700/50 pt-4 mt-4">
              <span className="text-sm font-medium text-slate-300">
                Usuarios asignados: <span className="text-white font-bold">{role.users}</span>
              </span>
              <button className="text-emerald-500 hover:text-emerald-400 text-sm font-medium transition-colors">
                Editar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoleManager;