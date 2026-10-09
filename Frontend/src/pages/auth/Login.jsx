import { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useFetch } from "../../hooks/useFetch";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";
import AuthContext from "../../context/AuthProvider";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "El correo es obligatorio")
    .email("Correo electrónico inválido")
    .refine((val) => val.endsWith("@epn.edu.ec") || val.endsWith("@gmail.com"), {
      message: "Usa tu correo institucional (@epn.edu.ec) o @gmail.com",
    }),
  password: z
    .string()
    .min(1, "La contrasena es obligatoria"),
  otp: z.string().optional(),
});

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [requiresOtp, setRequiresOtp] = useState(false);
  
  const { fetchDataBackend, loading } = useFetch();
  const navigate = useNavigate();
  const { loginAuth } = useContext(AuthContext);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema)
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

  const onSubmit = async (dataForm) => {
    try {
      const response = await fetchDataBackend("/auth/login", dataForm, "POST");
      
      if (response && response.token) {
        loginAuth(response.token, response.user);
        
        if (response.user.roles && response.user.roles.includes('ADMIN')) {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
      }
    } catch (error) {
      if (error.response?.status === 206) {
        setRequiresOtp(true);
      } else {
        console.error(error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6 transition-colors duration-300 relative font-sans">
      
      <Link 
        to="/" 
        className="absolute top-6 left-6 md:top-10 md:left-10 flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 font-semibold transition-colors bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 z-10"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
        Regresar
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
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">Bienvenido de nuevo</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Ingresa tus credenciales institucionales para continuar tu progreso en TSDS.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Correo Institucional</label>
            <input 
              type="email" 
              placeholder="andres.caiza@epn.edu.ec"
              className={`w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border ${errors.email ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'} text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-600 focus:border-transparent outline-none transition-all placeholder-slate-400`}
              {...register("email")}
            />
            {errors.email && <p className="text-red-500 dark:text-red-400 text-xs mt-1.5 font-medium">{errors.email.message}</p>}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Contraseña</label>
              <Link to="/forgot" className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline">¿Olvidaste tu contraseña?</Link>
            </div>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className={`w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border ${errors.password ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'} text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-600 focus:border-transparent outline-none transition-all placeholder-slate-400`}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
              >
                {showPassword ? <MdVisibilityOff size={22} /> : <MdVisibility size={22} />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 dark:text-red-400 text-xs mt-1.5 font-medium">{errors.password.message}</p>}
          </div>

          {requiresOtp && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Código OTP</label>
              <input 
                type="text" 
                placeholder="123456"
                maxLength="6"
                className={"w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-600 focus:border-transparent outline-none transition-all placeholder-slate-400"}
                {...register("otp")}
              />
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl hover:shadow-lg hover:shadow-violet-500/30 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100 flex justify-center items-center gap-2"
          >
            {loading ? "Verificando..." : "Iniciar Sesión"}
            {!loading && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
          ¿No tienes una cuenta? <Link to="/register" className="font-bold text-violet-600 dark:text-violet-400 hover:underline">Regístrate aquí</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;




