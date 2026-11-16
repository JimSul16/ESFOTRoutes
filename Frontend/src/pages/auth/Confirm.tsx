import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { verifyAccount as verifyAccountRequest } from '../../api/auth.api';
import { getApiErrorMessage } from '../../api/errors';
import { ThemeToggle } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';

type ConfirmStatus = 'idle' | 'success' | 'error';

const Confirm = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<ConfirmStatus>('idle');
  // El error del backend se muestra dentro de la tarjeta, no como toast: la
  // pantalla ya tiene su propio panel de error y el toast era redundante.
  const [errorMessage, setErrorMessage] = useState('');
  const { theme, toggleTheme } = useTheme();
  // Una sola petición por visita: <StrictMode> monta el efecto dos veces en
  // desarrollo y un segundo disparo devolvería 400 "Token inválido" aunque el
  // primero hubiera verificado la cuenta.
  const attemptedRef = useRef(false);

  const verifyAccount = async () => {
    if (loading || status === 'success' || !token) return;
    setLoading(true);

    try {
      await verifyAccountRequest(token);
      setStatus('success');

      setTimeout(() => {
        navigate('/login');
      }, 2500);

    } catch (error: unknown) {
      setStatus('error');
      setErrorMessage(getApiErrorMessage(error, 'Token inválido o expirado'));
    } finally {
      setLoading(false);
    }
  };

  // El link del correo activa la cuenta AL ABRIRLO. Antes hacía falta un clic
  // manual: si el usuario no lo daba (o lo daba dos veces) veía "Token
  // inválido" y el enlace parecía no servir.
  useEffect(() => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    if (!token) {
      setStatus('error');
      setErrorMessage('El enlace de verificación no es válido.');
      return;
    }

    void verifyAccount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center p-6 transition-colors duration-300 relative font-sans overflow-hidden">

      {/* Ambient background glow, igual que Login/Register */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

      <ThemeToggle
        theme={theme}
        onToggle={toggleTheme}
        className="absolute top-6 right-6 z-10 md:top-10 md:right-10"
      />

      <div className="w-full max-w-md bg-white/95 dark:bg-surface-900/90 backdrop-blur-xl rounded-3xl shadow-xl border border-surface-200/80 dark:border-surface-800 p-8 md:p-12 relative overflow-hidden z-10">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-600 via-brand-600 to-brand-500"></div>

        <div className="text-center">

          {status === 'idle' && (
            <>
              <div className="w-20 h-20 bg-surface-100 dark:bg-surface-900/50 text-brand-600 dark:text-brand-400 rounded-full flex items-center justify-center mx-auto mb-6 border border-surface-200 dark:border-surface-700">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
              </div>
              <h2 className="text-3xl font-display font-bold text-surface-900 dark:text-white mb-4">Verificación de Cuenta</h2>
              <p className="text-surface-500 dark:text-surface-400 mb-8 leading-relaxed">
                Estás a un paso de acceder a tu entorno de aprendizaje. Estamos confirmando tu correo automáticamente; si no sucede, usa el botón.
              </p>
              <button
                onClick={verifyAccount}
                disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-xs hover:shadow-brand-500/20"
              >
                {loading ? 'Verificando...' : 'Verificar mi cuenta'}
              </button>
            </>
          )}

          {status === 'success' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-24 h-24 bg-surface-900 dark:bg-surface-100 text-surface-50 dark:text-surface-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-surface-900 dark:border-surface-100">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h2 className="text-3xl font-display font-bold text-surface-900 dark:text-white mb-2">¡Todo listo!</h2>
              <p className="text-surface-500 dark:text-surface-400">Tu cuenta ha sido verificada correctamente.</p>
              <p className="text-sm text-brand-600 dark:text-brand-400 font-medium mt-6 animate-pulse">
                Redirigiendo al inicio de sesión...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-24 h-24 bg-brand-50 dark:bg-brand-500/10 text-brand-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-brand-200 dark:border-brand-500/20">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
              <h2 className="text-3xl font-display font-bold text-surface-900 dark:text-white mb-2">Enlace inválido</h2>
              <div className="mb-8 space-y-3">
                <p className="text-surface-500 dark:text-surface-400">
                  Es posible que ya hayas verificado tu cuenta o que este enlace haya caducado.
                </p>
                {errorMessage && (
                  <p
                    role="alert"
                    className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700 dark:border-brand-800/70 dark:bg-brand-950/40 dark:text-brand-300"
                  >
                    {errorMessage}
                  </p>
                )}
              </div>
              <Link
                to="/login"
                className="w-full inline-block bg-surface-900 dark:bg-white text-white dark:text-surface-900 font-medium py-3 rounded-lg hover:shadow-lg transition-all"
              >
                Ir al Inicio de Sesión
              </Link>
              <button
                type="button"
                onClick={() => {
                  setStatus('idle');
                  setErrorMessage('');
                  void verifyAccount();
                }}
                disabled={loading}
                className="w-full mt-3 bg-transparent border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 font-medium py-3 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-all disabled:opacity-60"
              >
                {loading ? 'Verificando...' : 'Reintentar verificación'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Confirm;
