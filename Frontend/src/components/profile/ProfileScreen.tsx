import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react';
import { toast } from 'react-toastify';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Icon,
  Input,
  PageHeader,
  ProgressBar,
  Skeleton,
  Spinner,
  type IconName,
} from '@/components/ui';
import {
  EpnBadgeGlyph,
  EpnOwl,
  isEpnBadgeName,
  type EpnBadgeName,
} from './EpnBadges';
import {
  changePassword,
  forgotPassword,
  getSessions,
  updateProfile,
} from '@/api/auth.api';
import { uploadProfileImage } from '@/api/upload.api';
import { getApiErrorMessage } from '@/api/errors';
import { levelProgress, XP_PER_LEVEL } from '@/utils/progress';
import { type SessionEntry, type User, type UserDashboard, CAREERS, SEMESTERS } from '@/types';

export interface ProfileBadge {
  name: string;
  earned: boolean;
  icon: IconName | EpnBadgeName;
  /** Pista breve que acompaña a la insignia. */
  description?: string;
}

export interface ProfileStat {
  label: string;
  value: ReactNode;
  hint?: string;
}

export interface ProfileScreenProps {
  userData: UserDashboard;
  onPhotoUpdate: (newPhotoUrl: string) => void;
  /** Avisa al dashboard para que refresque el perfil tras editarlo. */
  onProfileUpdate?: (user: User) => void;
  /** Etiqueta pequeña sobre el título. */
  eyebrow?: string;
  /** Insignias de rol/nivel que se muestran bajo el correo. */
  headerBadges: ReactNode;
  badges: ProfileBadge[];
  /** Métricas resumidas bajo el hero (XP, nivel, racha…). */
  stats?: ProfileStat[];
  /** Muestra la barra de XP del nivel actual (perfil de estudiante). */
  showLevelProgress?: boolean;
  /** Añade los puntos de experiencia a la ficha de la cuenta. */
  showXpField?: boolean;
  /** Contenido adicional inyectado antes del historial de sesiones. */
  children?: ReactNode;
}

/** El backend guarda la fecha como texto SQLite; se normaliza a Date. */
const formatSessionDate = (session: SessionEntry): string => {
  const raw = session.createdAt ?? session.loginTime ?? session.date;
  if (!raw) return 'N/A';
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? 'N/A' : parsed.toLocaleString();
};

/** Iniciales de respaldo cuando el backend no las trae. */
const getInitials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?';

const EMPTY_PASSWORD = { currentPassword: '', newPassword: '' };

interface ProfileSectionProps {
  icon: IconName;
  title: string;
  description?: string;
  /** Acción opcional alineada a la derecha de la cabecera. */
  action?: ReactNode;
  bodyClassName?: string;
  children: ReactNode;
}

/** Sección delimitada del perfil: cabecera iconografiada + cuerpo. */
const ProfileSection = ({
  icon,
  title,
  description,
  action,
  bodyClassName,
  children,
}: ProfileSectionProps) => (
  <Card>
    <CardHeader className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
          <Icon name={icon} className="h-4.5 w-4.5" />
        </span>

        <div className="min-w-0">
          <h3 className="font-display text-base font-bold text-surface-900 dark:text-white">
            {title}
          </h3>
          {description && (
            <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">{description}</p>
          )}
        </div>
      </div>

      {action}
    </CardHeader>

    <div className={bodyClassName ?? 'px-6 py-4'}>{children}</div>
  </Card>
);

