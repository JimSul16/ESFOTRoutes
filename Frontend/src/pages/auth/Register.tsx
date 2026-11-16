import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register as registerAccount } from '../../api/auth.api';
import { getApiErrorMessage } from '../../api/errors';
import { isAllowedEmailDomain, ALLOWED_EMAIL_DOMAIN_ERROR } from '../../utils/email';
import { Icon } from '@/components/ui';
import { CAREERS, SEMESTERS } from '../../types';

interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  career: string;
  semester: string;
  uniqueId: string;
}

const EMPTY_FORM: RegisterForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  career: '',
  semester: '',
  uniqueId: '',
};

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // El resultado vive dentro de la tarjeta. Antes era un toast que se perdía:
  // el registro navega a /login de inmediato, así que nunca se alcanzaba a leer.
  const [feedback, setFeedback] = useState<{ tone: 'error' | 'success'; message: string } | null>(null);

  const [formData, setFormData] = useState<RegisterForm>(EMPTY_FORM);
  // "Otra carrera": el backend acepta cualquier carrera ≥ 3 caracteres, pero el
  // <select> solo lista las oficiales. Sin esta salida, un estudiante cuya
  // carrera no esté en la lista NO puede registrarse (el campo es `required`).
  const [careerOther, setCareerOther] = useState('');

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFeedback(null);
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const submitRegistration = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setLoading(true);

    // Carrera: la elegida en el <select> o la escrita en "Otra carrera".
    const career = formData.career === '__otra__' ? careerOther.trim() : formData.career;
    const trimmedUniqueId = formData.uniqueId.trim();

    // Dominio validado ANTES de la petición (mismo criterio que el backend
    // `register`): así el usuario ve el motivo sin esperar el viaje a Render.
    if (!isAllowedEmailDomain(formData.email.trim())) {
      setFeedback({ tone: 'error', message: `${ALLOWED_EMAIL_DOMAIN_ERROR}.` });
      setLoading(false);
      return;
    }

    if (!career || career.length < 3 || !formData.semester || !/^\d{9}$/.test(trimmedUniqueId)) {
      setFeedback({
        tone: 'error',
        message: 'Debes completar carrera, semestre e ID único EPN (9 dígitos).',
      });
      setLoading(false);
      return;
    }

    try {
      const res = await registerAccount({
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email.trim(),
        password: formData.password,
        career,
        semester: Number(formData.semester),
        uniqueId: trimmedUniqueId,
      });

      setFeedback({
        tone: 'success',
        message: res.message || 'Registro exitoso. Por favor revisa tu correo para activar la cuenta.',
      });
      // Se espera a que el mensaje se pueda leer antes de saltar a /login.
      // `loading` sigue en true para que no se dispare un segundo envío.
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err: unknown) {
      setFeedback({
        tone: 'error',
        message: getApiErrorMessage(err, 'Error al registrar la cuenta'),
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface-50 dark:bg-surface-950 relative overflow-hidden transition-colors duration-300 font-sans">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white/95 dark:bg-surface-900/90 backdrop-blur-xl rounded-3xl shadow-xl border border-surface-200/80 dark:border-surface-800 relative z-10 overflow-hidden my-8">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-600 via-brand-600 to-brand-500" />

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
              <p className="text-xs text-surface-400 mt-1.5">
                Aceptamos correos <strong>@epn.edu.ec</strong> y <strong>@gmail.com</strong>.
              </p>
            </div>

            <div>
              <label htmlFor="uniqueId" className="block text-xs font-semibold uppercase tracking-wider text-surface-700 dark:text-surface-300 mb-1.5">ID Único EPN</label>
              <input
                id="uniqueId"
                name="uniqueId"
                type="text"
                required
                maxLength={9}
                value={formData.uniqueId}
                onChange={handleInputChange}
                placeholder="123456789 (9 dígitos)"
                className="w-full bg-surface-50 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700 rounded-xl px-3.5 py-2.5 text-surface-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-surface-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="career" className="block text-xs font-semibold uppercase tracking-wider text-surface-700 dark:text-surface-300 mb-1.5">Carrera</label>
                <select
                  id="career"
                  name="career"
                  required
                  value={formData.career}
                  onChange={handleInputChange}
                  className="w-full bg-surface-50 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700 rounded-xl px-3.5 py-2.5 text-surface-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                >
                  <option value="" disabled>Selecciona carrera</option>
                  {CAREERS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="__otra__">Otra carrera (escribir)</option>
                </select>
                {formData.career === '__otra__' && (
                  <input
                    id="careerOther"
                    name="careerOther"
                    type="text"
                    required
                    minLength={3}
                    value={careerOther}
                    onChange={(e) => {
                      setFeedback(null);
                      setCareerOther(e.target.value);
                    }}
                    placeholder="Nombre de tu carrera (mínimo 3 caracteres)"
                    className="mt-2 w-full bg-surface-50 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700 rounded-xl px-3.5 py-2.5 text-surface-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-surface-400"
                  />
                )}
              </div>
              <div>
                <label htmlFor="semester" className="block text-xs font-semibold uppercase tracking-wider text-surface-700 dark:text-surface-300 mb-1.5">Semestre</label>
                <select
                  id="semester"
                  name="semester"
                  required
                  value={formData.semester}
                  onChange={handleInputChange}
                  className="w-full bg-surface-50 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700 rounded-xl px-3.5 py-2.5 text-surface-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                >
                  <option value="" disabled>Semestre</option>
                  {SEMESTERS.map((s) => (
                    <option key={s} value={s}>{s}° Semestre</option>
                  ))}
                </select>
              </div>
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

            {feedback && (
              <div
                role={feedback.tone === 'error' ? 'alert' : 'status'}
                className={
                  feedback.tone === 'error'
                    ? 'flex items-start gap-3 rounded-xl border border-brand-300 bg-brand-50 px-4 py-3 text-sm text-brand-700 dark:border-brand-800/70 dark:bg-brand-500/10 dark:text-brand-300'
                    : 'flex items-start gap-3 rounded-xl border border-surface-300 bg-surface-100 px-4 py-3 text-sm text-surface-800 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-200'
                }
              >
                <Icon
                  name={feedback.tone === 'error' ? 'circleAlert' : 'circleCheck'}
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
