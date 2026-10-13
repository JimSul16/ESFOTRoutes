import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from '@/context/AuthContext';

/**
 * Acceso tipado a la sesión. Lanza si se usa fuera de `<AuthProvider>`
 * en lugar de devolver `undefined` en silencio.
 *
 * Sustituye a `useContext(AuthContext)`, que devolvía `any` y obligaba a
 * usar optional chaining en cada acceso (`auth?.token`, `auth?.user?.roles`).
 */
export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);

  if (ctx === undefined) {
    throw new Error('useAuth() debe usarse dentro de <AuthProvider>.');
  }

  return ctx;
};

export default useAuth;