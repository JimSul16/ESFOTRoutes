import { useState, useRef, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import { Card, Badge, Spinner } from '@/components/ui';
import { changePassword, forgotPassword, getSessions, updateProfile } from '../../../api/auth.api';
import { uploadProfileImage } from '../../../api/upload.api';
import { getApiErrorMessage } from '../../../api/errors';
import type { SessionEntry, User, UserDashboard } from '../../../types';

export interface StudentProfileProps {
  userData: UserDashboard;
  onPhotoUpdate: (newPhotoUrl: string) => void;
  /** Avisa al dashboard para que refresque el perfil tras editarlo. */
  onProfileUpdate?: (user: User) => void;
}

/** El backend guarda la fecha como texto SQLite; se normaliza a Date. */
const formatSessionDate = (session: SessionEntry): string => {
  const raw = session.createdAt ?? session.loginTime ?? session.date;
  if (!raw) return 'N/A';
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? 'N/A' : parsed.toLocaleString();
};

const EMPTY_PASSWORD = { currentPassword: '', newPassword: '' };

const StudentProfile = ({ userData, onPhotoUpdate, onProfileUpdate }: StudentProfileProps) => {
  const [uploading, setUploading] = useState(false);
  const [errorMsj, setErrorMsj] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Edición del perfil (PUT /auth/profile) ────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(userData.name);
  const [savingProfile, setSavingProfile] = useState(false);

  const startEdit = () => {
    setNameDraft(userData.name);
    setEditing(true);
  };

  const cancelEdit = () => {
    setNameDraft(userData.name);
    setEditing(false);
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();

    const name = nameDraft.trim();
    if (name.length < 3) {
      toast.error('El nombre debe tener al menos 3 caracteres.');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await updateProfile({ name });
      onProfileUpdate?.(res.user);
      toast.success(res.message || 'Perfil actualizado correctamente.');
      setEditing(false);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'No se pudo actualizar el perfil.'));
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Cambio de contraseña (PUT /auth/change-password) ─────────────────────
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD);
  const [savingPassword, setSavingPassword] = useState(false);

  const setPasswordField = (field: keyof typeof EMPTY_PASSWORD, value: string) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  };

  const cancelPassword = () => {
    setPasswordForm(EMPTY_PASSWORD);
    setChangingPassword(false);
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword.length < 8) {
      toast.error('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await changePassword(passwordForm);
      toast.success(res.message || 'Contraseña actualizada con éxito.');
      cancelPassword();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'No se pudo actualizar la contraseña.'));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleForgotPassword = async () => {
    try {
      const res = await forgotPassword({ email: userData.email });
      toast.success(res.message || 'Te enviamos un enlace para restablecer tu contraseña.');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'No se pudo enviar el correo de recuperación.'));
    }
  };

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        // Antes: `response.data.sessions`, que nunca existía porque el backend
        // devuelve el array plano. `getSessions()` ya lo desenvuelve.
        setSessions(await getSessions());
      } catch (error: unknown) {
        console.error('Error fetching sessions:', getApiErrorMessage(error));
      } finally {
        setLoadingSessions(false);
      }
    };

    fetchSessions();
  }, []);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsj('Solo se permiten archivos de imagen (JPG, PNG).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsj('La imagen no debe superar los 5MB.');
      return;
    }

    setErrorMsj(null);
    setUploading(true);

    try {
      const res = await uploadProfileImage(file);
      onPhotoUpdate(res.url);
    } catch (error: unknown) {
      console.error('Error subiendo foto a Cloudinary:', error);
      setErrorMsj(getApiErrorMessage(error, 'No se pudo subir la imagen.'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileInput = () => {
    if (!uploading) {
      fileInputRef.current?.click();
    }
  };

  const badges = [
    { name: 'Primera ruta', earned: (userData.xp ?? 0) > 0, icon: '🎯' },
    { name: 'Racha de 7 días', earned: (userData.streak || 0) >= 7, icon: '🔥' },
    { name: 'Explorador', earned: (userData.xp || 0) >= 500, icon: '🧭' },
    { name: 'Nivel 5', earned: (userData.level || 1) >= 5, icon: '⭐' },
  ];

  const xpForNextLevel = userData.nextRankXp || 1000;
  const currentLevelXp = userData.xp || 0;
  const progressPercent = Math.min((currentLevelXp / xpForNextLevel) * 100, 100);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300 pb-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-display font-extrabold text-surface-900 dark:text-surface-100 tracking-tight">
          Mi Perfil
        </h1>
        <p className="text-surface-500 dark:text-surface-400 text-xs sm:text-sm mt-0.5">
          Gestiona tu identidad y credenciales dentro de la plataforma.
        </p>
      </div>

      {errorMsj && (
        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 px-4 py-3 rounded-xl text-sm font-medium">
          {errorMsj}
        </div>
      )}

      <Card className="overflow-hidden border border-surface-200/80 dark:border-surface-800 rounded-3xl shadow-xs">
        <div className="p-6 sm:p-8 flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start">
          <div className="relative group cursor-pointer" onClick={triggerFileInput}>
            <div className={`w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden border-4 border-surface-100 dark:border-surface-800 shadow-md ${uploading ? 'opacity-50' : ''}`}>
              {userData.profilePicture ? (
                <img src={userData.profilePicture} alt="Perfil" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-brand-600 to-brand-800 flex items-center justify-center">
                  <span className="text-3xl sm:text-4xl font-display font-extrabold text-white">{userData.initials}</span>
                </div>
              )}
            </div>

            <div className="absolute inset-0 rounded-3xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>

            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-black/40">
                <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-b-2 border-white"></div>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/png, image/jpeg"
              onChange={handleFileChange}
            />
          </div>

          <div className="flex-1 text-center md:text-left">
            <h2 className="text-xl sm:text-2xl font-display font-extrabold text-surface-900 dark:text-surface-100 mb-1">{userData.name}</h2>
            <p className="text-surface-500 dark:text-surface-400 text-xs sm:text-sm mb-4">{userData.email}</p>

            <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-5">
              <Badge variant="primary">Estudiante EPN</Badge>
              <Badge variant="success">Nivel {userData.level || 1}</Badge>
              {(userData.streak ?? 0) > 0 && (
                <Badge variant="accent">🔥 {userData.streak} días de racha</Badge>
              )}
            </div>

            <div className="space-y-1.5 max-w-md">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-surface-500 dark:text-surface-400">Progreso al nivel {(userData.level || 1) + 1}</span>
                <span className="text-brand-600 dark:text-brand-400 font-mono">{currentLevelXp} / {xpForNextLevel} XP</span>
              </div>
              <div className="h-2.5 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-600 to-brand-700 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 bg-surface-50/70 dark:bg-surface-900/40 border-t border-surface-100 dark:border-surface-800">
          <h3 className="text-base font-display font-bold text-surface-900 dark:text-surface-100 mb-3.5">Insignias obtenidas</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {badges.map((badge) => (
              <div
                key={badge.name}
                className={`p-3.5 rounded-2xl text-center border transition-all ${
                  badge.earned
                    ? 'bg-white dark:bg-surface-800 border-brand-200 dark:border-brand-500/20 shadow-2xs'
                    : 'bg-surface-100/50 dark:bg-surface-800/30 border-surface-200/60 dark:border-surface-700/60 opacity-50'
                }`}
              >
                <div className="text-2xl mb-1.5">{badge.icon}</div>
                <div className={`text-xs font-semibold ${badge.earned ? 'text-surface-900 dark:text-surface-100' : 'text-surface-400'}`}>
                  {badge.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 border-t border-surface-100 dark:border-surface-800">
          <h3 className="text-lg font-display font-semibold text-surface-900 dark:text-white mb-4">
            Información de la cuenta
          </h3>

          {editing ? (
            <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label
                  htmlFor="profile-name"
                  className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1"
                >
                  Nombre completo
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  minLength={3}
                  required
                  className="w-full bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg px-4 py-2.5 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="mt-1 text-xs text-surface-400">
                  El correo no se puede cambiar: es tu identidad institucional.
                </p>
              </div>

              <div className="flex items-end gap-3">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium disabled:opacity-60"
                >
                  {savingProfile ? 'Guardando...' : 'Guardar cambios'}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-5 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 font-medium text-surface-600 dark:text-surface-300"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={userData.name}
                  readOnly
                  className="w-full bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg px-4 py-2.5 text-surface-700 dark:text-surface-200 focus:outline-none"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={startEdit}
                  className="px-5 py-2.5 rounded-lg border border-primary-600 text-primary-600 dark:text-primary-400 font-medium hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                >
                  Editar nombre
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">Correo electrónico</label>
              <input type="text" value={userData.email} readOnly className="w-full bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg px-4 py-2.5 text-surface-700 dark:text-surface-200 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">Rol en el sistema</label>
              <input type="text" value={userData.primaryRole} readOnly className="w-full bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg px-4 py-2.5 text-surface-700 dark:text-surface-200 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1">Puntos de experiencia</label>
              <input type="text" value={`${userData.xp || 0} XP`} readOnly className="w-full bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg px-4 py-2.5 text-surface-700 dark:text-surface-200 focus:outline-none" />
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-surface-100 dark:border-surface-800">
          <h3 className="text-lg font-display font-semibold text-surface-900 dark:text-white mb-4">
            Seguridad
          </h3>

          {changingPassword ? (
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div>
                <label
                  htmlFor="current-password"
                  className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1"
                >
                  Contraseña actual
                </label>
                <input
                  id="current-password"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordField('currentPassword', e.target.value)}
                  required
                  className="w-full bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg px-4 py-2.5 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label
                  htmlFor="new-password"
                  className="block text-sm font-medium text-surface-500 dark:text-surface-400 mb-1"
                >
                  Nueva contraseña
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordField('newPassword', e.target.value)}
                  minLength={8}
                  required
                  className="w-full bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg px-4 py-2.5 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="mt-1 text-xs text-surface-400">Mínimo 8 caracteres.</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-5 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium disabled:opacity-60"
                >
                  {savingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
                </button>
                <button
                  type="button"
                  onClick={cancelPassword}
                  className="px-5 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 font-medium text-surface-600 dark:text-surface-300"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => setChangingPassword(true)}
                className="px-5 py-2.5 rounded-lg border border-primary-600 text-primary-600 dark:text-primary-400 font-medium hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
              >
                Cambiar contraseña
              </button>
              <p className="text-sm text-surface-500 dark:text-surface-400">
                ¿No recuerdas la actual?{' '}
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Recupérala por correo
                </button>
              </p>
            </div>
          )}
        </div>

        <div className="p-8 border-t border-surface-100 dark:border-surface-800 bg-white dark:bg-surface-900">
          <h3 className="text-lg font-display font-semibold text-surface-900 dark:text-white mb-4">Historial de sesiones</h3>
          {loadingSessions ? (
            <div className="flex justify-center py-8">
              <Spinner className="text-primary-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-surface-500 dark:text-surface-400">
                <thead className="text-xs text-surface-700 uppercase bg-surface-50 dark:bg-surface-800 dark:text-surface-300">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Dispositivo</th>
                    <th className="px-4 py-3 font-medium">IP</th>
                    <th className="px-4 py-3 rounded-tr-lg font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.length > 0 ? (
                    sessions.map((session, index) => {
                      const isSuccess = session.status === 'SUCCESS' || session.status === 'Éxito' || session.success || session.status === 'success' || !session.status;
                      return (
                        <tr key={session.id ?? index} className="border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">{formatSessionDate(session)}</td>
                          <td className="px-4 py-3">{session.deviceInfo || 'Desconocido'}</td>
                          <td className="px-4 py-3 font-mono text-xs">{session.ipAddress || 'N/A'}</td>
                          <td className="px-4 py-3">
                            {isSuccess ? (
                              <Badge variant="success">SUCCESS</Badge>
                            ) : (
                              <Badge variant="danger">FAILED</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-surface-500 dark:text-surface-400">
                        No hay sesiones registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default StudentProfile;
