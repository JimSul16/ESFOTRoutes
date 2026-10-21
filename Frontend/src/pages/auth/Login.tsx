import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import { login as loginRequest, isLoginSuccess } from "../../api/auth.api";
import { getApiErrorMessage } from "../../api/errors";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";
import { useAuth } from "../../hooks/useAuth";

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

type LoginValues = z.infer<typeof loginSchema>;

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const navigate = useNavigate();
  const { loginAuth } = useAuth();

  const { register, handleSubmit, getValues, setValue, formState: { errors } } = useForm({
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

  const onSubmit = async (dataForm: LoginValues) => {
    // En el segundo paso el código es obligatorio. El esquema de zod no puede
    // exigirlo porque está declarado fuera del componente y no ve `requiresOtp`.
    if (requiresOtp && !/^\d{6}$/.test(dataForm.otp ?? "")) {
      toast.error("Ingresa el código OTP de 6 dígitos.");
      return;
    }

    setLoading(true);
    try {
      const res = await loginRequest(dataForm);

      // OJO: `httpClient` acepta cualquier status 2xx, así que el 206 del
      // backend (OTP requerido) RESUELVE, no lanza. Por eso el caso se
      // discrimina por la presencia de `token` y no en el catch.
      if (isLoginSuccess(res)) {
        loginAuth(res.token, res.user);
        navigate(res.user.roles?.includes("ADMIN") ? "/admin" : "/dashboard");
        return;
      }

      setRequiresOtp(true);
      toast.info(res.message);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "No se pudo iniciar sesión."));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reenvía el código sin incluir `otp`: el backend vuelve a generar uno y
   * responde 206. Necesario porque el OTP expira a los 10 minutos y, si el
   * usuario cierra el formulario, no tiene forma de pedir otro.
   */
  const onResendOtp = async () => {
    const { email, password } = getValues();

    if (!email || !password) {
      toast.error("Completa tu correo y contraseña antes de reenviar el código.");
      return;
    }

    setResending(true);
    try {
      const res = await loginRequest({ email, password });
      // Siempre llega un 206 con el aviso; se limpia el campo por si el
      // usuario ya había escrito un código que quedó obsoleto.
      setValue("otp", "");
      toast.success(res.message ?? "Te enviamos un nuevo código por correo.");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "No se pudo reenviar el código."));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center p-6 transition-colors duration-300 relative font-sans overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      <Link
        to="/"
        className="absolute top-6 left-6 md:top-10 md:left-10 flex items-center gap-2 text-surface-500 dark:text-surface-400 hover:text-brand-600 dark:hover:text-brand-400 font-semibold text-sm transition-colors bg-white/80 dark:bg-surface-900/80 backdrop-blur-md px-4 py-2.5 rounded-xl shadow-xs border border-surface-200/80 dark:border-surface-800 z-10"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
        Regresar
      </Link>

      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 md:top-10 md:right-10 p-2.5 rounded-xl bg-white/80 dark:bg-surface-900/80 backdrop-blur-md text-surface-600 dark:text-surface-300 hover:text-brand-600 dark:hover:text-brand-400 border border-surface-200/80 dark:border-surface-800 shadow-xs transition-colors z-10"
        aria-label="Alternar tema claro y oscuro"
      >
        {theme === 'light' ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
        )}
      </button>

      <div className="w-full max-w-md bg-white/95 dark:bg-surface-900/90 backdrop-blur-xl rounded-3xl shadow-xl border border-surface-200/80 dark:border-surface-800 p-8 md:p-10 relative overflow-hidden mt-12 md:mt-0 z-10">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-600 via-rose-600 to-brand-500" />

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="bg-gradient-to-tr from-brand-600 to-brand-800 text-white px-2.5 py-1 rounded-xl font-black text-sm tracking-wider shadow-xs">
              ESFOT
            </div>
            <span className="text-xl font-display font-extrabold text-surface-900 dark:text-white tracking-tight">Rutas</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-surface-900 dark:text-white tracking-tight mb-2">Bienvenido de nuevo</h2>
          <p className="text-surface-500 dark:text-surface-400 text-xs sm:text-sm">Ingresa tus credenciales para continuar tu aprendizaje en TSDS.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-surface-700 dark:text-surface-300 mb-2">Correo Institucional</label>
            <input
              type="email"
              placeholder="alexander.cajamarca@epn.edu.ec"
              className={`w-full px-4 py-3 rounded-xl bg-surface-50 dark:bg-surface-800/60 border ${errors.email ? 'border-rose-500' : 'border-surface-200 dark:border-surface-700'} text-surface-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all placeholder:text-surface-400 text-sm`}
              {...register("email")}
            />
            {errors.email && <p className="text-rose-500 dark:text-rose-400 text-xs mt-1.5 font-medium">{errors.email.message}</p>}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-surface-700 dark:text-surface-300">Contraseña</label>
              <Link to="/forgot" className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline">¿Olvidaste tu contraseña?</Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className={`w-full px-4 py-3 rounded-xl bg-surface-50 dark:bg-surface-800/60 border ${errors.password ? 'border-rose-500' : 'border-surface-200 dark:border-surface-700'} text-surface-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all placeholder:text-surface-400 text-sm`}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3.5 flex items-center text-surface-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                aria-label="Ver u ocultar contraseña"
              >
                {showPassword ? <MdVisibilityOff size={20} /> : <MdVisibility size={20} />}
              </button>
            </div>
            {errors.password && <p className="text-rose-500 dark:text-rose-400 text-xs mt-1.5 font-medium">{errors.password.message}</p>}
          </div>

          {requiresOtp && (
            <div className="p-4 bg-brand-50/60 dark:bg-brand-950/30 rounded-2xl border border-brand-200 dark:border-brand-800/60 space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-900 dark:text-brand-200">Código OTP</label>
              <input
                type="text"
                placeholder="123456"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                className="w-full px-4 py-3 rounded-xl bg-white dark:bg-surface-900 border border-brand-300 dark:border-brand-700 text-surface-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all placeholder:text-surface-400 text-center font-mono text-lg tracking-widest font-bold"
                {...register("otp")}
              />
              <p className="text-xs text-surface-600 dark:text-surface-400">
                Te enviamos un código de 6 dígitos al correo. Expira en 10 minutos.
              </p>
              <button
                type="button"
                onClick={onResendOtp}
                disabled={resending || loading}
                className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
              >
                {resending ? "Reenviando..." : "¿No recibiste el código? Reenviar"}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-xs hover:shadow-brand-500/20 text-sm"
          >
            {loading ? "Verificando..." : requiresOtp ? "Verificar código" : "Iniciar Sesión"}
            {!loading && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>}
          </button>
        </form>

        <p className="mt-8 text-center text-xs sm:text-sm text-surface-600 dark:text-surface-400">
          ¿No tienes una cuenta? <Link to="/register" className="font-semibold text-brand-600 dark:text-brand-400 hover:underline">Regístrate aquí</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
