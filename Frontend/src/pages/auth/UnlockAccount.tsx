import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { unlockAccount } from '../../api/auth.api';
import { ThemeToggle, Icon } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';

type UnlockState = 'idle' | 'loading' | 'success' | 'invalid' | 'error';

/**
 * Página para el enlace de desbloqueo que el administrador recibe por correo.
 *
 * El backend expone además un `GET /auth/unlock-account/:token` que devuelve
 * HTML renderizado por el servidor; ese es el que abre el correo directamente.
 * Esta pantalla cubre el mismo flujo desde la SPA, que es más accesible y está
 * en el idioma del usuario.
 */
const UnlockAccount = () => {
  const { token } = useParams();
  const [state, setState] = useState<UnlockState>('idle');
  const [message, setMessage] = useState('');
  const { theme, toggleTheme } = useTheme();

  const handleUnlock = async () => {
    if (!token) {
      setState('invalid');
      setMessage('El enlace de desbloqueo no es válido.');
      return;
    }

    setState('loading');
    const res = await unlockAccount(token);

    if (res.ok) {
      setState('success');
      setMessage(res.message);
      return;
    }

    setState(res.reason === 'invalid-token' ? 'invalid' : 'error');
    setMessage(res.message);
  };

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
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-600 via-brand-600 to-brand-500" />

        <div className="text-center">
          <div
            className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 ${
              state === 'success'
                ? 'bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 border border-surface-200 dark:border-surface-700'
                : state === 'invalid' || state === 'error'
                ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-500 border border-brand-200 dark:border-brand-500/20'
                : 'bg-surface-100 dark:bg-surface-900/50 text-brand-600 dark:text-brand-400 border border-surface-200 dark:border-surface-700'
            }`}
          >
            <Icon
              name={state === 'success' ? 'check' : state === 'invalid' || state === 'error' ? 'x' : 'lock'}
              className="h-10 w-10"
            />
          </div>

          <h1 className="text-2xl font-display font-bold text-surface-900 dark:text-white mb-2">
            Desbloqueo de cuenta
          </h1>

          {state === 'idle' && (
            <p className="text-surface-500 dark:text-surface-400 text-sm mb-8">
              Tu cuenta fue bloqueada tras varios intentos fallidos. Pulsa el botón para reactivarla.
            </p>
          )}

          {state === 'loading' && (
            <p className="text-surface-500 dark:text-surface-400 text-sm mb-8" role="status">
              Desbloqueando tu cuenta...
            </p>
          )}

          {message && state !== 'loading' && state !== 'idle' && (
            <p
              className={`text-sm mb-8 ${
                state === 'success' ? 'text-surface-900 dark:text-surface-100' : 'text-brand-600 dark:text-brand-400'
              }`}
              role="status"
            >
              {message}
            </p>
          )}

          {state === 'success' ? (
            <Link
              to="/login"
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 rounded-xl transition-all shadow-xs hover:shadow-brand-500/20"
            >
              Ir a iniciar sesión
            </Link>
          ) : (
            <button
              onClick={handleUnlock}
              disabled={state === 'loading'}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-xs hover:shadow-brand-500/20"
            >
              {state === 'idle' ? 'Desbloquear mi cuenta' : 'Reintentar'}
            </button>
          )}

          <p className="mt-6 text-center text-sm text-surface-500">
            ¿Recordaste tu contraseña?{' '}
            <Link to="/forgot" className="text-brand-600 dark:text-brand-400 hover:underline">
              Recuperar acceso
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default UnlockAccount;