const ProfileScreen = ({
  userData,
  onPhotoUpdate,
  onProfileUpdate,
  eyebrow = 'Cuenta',
  headerBadges,
  badges,
  stats,
  showLevelProgress = false,
  showXpField = false,
  children,
}: ProfileScreenProps) => {
  const [uploading, setUploading] = useState(false);
  const [errorMsj, setErrorMsj] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Edición del perfil (PUT /auth/profile) ────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(userData.name);
  const [careerDraft, setCareerDraft] = useState(userData.career ?? '');
  const [semesterDraft, setSemesterDraft] = useState(
    userData.semester ? String(userData.semester) : '1'
  );
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Cambio de contraseña (PUT /auth/change-password) ─────────────────────
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState(EMPTY_PASSWORD);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchSessions = async () => {
      try {
        const data = await getSessions();
        if (!cancelled) setSessions(data);
      } catch (error: unknown) {
        console.error('Error fetching sessions:', getApiErrorMessage(error));
      } finally {
        if (!cancelled) setLoadingSessions(false);
      }
    };

    fetchSessions();

    return () => {
      cancelled = true;
    };
  }, []);

  const startEdit = () => {
    setNameDraft(userData.name);
    setCareerDraft(userData.career ?? '');
    setSemesterDraft(userData.semester ? String(userData.semester) : '1');
    setEditing(true);
  };

  const cancelEdit = () => {
    setNameDraft(userData.name);
    setCareerDraft(userData.career ?? '');
    setSemesterDraft(userData.semester ? String(userData.semester) : '1');
    setEditing(false);
  };

  const handleSaveProfile = async (event: FormEvent) => {
    event.preventDefault();

    const name = nameDraft.trim();
    if (name.length < 3) {
      toast.error('El nombre debe tener al menos 3 caracteres.');
      return;
    }

    const career = careerDraft.trim();
    if (!career || career.length < 3) {
      toast.error('Debes seleccionar o ingresar una carrera válida.');
      return;
    }

    const semesterNum = Number(semesterDraft);
    if (!Number.isInteger(semesterNum) || semesterNum < 1 || semesterNum > 5) {
      toast.error('El semestre debe ser un número entero entre 1 y 5.');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await updateProfile({
        name,
        career,
        semester: semesterNum,
      });
      onProfileUpdate?.(res.user);
      toast.success(res.message || 'Perfil actualizado correctamente.');
      setEditing(false);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'No se pudo actualizar el perfil.'));
    } finally {
      setSavingProfile(false);
    }
  };

  const setPasswordField = (field: keyof typeof EMPTY_PASSWORD, value: string) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  };

  const cancelPassword = () => {
    setPasswordForm(EMPTY_PASSWORD);
    setChangingPassword(false);
  };

  const handleChangePassword = async (event: FormEvent) => {
    event.preventDefault();

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

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
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

  const level = userData.level || 1;
  const { xpInLevel, percent: progressPercent } = levelProgress(userData.xp, level);
  const initials = userData.initials || getInitials(userData.name);
  const hasStats = Boolean(stats && stats.length > 0);

  return (
    <div className="animate-in fade-in mx-auto w-full max-w-6xl space-y-6 pb-10 duration-300">
      <PageHeader
        eyebrow={eyebrow}
        title="Mi Perfil"
        description="Gestiona tu identidad y credenciales dentro de la plataforma."
        actions={
          <Badge variant="brand">
            {userData.primaryRole === 'ADMIN' ? 'Administrador' : 'Estudiante'}
          </Badge>
        }
      />

      {errorMsj && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-card border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
        >
          <Icon name="circleAlert" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMsj}</span>
        </div>
      )}

      {/* Hero: identidad y progreso */}
      <Card className="overflow-hidden">
        <div className="relative overflow-hidden bg-white dark:bg-surface-900">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-center sm:text-left">
              <div className="relative shrink-0">
                <div className="h-24 w-24 overflow-hidden rounded-3xl border-4 border-white shadow-card dark:border-surface-800 sm:h-28 sm:w-28">
                  {userData.profilePicture ? (
                    <img
                      src={userData.profilePicture}
                      alt={`Foto de perfil de ${userData.name}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-brand-600 to-brand-800">
                      <span className="font-display text-3xl font-extrabold text-white">
                        {initials}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={triggerFileInput}
                  disabled={uploading}
                  aria-label="Cambiar foto de perfil"
                  className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-brand-600 text-white shadow-md transition-colors hover:bg-brand-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus/50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-surface-900"
                >
                  {uploading ? (
                    <Spinner size="sm" label="Subiendo foto" />
                  ) : (
                    <Icon name="upload" className="h-4 w-4" />
                  )}
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/png, image/jpeg"
                  onChange={handleFileChange}
                  aria-label="Seleccionar foto de perfil"
                />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="truncate font-display text-xl font-extrabold tracking-tight text-surface-900 dark:text-white sm:text-2xl">
                  {userData.name}
                </h2>
                <p className="mt-0.5 truncate text-sm text-surface-500 dark:text-surface-400">
                  {userData.email}
                </p>

                <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                  {headerBadges}
                </div>

                {showLevelProgress && (
                  <div className="mt-5 max-w-md">
                    <ProgressBar
                      value={progressPercent}
                      label={`Progreso al nivel ${level + 1}`}
                      tone="brand"
                      size="sm"
                    />
                    <p className="mt-1.5 text-xs font-medium tabular-nums text-surface-500 dark:text-surface-400">
                      <span className="font-semibold text-surface-700 dark:text-surface-200">
                        {xpInLevel} / {XP_PER_LEVEL} pts
                      </span>{' '}
                      de progreso en el nivel actual
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {hasStats && (
          <dl
            className={
              (stats?.length ?? 0) > 2
                ? 'grid grid-cols-2 divide-x divide-surface-100 border-t border-surface-100 dark:divide-surface-800 dark:border-surface-800 sm:grid-cols-4'
                : 'grid grid-cols-2 divide-x divide-surface-100 border-t border-surface-100 dark:divide-surface-800 dark:border-surface-800'
            }
          >
            {stats?.map((stat) => (
              <div key={stat.label} className="px-4 py-4 sm:px-6">
                <dt className="text-2xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
                  {stat.label}
                </dt>
                <dd className="mt-1 text-lg font-bold tabular-nums text-surface-900 dark:text-surface-50">
                  {stat.value}
                </dd>
                {stat.hint && (
                  <p className="mt-0.5 text-2xs text-surface-500 dark:text-surface-400">
                    {stat.hint}
                  </p>
                )}
              </div>
            ))}
          </dl>
        )}
      </Card>

      {/* Rejilla principal: contenido + aside */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="order-2 space-y-6 lg:order-1">
          {/* Información de la cuenta */}
          <ProfileSection
            icon="user"
            title="Información de la cuenta"
            description="Datos institucionales asociados a tu sesión."
            action={
              !editing && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={startEdit}
                  iconLeft={<Icon name="pencil" className="h-3.5 w-3.5" />}
                >
                  Editar perfil
                </Button>
              )
            }
          >
            {editing ? (
              <form
                onSubmit={handleSaveProfile}
                className="grid grid-cols-1 items-start gap-4 md:grid-cols-2"
              >
                <div className="md:col-span-2">
                  <Input
                    id="profile-name"
                    label="Nombre completo"
                    value={nameDraft}
                    onChange={(event) => setNameDraft(event.target.value)}
                    minLength={3}
                    required
                    hint="El correo no se puede cambiar: es tu identidad institucional."
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="profile-career"
                    className="block text-xs font-semibold uppercase tracking-wider text-surface-700 dark:text-surface-300"
                  >
                    Carrera
                  </label>
                  <select
                    id="profile-career"
                    value={careerDraft}
                    onChange={(e) => setCareerDraft(e.target.value)}
                    required
                    className="w-full bg-surface-50 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700 rounded-xl px-3.5 py-2.5 text-surface-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  >
                    <option value="" disabled>Selecciona carrera</option>
                    {(CAREERS as readonly string[]).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                    {/* Si la carrera guardada no está en la lista oficial, se
                        muestra igual: si no, el <select required> queda vacío y
                        el navegador bloquea el guardado del perfil. */}
                    {careerDraft && !(CAREERS as readonly string[]).includes(careerDraft) && (
                      <option key={careerDraft} value={careerDraft}>{careerDraft}</option>
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="profile-semester"
                    className="block text-xs font-semibold uppercase tracking-wider text-surface-700 dark:text-surface-300"
                  >
                    Semestre
                  </label>
                  <select
                    id="profile-semester"
                    value={semesterDraft}
                    onChange={(e) => setSemesterDraft(e.target.value)}
                    required
                    className="w-full bg-surface-50 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700 rounded-xl px-3.5 py-2.5 text-surface-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  >
                    {SEMESTERS.map((s) => (
                      <option key={s} value={s}>{s}° Semestre</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end gap-2.5 md:col-span-2">
                  <Button type="submit" isLoading={savingProfile}>
                    {savingProfile ? 'Guardando...' : 'Guardar cambios'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={cancelEdit}>
                    Cancelar
                  </Button>
                </div>
              </form>
            ) : (
              <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
                    Nombre completo
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-surface-900 dark:text-surface-100">
                    {userData.name}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
                    Correo electrónico
                  </dt>
                  <dd className="mt-1 truncate text-sm font-medium text-surface-900 dark:text-surface-100">
                    {userData.email}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
                    Carrera
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-surface-900 dark:text-surface-100">
                    {userData.career || 'No especificada'}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
                    Semestre
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-surface-900 dark:text-surface-100">
                    {userData.semester ? `${userData.semester}° Semestre` : 'No especificado'}
                  </dd>
                </div>

                {userData.uniqueId && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
                      ID Único EPN
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-surface-900 dark:text-surface-100">
                      {userData.uniqueId}
                    </dd>
                  </div>
                )}

                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
                    Rol en el sistema
                  </dt>
                  <dd className="mt-1">
                    <Badge variant="brand" size="sm">
                      {userData.primaryRole}
                    </Badge>
                  </dd>
                </div>

                {showXpField && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
                      Puntos de progreso
                    </dt>
                    <dd className="mt-1 text-sm font-medium tabular-nums text-surface-900 dark:text-surface-100">
                      {userData.xp || 0} pts
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </ProfileSection>

          {/* Seguridad */}
          <ProfileSection
            icon="keyRound"
            title="Seguridad"
            description="Actualiza tu contraseña o solicita un enlace de recuperación."
          >
            {changingPassword ? (
              <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
                <Input
                  id="current-password"
                  type="password"
                  label="Contraseña actual"
                  value={passwordForm.currentPassword}
                  onChange={(event) => setPasswordField('currentPassword', event.target.value)}
                  required
                />

                <Input
                  id="new-password"
                  type="password"
                  label="Nueva contraseña"
                  value={passwordForm.newPassword}
                  onChange={(event) => setPasswordField('newPassword', event.target.value)}
                  minLength={8}
                  required
                  hint="Mínimo 8 caracteres."
                />

                <div className="flex gap-2.5">
                  <Button type="submit" isLoading={savingPassword}>
                    {savingPassword ? 'Actualizando...' : 'Actualizar contraseña'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={cancelPassword}>
                    Cancelar
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setChangingPassword(true)}
                  iconLeft={<Icon name="keyRound" className="h-4 w-4" />}
                >
                  Cambiar contraseña
                </Button>

                <p className="text-sm text-surface-500 dark:text-surface-400">
                  ¿No recuerdas la actual?{' '}
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="font-medium text-brand-600 hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus/50 dark:text-brand-400 cursor-pointer"
                  >
                    Recupérala por correo
                  </button>
                </p>
              </div>
            )}
          </ProfileSection>

          {children}

          {/* Historial de sesiones */}
          <ProfileSection
            icon="shield"
            title="Historial de sesiones"
            description="Últimos accesos registrados en tu cuenta."
            bodyClassName="p-0"
            action={
              !loadingSessions &&
              sessions.length > 0 && (
                <Badge variant="default" size="sm">
                  {sessions.length} {sessions.length === 1 ? 'sesión' : 'sesiones'}
                </Badge>
              )
            }
          >
            {loadingSessions ? (
              <div aria-busy="true" className="space-y-3 p-6">
                <span className="sr-only">Cargando historial de sesiones…</span>
                {[0, 1, 2].map((index) => (
                  <div key={index} className="flex items-center gap-4">
                    <Skeleton className="w-1/4" />
                    <Skeleton className="w-1/3" />
                    <Skeleton className="ml-auto h-6 w-20" />
                  </div>
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <EmptyState
                icon="shield"
                title="No hay sesiones registradas."
                description="Cuando inicies sesión en otro dispositivo aparecerá aquí."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[40rem] border-collapse text-left">
                  <thead>
                    <tr className="bg-surface-50 text-2xs uppercase tracking-wider text-surface-500 dark:bg-surface-850 dark:text-surface-400">
                      <th scope="col" className="px-6 py-3 font-semibold">
                        Fecha
                      </th>
                      <th scope="col" className="px-6 py-3 font-semibold">
                        Dispositivo
                      </th>
                      <th scope="col" className="px-6 py-3 font-semibold">
                        IP
                      </th>
                      <th scope="col" className="px-6 py-3 font-semibold">
                        Estado
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                    {sessions.map((session, index) => {
                      const isSuccess =
                        session.status === 'SUCCESS' ||
                        session.status === 'Éxito' ||
                        session.success ||
                        session.status === 'success' ||
                        !session.status;

                      return (
                        <tr
                          key={session.id ?? index}
                          className="transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/40"
                        >
                          <td className="whitespace-nowrap px-6 py-3.5 text-sm text-surface-600 dark:text-surface-300">
                            {formatSessionDate(session)}
                          </td>
                          <td className="px-6 py-3.5 text-sm text-surface-600 dark:text-surface-300">
                            {session.deviceInfo || 'Desconocido'}
                          </td>
                          <td className="px-6 py-3.5 font-mono text-xs text-surface-500 dark:text-surface-400">
                            {session.ipAddress || 'N/A'}
                          </td>
                          <td className="px-6 py-3.5">
                            <Badge variant={isSuccess ? 'default' : 'brand'} size="sm" dot>
                              {isSuccess ? 'SUCCESS' : 'FAILED'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </ProfileSection>
        </div>

        {/* Aside: insignias e identidad institucional */}
        <aside className="order-1 space-y-6 lg:order-2 lg:sticky lg:top-6">
          <ProfileSection
            icon="award"
            title="Insignias"
            description="Logros desbloqueados según tu actividad en la plataforma."
          >
            <ul className="grid grid-cols-2 gap-3">
              {badges.map((badge) => (
                <li
                  key={badge.name}
                  className={
                    badge.earned
                      ? 'flex flex-col items-center rounded-card border border-brand-200/70 bg-gradient-to-b from-brand-50 to-white p-3 text-center shadow-2xs dark:border-brand-500/20 dark:from-brand-500/10 dark:to-surface-900'
                      : 'flex flex-col items-center rounded-card border border-surface-200/70 bg-surface-50/60 p-3 text-center opacity-70 dark:border-surface-800 dark:bg-surface-900/40'
                  }
                >
                  <span
                    className={
                      badge.earned
                        ? 'flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md ring-2 ring-brand-200/70 ring-offset-2 ring-offset-white dark:ring-brand-500/30 dark:ring-offset-surface-900'
                        : 'flex h-12 w-12 items-center justify-center rounded-full bg-surface-100 text-surface-400 dark:bg-surface-800 dark:text-surface-500'
                    }
                  >
                    {isEpnBadgeName(badge.icon) ? (
                      <EpnBadgeGlyph name={badge.icon} className="h-6 w-6" />
                    ) : (
                      <Icon name={badge.icon} className="h-6 w-6" />
                    )}
                  </span>

                  <span
                    className={
                      badge.earned
                        ? 'mt-2 block text-xs font-semibold text-surface-900 dark:text-surface-100'
                        : 'mt-2 block text-xs font-semibold text-surface-500 dark:text-surface-400'
                    }
                  >
                    {badge.name}
                  </span>

                  {badge.description && (
                    <span className="mt-0.5 block text-2xs leading-snug text-surface-400 dark:text-surface-500">
                      {badge.description}
                    </span>
                  )}

                  <span className="sr-only">
                    {badge.earned ? 'Insignia obtenida' : 'Insignia pendiente'}
                  </span>
                </li>
              ))}
            </ul>
          </ProfileSection>

          <ProfileSection
            icon="graduationCap"
            title="Identidad EPN"
            description="Credencial institucional vinculada a tu cuenta."
          >
            <div className="flex items-center gap-3 rounded-control bg-brand-50/70 p-3 dark:bg-brand-500/10">
              <EpnOwl className="h-12 w-12 shrink-0 text-brand-600 dark:text-brand-300" />
              <div className="min-w-0">
                <p className="font-display text-sm font-bold text-surface-900 dark:text-white">
                  Escuela Politécnica Nacional
                </p>
                <p className="mt-0.5 text-2xs text-surface-500 dark:text-surface-400">
                  ESFOT · Escuela de Formación de Tecnólogos
                </p>
              </div>
            </div>

            <dl className="mt-4 space-y-3">
              <div>
                <dt className="text-2xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
                  Rol en el sistema
                </dt>
                <dd className="mt-1">
                  <Badge variant="brand" size="sm">
                    {userData.primaryRole}
                  </Badge>
                </dd>
              </div>

              <div>
                <dt className="text-2xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
                  Correo institucional
                </dt>
                <dd className="mt-1 truncate text-sm font-medium text-surface-900 dark:text-surface-100">
                  {userData.email}
                </dd>
              </div>
            </dl>
          </ProfileSection>
        </aside>
      </div>
    </div>
  );
};

export default ProfileScreen;
