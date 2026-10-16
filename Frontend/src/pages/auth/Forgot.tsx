import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import { forgotPassword } from "../../api/auth.api";
import { getApiErrorMessage } from "../../api/errors";

const forgotSchema = z.object({
  email: z
    .string()
    .min(1, "El correo es obligatorio")
    .email("Correo electrónico inválido")
});

type ForgotValues = z.infer<typeof forgotSchema>;

const Forgot = () => {
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(forgotSchema)
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

  const sendEmail = async (dataForm: ForgotValues) => {
    setLoading(true);
    try {
      // Antes este endpoint no daba ninguna señal al usuario: el éxito era
      // silencioso y el error solo llegaba a la consola. Ahora ambos se avisan.
      const res = await forgotPassword({ email: dataForm.email });
      toast.success(res.message || "Si el correo está registrado, recibirás un enlace de recuperación.");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "No se pudo enviar el enlace de recuperación."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center p-6 transition-colors duration-300 relative font-sans overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      <Link
        to="/login"
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
          <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-surface-900 dark:text-white tracking-tight mb-2">Recuperar Acceso</h2>
          <p className="text-surface-500 dark:text-surface-400 text-xs sm:text-sm">Ingresa tu correo y te enviaremos instrucciones para restablecer tu contraseña.</p>
        </div>

        <form onSubmit={handleSubmit(sendEmail)} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-surface-700 dark:text-surface-300 mb-2">Correo Electrónico</label>
            <input
              type="email"
              placeholder="ejemplo@gmail.com"
              className={`w-full px-4 py-3 rounded-xl bg-surface-50 dark:bg-surface-800/60 border ${errors.email ? 'border-rose-500' : 'border-surface-200 dark:border-surface-700'} text-surface-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all placeholder:text-surface-400 text-sm`}
              {...register("email")}
            />
            {errors.email && <p className="text-rose-500 dark:text-rose-400 text-xs mt-1.5 font-medium">{errors.email.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-xs hover:shadow-brand-500/20 text-sm"
          >
            {loading ? "Enviando enlace..." : "Recuperar acceso"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Forgot;
