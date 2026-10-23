import httpClient from './httpClient';
import { toId } from './normalize';
import type {
  AuthMessageResponse,
  ChangePasswordData,
  ForgotPasswordData,
  LoginCredentials,
  LoginResponse,
  LoginSuccessResponse,
  RegisterData,
  ResetPasswordData,
  SessionEntry,
  UpdateProfilePayload,
  UpdateProfileResponse,
  User,
} from '../types';

export type {
  AuthMessageResponse,
  ChangePasswordData,
  ForgotPasswordData,
  LoginCredentials,
  LoginResponse,
  LoginSuccessResponse,
  RegisterData,
  ResetPasswordData,
  UpdateProfilePayload,
  UpdateProfileResponse,
};

/**
 * `POST /auth/login` devuelve 200 con token, o 206 cuando exige un segundo paso
 * con OTP. El discriminante es la presencia de `token`: úsalo antes de navegar.
 */
export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  const response = await httpClient.post<LoginResponse>('/auth/login', credentials);
  return response.data;
};

/** Narrowing helper: `true` solo cuando el login devolvió token. */
export const isLoginSuccess = (res: LoginResponse): res is LoginSuccessResponse =>
  typeof res.token === 'string';

export const register = async (userData: RegisterData): Promise<AuthMessageResponse> => {
  const response = await httpClient.post<AuthMessageResponse>('/auth/register', userData);
  return response.data;
};

export const verifyAccount = async (token: string): Promise<AuthMessageResponse> => {
  const response = await httpClient.get<AuthMessageResponse>(`/auth/verify/${token}`);
  return response.data;
};

export const getProfile = async (): Promise<User> => {
  const response = await httpClient.get<User>('/auth/profile');
  // El backend devuelve el `id` de Turso como número; el tipo dice `string`.
  return { ...response.data, id: toId(response.data.id) ?? response.data.id };
};

/**
 * Solo son editables `name`, `profilePicture` y `learningProfile`;
 * el backend ignora cualquier otro campo por diseño.
 */
export const updateProfile = async (
  payload: UpdateProfilePayload
): Promise<UpdateProfileResponse> => {
  const response = await httpClient.put<UpdateProfileResponse>('/auth/profile', payload);
  return {
    ...response.data,
    user: { ...response.data.user, id: toId(response.data.user?.id) ?? response.data.user?.id },
  };
};

/** Vía autenticada de cambio de contraseña (requiere la actual). */
export const changePassword = async (data: ChangePasswordData): Promise<AuthMessageResponse> => {
  const response = await httpClient.put<AuthMessageResponse>('/auth/change-password', data);
  return response.data;
};

export const forgotPassword = async (data: ForgotPasswordData): Promise<AuthMessageResponse> => {
  const response = await httpClient.post<AuthMessageResponse>('/auth/forgot-password', data);
  return response.data;
};

export const resetPassword = async (
  token: string,
  data: ResetPasswordData
): Promise<AuthMessageResponse> => {
  const response = await httpClient.patch<AuthMessageResponse>(
    `/auth/reset-password/${token}`,
    data
  );
  return response.data;
};

export const getSessions = async (): Promise<SessionEntry[]> => {
  const response = await httpClient.get<SessionEntry[]>('/auth/sessions');
  // `SessionEntry.id` llega como número desde Turso.
  return response.data.map((session) => ({ ...session, id: toId(session.id) ?? session.id }));
};

// ─── Desbloqueo de cuenta ─────────────────────────────────────────────────────

/**
 * `GET /auth/unlock-account/:token` y `POST /auth/unlock-account/:token` devuelven
 * **HTML**, no JSON: son páginas renderizadas por el servidor para el enlace que
 * recibe el administrador por correo.
 *
 * La SPA no necesita consumir el GET (ese enlace abre directamente el HTML).
 * Para el POST se declara `responseType: 'text'` y se traduce el HTML a un
 * resultado discriminado, porque un token inválido responde 404.
 */
export type UnlockAccountResult =
  | { ok: true; message: string }
  | { ok: false; reason: 'invalid-token' | 'error'; message: string };

const UNLOCK_ERROR_FALLBACK =
  'No se pudo desbloquear la cuenta. El enlace puede haber caducado o haber sido usado.';

export const unlockAccount = async (token: string): Promise<UnlockAccountResult> => {
  try {
    await httpClient.post<string>(`/auth/unlock-account/${token}`, undefined, {
      responseType: 'text',
    });

    return { ok: true, message: UNLOCK_SUCCESS_MESSAGE };
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } })?.response?.status;

    if (status === 404) {
      return {
        ok: false,
        reason: 'invalid-token',
        message: 'El enlace de desbloqueo no es válido o la cuenta ya fue reactivada.',
      };
    }

    return { ok: false, reason: 'error', message: UNLOCK_ERROR_FALLBACK };
  }
};

const UNLOCK_SUCCESS_MESSAGE = '¡Cuenta desbloqueada! Ya puedes iniciar sesión.';