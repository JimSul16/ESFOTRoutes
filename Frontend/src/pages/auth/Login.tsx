import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { login as loginRequest, isLoginSuccess } from "../../api/auth.api";
import { getApiErrorMessage } from "../../api/errors";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Icon, ThemeToggle } from "@/components/ui";
import { ALLOWED_EMAIL_DOMAIN_ERROR, isAllowedEmailDomain, normalizeEmail } from "../../utils/email";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "El correo es obligatorio")
    .email("Correo electrónico inválido")
    // Mismos dominios que el panel de admin y que el backend: EPN y Gmail.
    // La comparación es insensible a mayúsculas, así que un correo guardado
    // como `Ana@Gmail.com` sigue siendo válido para iniciar sesión.
    .refine(isAllowedEmailDomain, {
      message: ALLOWED_EMAIL_DOMAIN_ERROR,
    }),
  password: z
    .string()
    .min(1, "La contrasena es obligatoria"),
});

type LoginValues = z.infer<typeof loginSchema>;

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  // Aviso de error del formulario. Vive dentro de la tarjeta (no en el toast
  // global) y no se auto-cierra: persiste hasta que el usuario edita un campo,
  // vuelve a enviar o pulsa el botón de cierre.
  const [formError, setFormError] = useState<string | null>(null);
  // Aviso de éxito (p. ej. "cuenta verificada") con estilo distinto al error.
  const [notice, setNotice] = useState<string | null>(null);

  const navigate = useNavigate();
  const { loginAuth } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // El backend redirige a `/login?verified=true` (o `/login?error=invalid_token`)
  // cuando el enlace del correo se abre directamente contra la API con
  // `Accept: text/html`. Sin leer estos parámetros, el usuario llegaba al login
  // sin ningún mensaje y parecía que el enlace no servía.
  useEffect(() => {
    const verified = searchParams.get("verified");
    const error = searchParams.get("error");

    if (verified === "true") {
      setNotice("Cuenta verificada correctamente. Ya puedes iniciar sesión.");
    } else if (error === "invalid_token") {
      setFormError("El enlace de verificación no es válido o ya fue utilizado.");
    }

    if (verified !== null || error !== null) {
      const next = new URLSearchParams(searchParams);
      next.delete("verified");
      next.delete("error");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (dataForm: LoginValues) => {
    // Un nuevo envío descarta el aviso anterior.
    setFormError(null);
    setNotice(null);
    setLoading(true);
    try {
      // El correo se normaliza antes de enviarlo: el backend busca con
      // `WHERE email = ?` y SQLite compara TEXT distinguiendo mayúsculas, así
      // que `Ana@Gmail.com` no emparejaría con el `ana@gmail.com` guardado.
      const res = await loginRequest({ ...dataForm, email: normalizeEmail(dataForm.email) });

      // OJO: `httpClient` acepta cualquier status 2xx, así que el 206 del
      // backend (OTP requerido) RESUELVE, no lanza. Por eso el caso se
      // discrimina por la presencia de `token` y no en el catch.
      if (isLoginSuccess(res)) {
        loginAuth(res.token, res.user);
        navigate(res.user.roles?.includes("ADMIN") ? "/admin" : "/dashboard");
        return;
      }

      // El backend solo responde 206 cuando `REQUIRE_2FA === 'true'`. Esta
      // pantalla ya no ofrece el código, así que se avisa de forma explícita
      // en vez de dejar el login colgado sin campo donde escribirlo.
      setFormError(
        "El servidor exige verificación en dos pasos, que ya no está disponible en esta pantalla. Contacta al administrador."
      );
    } catch (error: unknown) {
      setFormError(getApiErrorMessage(error, "No se pudo iniciar sesión."));
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
        to="/"
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
          <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-surface-900 dark:text-white tracking-tight mb-2">Bienvenido de nuevo</h2>
          <p className="text-surface-500 dark:text-surface-400 text-xs sm:text-sm">Ingresa tus credenciales para continuar tu aprendizaje en TSDS.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-surface-700 dark:text-surface-300 mb-2">Correo Institucional</label>
            <input
              type="email"
              placeholder="alexander.cajamarca@epn.edu.ec"
              className={`w-full px-4 py-3 rounded-xl bg-surface-50 dark:bg-surface-800/60 border ${errors.email ? 'border-brand-500' : 'border-surface-200 dark:border-surface-700'} text-surface-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all placeholder:text-surface-400 text-sm`}
              {...register("email", { onChange: () => setFormError(null) })}
            />
            {errors.email && <p className="text-brand-500 dark:text-brand-400 text-xs mt-1.5 font-medium">{errors.email.message}</p>}
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
                className={`w-full px-4 py-3 rounded-xl bg-surface-50 dark:bg-surface-800/60 border ${errors.password ? 'border-brand-500' : 'border-surface-200 dark:border-surface-700'} text-surface-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all placeholder:text-surface-400 text-sm`}
                {...register("password", { onChange: () => setFormError(null) })}
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
            {errors.password && <p className="text-brand-500 dark:text-brand-400 text-xs mt-1.5 font-medium">{errors.password.message}</p>}
          </div>

          {notice && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-xl border border-surface-300 bg-surface-100 px-4 py-3 text-sm text-surface-800 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-200"
            >
              <Icon name="circleCheck" className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="flex-1 font-medium">{notice}</p>
              <button
                type="button"
                onClick={() => setNotice(null)}
                aria-label="Cerrar aviso"
                className="shrink-0 opacity-70 transition-opacity hover:opacity-100"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
          )}

          {formError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-brand-300 bg-brand-50 px-4 py-3 text-sm text-brand-700 dark:border-brand-800/70 dark:bg-brand-950/40 dark:text-brand-300"
            >
              <Icon name="circleAlert" className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="flex-1 font-medium">{formError}</p>
              <button
                type="button"
                onClick={() => setFormError(null)}
                aria-label="Cerrar aviso"
                className="shrink-0 text-brand-500 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-200"
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
            {loading ? "Verificando..." : "Iniciar Sesión"}
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
