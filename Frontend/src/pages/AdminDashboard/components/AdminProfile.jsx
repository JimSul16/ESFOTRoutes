import { useState, useRef } from 'react';
import { toast } from 'react-toastify';

const AdminProfile = ({ userData, onPhotoUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [errorMsj, setErrorMsj] = useState(null);
  const [isResetting, setIsResetting] = useState(false);
  const fileInputRef = useRef(null);

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
      console.error(error);
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

  const handlePasswordReset = async () => {
    if (!userData?.email || isResetting) return;
    setIsResetting(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const endpoint = apiUrl.endsWith('/api') 
        ? `${apiUrl}/auth/forgot-password` 
        : `${apiUrl}/api/auth/forgot-password`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: userData.email })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Se ha enviado un enlace seguro a tu correo para actualizar la contraseña.");
      } else {
        toast.error(data.message || data.error || "Error al procesar la solicitud.");
      }
    } catch (error) {
      toast.error("Ocurrió un error de conexión con el servidor.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 md:p-10 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-3 bg-slate-900 dark:bg-white"></div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-8">Perfil de Administrador</h2>
        
        {errorMsj && (
          <div className="mb-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm font-medium">
            {errorMsj}
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-10 items-center md:items-start">
          <div className="flex flex-col items-center space-y-4">
            <div 
              className={`w-32 h-32 rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-900 shadow-xl flex items-center justify-center text-4xl font-black text-slate-400 overflow-hidden relative group cursor-pointer ${uploading ? 'opacity-50' : ''}`}
              onClick={triggerFileInput}
            >
              {userData?.profilePicture ? (
                <img src={userData?.profilePicture} alt="Perfil Admin" className="w-full h-full object-cover" />
              ) : (
                userData?.initials
              )}
              
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              </div>

              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
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
            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase rounded-md">
              Super Administrador
            </span>
          </div>

          <div className="flex-grow w-full space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Nombre Completo</label>
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium">
                  {userData?.name || 'Administrador'}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Correo Institucional</label>
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-medium">
                  {userData?.email || 'admin@epn.edu.ec'}
                </div>
              </div>
            </div>
            
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Seguridad de la Cuenta</h3>
              <button 
                onClick={handlePasswordReset}
                disabled={isResetting}
                className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {isResetting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current"></div>
                    Procesando...
                  </>
                ) : (
                  "Cambiar Contraseña"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;