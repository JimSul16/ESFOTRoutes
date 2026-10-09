import { useState, useEffect } from "react";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useFetch } from "../../hooks/useFetch";

const resetSchema = z.object({
  newPassword: z
    .string()
    .min(8, "La contraseña debe tener mínimo 8 caracteres"),
  confirmPassword: z
    .string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"]
});

const Reset = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  
  const { token } = useParams();
  const navigate = useNavigate();
  const { fetchDataBackend, loading } = useFetch();
  
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(resetSchema)
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const updatePassword = async (dataForm) => {
    const payload = { newPassword: dataForm.newPassword };
    await fetchDataBackend(`/auth/reset-password/${token}`, payload, "PATCH");
    
    setTimeout(() => {
      navigate("/login");
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6 transition-colors duration-300 relative font-sans">
      
      <Link 
        to="/login" 
        className="absolute top-6 left-6 md:top-10 md:left-10 flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 font-semibold transition-colors bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 z-10"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
        Cancelar
      </Link>

      <button 
        onClick={toggleTheme} 
        className="absolute top-6 right-6 md:top-10 md:right-10 p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 border border-slate-200 dark:border-slate-700 shadow-sm transition-colors z-10"
      >
        {theme === 'light' ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
        )}
      </button>

      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 p-8 md:p-12 relative overflow-hidden mt-12 md:mt-0">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-violet-600 to-emerald-500"></div>
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="bg-violet-600 text-white p-1.5 rounded-md font-bold text-lg">ESFOT</div>
            <span className="text-xl font-bold text-slate-800 dark:text-white">Rutas</span>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">Nueva Contraseña</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Asegúrate de crear una contraseña fuerte y que no hayas utilizado antes.</p>
        </div>

        <form onSubmit={handleSubmit(updatePassword)} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Nueva Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 8 caracteres"
                className={`w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border ${errors.newPassword ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'} text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-600 focus:border-transparent outline-none transition-all placeholder-slate-400`}
                {...register("newPassword")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
              >
                {showPassword ? <MdVisibilityOff size={22} /> : <MdVisibility size={22} />}
              </button>
            </div>
            {errors.newPassword && <p className="text-red-500 dark:text-red-400 text-xs mt-1.5 font-medium">{errors.newPassword.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Confirmar Contraseña</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Repite la contraseña"
                className={`w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border ${errors.confirmPassword ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'} text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-600 focus:border-transparent outline-none transition-all placeholder-slate-400`}
                {...register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
              >
                {showConfirmPassword ? <MdVisibilityOff size={22} /> : <MdVisibility size={22} />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-red-500 dark:text-red-400 text-xs mt-1.5 font-medium">{errors.confirmPassword.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl hover:shadow-lg hover:shadow-violet-500/30 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100 flex justify-center items-center gap-2 mt-4"
          >
            {loading ? "Actualizando..." : "Actualizar Contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Reset;