import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { verifyAccount as verifyAccountRequest } from '../../api/auth.api';
import { getApiErrorMessage } from '../../api/errors';
import { toast } from 'react-toastify';

type ConfirmStatus = 'idle' | 'success' | 'error';

const Confirm = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<ConfirmStatus>('idle');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

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

  const verifyAccount = async () => {
    if (loading || status === 'success' || !token) return;
    setLoading(true);

    try {
      const res = await verifyAccountRequest(token);
      setStatus('success');
      toast.success(res.message || 'Cuenta verificada correctamente');

      setTimeout(() => {
        navigate('/login');
      }, 2500);

    } catch (error: unknown) {
      setStatus('error');
      toast.error(getApiErrorMessage(error, 'Token inválido o expirado'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900 flex items-center justify-center p-6 transition-colors duration-300 relative font-sans">

      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 md:top-10 md:right-10 p-2 rounded-lg bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:text-primary-600 dark:hover:text-primary-400 border border-surface-200 dark:border-surface-700 shadow-sm transition-colors z-10"
      >
        {theme === 'light' ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
        )}
      </button>

      <div className="w-full max-w-md bg-white dark:bg-surface-800 rounded-2xl shadow-soft border border-surface-100 dark:border-surface-700 p-8 md:p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary-600"></div>

        <div className="text-center">

          {status === 'idle' && (
            <>
              <div className="w-20 h-20 bg-surface-100 dark:bg-surface-900/50 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center mx-auto mb-6 border border-surface-200 dark:border-surface-700">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
              </div>
              <h2 className="text-3xl font-display font-bold text-surface-900 dark:text-white mb-4">Verificación de Cuenta</h2>
              <p className="text-surface-500 dark:text-surface-400 mb-8 leading-relaxed">
                Estás a un paso de acceder a tu entorno de aprendizaje. Haz clic en el botón para confirmar tu correo institucional.
              </p>
              <button
                onClick={verifyAccount}
                disabled={loading}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {loading ? 'Verificando...' : 'Verificar mi cuenta'}
              </button>
            </>
          )}

          {status === 'success' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-200 dark:border-emerald-500/20">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h2 className="text-3xl font-display font-bold text-surface-900 dark:text-white mb-2">¡Todo listo!</h2>
              <p className="text-surface-500 dark:text-surface-400">Tu cuenta ha sido verificada correctamente.</p>
              <p className="text-sm text-primary-600 dark:text-primary-400 font-medium mt-6 animate-pulse">
                Redirigiendo al inicio de sesión...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-24 h-24 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-200 dark:border-red-500/20">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
              <h2 className="text-3xl font-display font-bold text-surface-900 dark:text-white mb-2">Enlace inválido</h2>
              <p className="text-surface-500 dark:text-surface-400 mb-8">
                Es posible que ya hayas verificado tu cuenta o que este enlace haya caducado.
              </p>
              <Link
                to="/login"
                className="w-full inline-block bg-surface-900 dark:bg-white text-white dark:text-surface-900 font-medium py-3 rounded-lg hover:shadow-lg transition-all"
              >
                Ir al Inicio de Sesión
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Confirm;
