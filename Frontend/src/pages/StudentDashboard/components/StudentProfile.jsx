import { useState, useRef, useEffect } from 'react';

const StudentProfile = ({ userData, onPhotoUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [errorMsj, setErrorMsj] = useState(null);
  const [sessions, setSessions] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
        
        const response = await fetch(`${apiUrl}/auth/sessions`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setSessions(Array.isArray(data) ? data : (data.sessions || []));
        }
      } catch (error) {
        console.error("Error fetching sessions:", error);
      }
    };

    fetchSessions();
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsj("Solo se permiten archivos de imagen (JPG, PNG).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsj("La imagen no debe superar los 5MB.");
      return;
    }

    setErrorMsj(null);
    setUploading(true);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      
      const response = await fetch(`${apiUrl}/upload/profile`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al subir la imagen');
      }

      onPhotoUpdate(data.url);

    } catch (error) {
      console.error("Error subiendo foto a Cloudinary:", error);
      setErrorMsj(error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; 
      }
    }
  };

  const triggerFileInput = () => {
    if (!uploading) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">Mi Perfil</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Gestiona tu identidad y credenciales dentro de la plataforma.</p>
      </div>

      {errorMsj && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm font-medium">
          {errorMsj}
        </div>
      )}

      <div className="bg-white dark:bg-[#1a1d27] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/50 shadow-sm">
        <div className="p-8 flex flex-col md:flex-row gap-8 items-center md:items-start border-b border-slate-100 dark:border-slate-700/50">
          
          <div className="relative group cursor-pointer" onClick={triggerFileInput}>
            <div className={`w-32 h-32 rounded-full overflow-hidden border-4 border-slate-100 dark:border-slate-800 shadow-lg ${uploading ? 'opacity-50' : ''}`}>
              {userData.profilePicture ? (
                <img src={userData.profilePicture} alt="Perfil" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center">
                  <span className="text-4xl font-bold text-white">{userData.initials}</span>
                </div>
              )}
            </div>
            
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            </div>

            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
              </div>
            )}
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/png, image/jpeg" 
              onChange={handleFileChange} 
            />
          </div>

          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">{userData.name}</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-4">{userData.email}</p>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-500/20">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path></svg>
                Estudiante EPN
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
                Nivel {userData.level}
              </span>
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50 dark:bg-[#12141c]">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Información de la Cuenta</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Nombre Completo</label>
              <input type="text" value={userData.name} readOnly className="w-full bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-700 dark:text-slate-200 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Correo Electrónico</label>
              <input type="text" value={userData.email} readOnly className="w-full bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-700 dark:text-slate-200 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Rol en el Sistema</label>
              <input type="text" value={userData.primaryRole} readOnly className="w-full bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-700 dark:text-slate-200 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Puntos de Experiencia (XP)</label>
              <input type="text" value={`${userData.xp} XP`} readOnly className="w-full bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-700 dark:text-slate-200 focus:outline-none" />
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-slate-200 dark:border-slate-700/50 bg-white dark:bg-[#1a1d27]">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Historial de Sesiones</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-[#12141c] dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Dispositivo</th>
                  <th className="px-4 py-3 font-medium">IP</th>
                  <th className="px-4 py-3 rounded-tr-lg font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {sessions.length > 0 ? (
                  sessions.map((session, index) => {
                    const isSuccess = session.status === 'SUCCESS' || session.status === 'Éxito' || session.success || session.status === 'success' || !session.status;
                    return (
                      <tr key={index} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">{session.createdAt || session.loginTime || session.date ? new Date(session.createdAt || session.loginTime || session.date).toLocaleString() : 'N/A'}</td>
                        <td className="px-4 py-3">{session.deviceInfo || 'Desconocido'}</td>
                        <td className="px-4 py-3 font-mono text-xs">{session.ipAddress || 'N/A'}</td>
                        <td className="px-4 py-3">
                          {isSuccess ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-500 border border-green-500/20">
                              SUCCESS
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20">
                              FAILED
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="4" className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                      No hay sesiones registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;