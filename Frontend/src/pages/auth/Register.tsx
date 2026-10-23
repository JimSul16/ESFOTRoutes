import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { register as registerAccount } from '../../api/auth.api';
import { getApiErrorMessage } from '../../api/errors';

interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

const EMPTY_FORM: RegisterForm = { firstName: '', lastName: '', email: '', password: '' };

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState<RegisterForm>(EMPTY_FORM);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const submitRegistration = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await registerAccount({
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        password: formData.password,
      });

      toast.success(res.message || 'Registro exitoso. Por favor revisa tu correo para activar la cuenta.');
      navigate('/login');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Error al registrar la cuenta'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface-50 dark:bg-surface-950 relative overflow-hidden transition-colors duration-300 font-sans">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white/95 dark:bg-surface-900/90 backdrop-blur-xl rounded-3xl shadow-xl border border-surface-200/80 dark:border-surface-800 relative z-10 overflow-hidden my-8">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-600 via-rose-600 to-brand-500" />

        <button
          onClick={() => navigate('/login')}
          className="absolute top-5 left-5 p-2 rounded-xl text-surface-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          title="Volver"
          aria-label="Volver al inicio de sesión"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"></path></svg>
        </button>

        <div className="p-8 sm:p-10 mt-2">
          <div className="text-center mb-7">
            <div className="inline-flex items-center gap-2 mb-3">
              <div className="bg-gradient-to-tr from-brand-600 to-brand-800 text-white px-2.5 py-1 rounded-xl font-black text-sm tracking-wider shadow-xs">
                ESFOT
              </div>
              <span className="text-xl font-display font-extrabold text-surface-900 dark:text-white tracking-tight">Rutas</span>
            </div>
            <h2 className="text-2xl font-display font-extrabold text-surface-900 dark:text-white tracking-tight mb-1.5">
              Crea tu perfil TSDS
            </h2>
            <p className="text-surface-500 dark:text-surface-400 text-xs sm:text-sm">
              Organiza tu malla curricular y asegura tu avance en la EPN.
            </p>
          </div>

          <form onSubmit={submitRegistration} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="block text-xs font-semibold uppercase tracking-wider text-surface-700 dark:text-surface-300 mb-1.5">Nombres</label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="Juan"
                  className="w-full bg-surface-50 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700 rounded-xl px-3.5 py-2.5 text-surface-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-surface-400"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-xs font-semibold uppercase tracking-wider text-surface-700 dark:text-surface-300 mb-1.5">Apellidos</label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Pérez"
                  className="w-full bg-surface-50 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700 rounded-xl px-3.5 py-2.5 text-surface-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-surface-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-surface-700 dark:text-surface-300 mb-1.5">Correo Institucional</label>
              <input
                id="email"
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                placeholder="nombre.apellido@epn.edu.ec"
                className="w-full bg-surface-50 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700 rounded-xl px-3.5 py-2.5 text-surface-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-surface-400"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-surface-700 dark:text-surface-300 mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className="w-full bg-surface-50 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700 rounded-xl px-3.5 py-2.5 pr-11 text-surface-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-surface-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors p-1"
                  aria-label="Ver u ocultar contraseña"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center gap-2 shadow-xs hover:shadow-brand-500/20 text-sm"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                ) : (
                  "Registrarse ahora"
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <span className="text-surface-500 dark:text-surface-400 text-xs sm:text-sm">¿Ya tienes una cuenta? </span>
            <Link to="/login" className="text-brand-600 dark:text-brand-400 hover:underline text-xs sm:text-sm font-semibold transition-colors">
              Inicia Sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
