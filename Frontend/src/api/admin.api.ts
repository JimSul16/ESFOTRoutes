import httpClient from './httpClient';
import type { User } from '../types';

/**
 * Roles que el backend reconoce realmente (ver `checkRoles` en `src/routes`).
 * `RoleManager` muestra además una tarjeta MODERATOR, pero ningún endpoint la
 * usa, así que no forma parte de este tipo.
 */
export type AdminRoleName = 'STUDENT' | 'ADMIN' | 'TEACHER';

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  roleName: AdminRoleName;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  password?: string;
  roleName?: AdminRoleName;
}

/** `POST|PUT /admin/users[/:id]` → `{ message, user }` */
export interface AdminUserMutationResponse {
  message: string;
  user?: Partial<User>;
}

/** `PATCH /admin/users/:id/status` y `POST /admin/unlock/:id` → `{ message }` */
export interface AdminActionResponse {
  message: string;
}

/**
 * `GET /admin/users` devuelve los ids como números (SQLite INTEGER PK).
 * Se normalizan a `string` en la frontera para que `User.id` sea cierto y el
 * resto de la app no tenga que hacer conversiones.
 */
export const getUsers = async (): Promise<User[]> => {
  const response = await httpClient.get<User[]>('/admin/users');
  return response.data.map((user) => ({ ...user, id: String(user.id) }));
};

export const createUser = async (userData: CreateUserPayload): Promise<AdminUserMutationResponse> => {
  const response = await httpClient.post<AdminUserMutationResponse>('/admin/users', userData);
  return response.data;
};

export const updateUser = async (
  id: string,
  userData: UpdateUserPayload
): Promise<AdminUserMutationResponse> => {
  const response = await httpClient.put<AdminUserMutationResponse>(`/admin/users/${id}`, userData);
  return response.data;
};

export const toggleUserStatus = async (id: string): Promise<AdminActionResponse> => {
  const response = await httpClient.patch<AdminActionResponse>(`/admin/users/${id}/status`);
  return response.data;
};

export const unlockUser = async (id: string): Promise<AdminActionResponse> => {
  const response = await httpClient.post<AdminActionResponse>(`/admin/unlock/${id}`);
  return response.data;
};