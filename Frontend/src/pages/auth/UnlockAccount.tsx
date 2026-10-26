import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { unlockAccount } from '../../api/auth.api';

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
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900 flex items-center justify-center p-6 transition-colors duration-300 font-sans">
      <div className="w-full max-w-md bg-white dark:bg-surface-800 rounded-2xl shadow-soft border border-surface-100 dark:border-surface-700 p-8 md:p-12">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary-600 rounded-t-2xl" />

        <div className="text-center">
          <div
            className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 ${
              state === 'success'
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                : state === 'invalid' || state === 'error'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
                : 'bg-primary-100 dark:bg-primary-900/30 text-primary-600'
            }`}
          >
            <span className="text-3xl" aria-hidden="true">
              {state === 'success' ? '✓' : state === 'idle' || state === 'loading' ? '🔓' : '✕'}
            </span>
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
                state === 'success' ? 'text-emerald-600' : 'text-red-600'
              }`}
              role="status"
            >
              {message}
            </p>
          )}

          {state === 'success' ? (
            <Link
              to="/login"
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-lg transition-all"
            >
              Ir a iniciar sesión
            </Link>
          ) : (
            <button
              onClick={handleUnlock}
              disabled={state === 'loading'}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {state === 'idle' ? 'Desbloquear mi cuenta' : 'Reintentar'}
            </button>
          )}

          <p className="mt-6 text-center text-sm text-surface-500">
            ¿Recordaste tu contraseña?{' '}
            <Link to="/forgot" className="text-primary-600 dark:text-primary-400 hover:underline">
              Recuperar acceso
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default UnlockAccount;