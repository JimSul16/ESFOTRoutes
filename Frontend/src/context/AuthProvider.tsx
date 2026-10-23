import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { AuthContext, ANONYMOUS_AUTH, type AuthContextValue, type AuthState } from './AuthContext';
import type { User } from '@/types';

/**
 * Lee la sesión guardada en `sessionStorage`.
 *
 * Se usa como inicializador *lazy* de `useState` (y no dentro de un `useEffect`)
 * a propósito: con el effect, un hard-refresh renderizaba primero el estado
 * anónimo y solo después aplicaba el token, lo que hacía que `PrivateRoute`
 * Pudiese redirigir a `/login` antes de tiempo. Hidratar en el primer render
 * elimina esa carrera y además quita el `setState` dentro de un effect.
 */
const readStoredAuth = (): AuthState => {
  // Probar primero sessionStorage (aislamiento por pestaña) o localStorage (persistencia global)
  const storages = [sessionStorage, localStorage];

  for (const storage of storages) {
    try {
      const token = storage.getItem('token');
      if (!token) continue;

      const raw = storage.getItem('user');
      if (!raw) return ANONYMOUS_AUTH;

      const user: unknown = JSON.parse(raw);
      // Validación de sesión: aceptar identificador numérico o de texto.
      // SQLite Turso genera IDs enteros (1, 2...), por lo que rechazar números
      // expulsaba al usuario en cada recarga de página (F5).
      if (!user || typeof user !== 'object') {
        return ANONYMOUS_AUTH;
      }

      const candidate = user as Record<string, unknown>;
      if (candidate.id == null || (typeof candidate.id !== 'string' && typeof candidate.id !== 'number')) {
        return ANONYMOUS_AUTH;
      }

      const normalizedUser: User = {
        ...(candidate as unknown as User),
        id: String(candidate.id),
      };

      return { token, user: normalizedUser };
    } catch (error) {
      console.error('Invalid user data in storage:', error);
      return ANONYMOUS_AUTH;
    }
  }

  return ANONYMOUS_AUTH;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [auth, setAuth] = useState<AuthState>(readStoredAuth);

  const loginAuth = useCallback((token: string, user: User) => {
    const normalizedUser: User = {
      ...user,
      id: String(user.id),
    };
    const serialized = JSON.stringify(normalizedUser);

    try {
      localStorage.setItem('token', token);
      localStorage.setItem('user', serialized);
    } catch {
      // Ignorar quota o fallos en storage restringido
    }

    try {
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('user', serialized);
    } catch {
      // Ignorar fallback
    }

    setAuth({ token, user: normalizedUser });
  }, []);

  const logoutAuth = useCallback(() => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch {
      // Ignorar
    }

    try {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
    } catch {
      // Ignorar
    }

    setAuth(ANONYMOUS_AUTH);
  }, []);

  // Memoizar el value evita que todos los consumidores del contexto se
  // re-rendericen en cada render del provider.
  const value = useMemo<AuthContextValue>(
    () => ({ auth, loginAuth, logoutAuth }),
    [auth, loginAuth, logoutAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;