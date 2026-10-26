import { createContext } from 'react';
import type { User } from '@/types';

/**
 * Sesión activa. El token y el usuario viven en `sessionStorage`,
 * que es también lo que lee el interceptor de `httpClient`.
 */
export interface AuthState {
  token: string | null;
  user: User | null;
}

export interface AuthContextValue {
  auth: AuthState;
  /** Persiste la sesión en `sessionStorage` y la actualiza en memoria. */
  loginAuth: (token: string, user: User) => void;
  /** Limpia `sessionStorage` y vuelve al estado anónimo. */
  logoutAuth: () => void;
}

/**
 * `undefined` como valor por defecto permite que `useAuth()` detecte el uso
 * fuera del provider. No se usa un objeto vacío porque `AuthState` exige
 * `token` y `user` explícitos.
 */
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const ANONYMOUS_AUTH: AuthState = { token: null, user: null };