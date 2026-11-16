import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { forgotPassword } from "../../api/auth.api";
import { getApiErrorMessage } from "../../api/errors";
import { ThemeToggle, Icon } from "@/components/ui";
import { useTheme } from "@/hooks/useTheme";

const forgotSchema = z.object({
  email: z
    .string()
    .min(1, "El correo es obligatorio")
    .email("Correo electrónico inválido")
});

type ForgotValues = z.infer<typeof forgotSchema>;

const Forgot = () => {
  const [loading, setLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();
  // Mismo patrón que Login: el resultado vive dentro de la tarjeta, no se
  // auto-cierra y solo se limpia al editar el campo, al reenviar o al cerrarlo.
  // A diferencia de Login, acá el éxito también va adentro: enviar el correo no
  // cambia el formulario, así que un toast de 3 s era el único feedback.
  const [feedback, setFeedback] = useState<{ tone: "error" | "success"; message: string } | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(forgotSchema)
  });

  const sendEmail = async (dataForm: ForgotValues) => {
    setFeedback(null);
    setLoading(true);
    try {
      // Antes este endpoint no daba ninguna señal al usuario: el éxito era
      // silencioso y el error solo llegaba a la consola. Ahora ambos se avisan.
      const res = await forgotPassword({ email: dataForm.email });
      setFeedback({
        tone: "success",
        message: res.message || "Si el correo está registrado, recibirás un enlace de recuperación.",
      });
    } catch (error: unknown) {
      setFeedback({
        tone: "error",
        message: getApiErrorMessage(error, "No se pudo enviar el enlace de recuperación."),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center p-6 transition-colors duration-300 relative font-sans overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

      <Link
        to="/login"
        className="absolute top-6 left-6 md:top-10 md:left-10 flex items-center gap-2 text-surface-500 dark:text-surface-400 hover:text-brand-600 dark:hover:text-brand-400 font-semibold text-sm transition-colors bg-white/80 dark:bg-surface-900/80 backdrop-blur-md px-4 py-2.5 rounded-xl shadow-xs border border-surface-200/80 dark:border-surface-800 z-10"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
        Regresar
      </Link>

      <ThemeToggle
        theme={theme}
        onToggle={toggleTheme}
        className="absolute top-6 right-6 z-10 md:top-10 md:right-10"
      />

      <div className="w-full max-w-md bg-white/95 dark:bg-surface-900/90 backdrop-blur-xl rounded-3xl shadow-xl border border-surface-200/80 dark:border-surface-800 p-8 md:p-10 relative overflow-hidden mt-12 md:mt-0 z-10">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-600 via-brand-600 to-brand-500" />

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
              className={`w-full px-4 py-3 rounded-xl bg-surface-50 dark:bg-surface-800/60 border ${errors.email ? 'border-brand-500' : 'border-surface-200 dark:border-surface-700'} text-surface-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all placeholder:text-surface-400 text-sm`}
              {...register("email", { onChange: () => setFeedback(null) })}
            />
            {errors.email && <p className="text-brand-500 dark:text-brand-400 text-xs mt-1.5 font-medium">{errors.email.message}</p>}
          </div>

          {feedback && (
            <div
              role={feedback.tone === "error" ? "alert" : "status"}
              className={
                feedback.tone === "error"
                  ? "flex items-start gap-3 rounded-xl border border-brand-300 bg-brand-50 px-4 py-3 text-sm text-brand-700 dark:border-brand-800/70 dark:bg-brand-500/10 dark:text-brand-300"
                  : "flex items-start gap-3 rounded-xl border border-surface-300 bg-surface-100 px-4 py-3 text-sm text-surface-800 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-200"
              }
            >
              <Icon
                name={feedback.tone === "error" ? "circleAlert" : "circleCheck"}
                className="mt-0.5 h-4 w-4 shrink-0"
              />
              <p className="flex-1 font-medium">{feedback.message}</p>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                aria-label="Cerrar aviso"
                className="shrink-0 opacity-70 transition-opacity hover:opacity-100"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
          )}

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
