import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider } from './AuthProvider';
import { useAuth } from '@/hooks/useAuth';

/**
 * Consume el contexto y expone el estado como texto para poder afirmar sobre él.
 */
const AuthProbe = () => {
  const { auth, loginAuth, logoutAuth } = useAuth();

  const user = { id: '1', name: 'Ana', email: 'ana@epn.edu.ec', roles: ['STUDENT'] };

  return (
    <div>
      <span data-testid="token">{auth.token ?? 'sin-token'}</span>
      <span data-testid="user">{auth.user ? auth.user.name : 'sin-usuario'}</span>
      <button onClick={() => loginAuth('tok-123', user)}>login</button>
      <button onClick={logoutAuth}>logout</button>
    </div>
  );
};

const renderProbe = () =>
  render(
    <AuthProvider>
      <AuthProbe />
    </AuthProvider>
  );

const token = () => screen.getByTestId('token').textContent;
const userName = () => screen.getByTestId('user').textContent;

describe('AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('arranca anónimo si no hay sesión guardada', () => {
    renderProbe();
    expect(token()).toBe('sin-token');
    expect(userName()).toBe('sin-usuario');
  });

  // Regresión: con la hidratación dentro de un useEffect, el primer render
  // veía el estado anónimo y PrivateRoute podía redirigir a /login.
  it('hidrata el token en el PRIMER render, sin esperar a un efecto', () => {
    sessionStorage.setItem('token', 'tok-abc');
    sessionStorage.setItem('user', JSON.stringify({ id: '7', name: 'Luis', roles: ['ADMIN'] }));

    renderProbe();

    expect(token()).toBe('tok-abc');
    expect(userName()).toBe('Luis');
  });

  it('acepta IDs numéricos devueltos por Turso SQLite y los normaliza', () => {
    localStorage.setItem('token', 'tok-sqlite');
    localStorage.setItem('user', JSON.stringify({ id: 1, name: 'David', roles: ['STUDENT'] }));

    renderProbe();

    expect(token()).toBe('tok-sqlite');
    expect(userName()).toBe('David');
  });

  it('ignora un token sin usuario asociado', () => {
    sessionStorage.setItem('token', 'tok-abc');
    renderProbe();
    expect(token()).toBe('sin-token');
  });

  it('cae al estado anónimo si el JSON del usuario está corrupto', () => {
    sessionStorage.setItem('token', 'tok-abc');
    sessionStorage.setItem('user', '{no-es-json');

    renderProbe();

    expect(token()).toBe('sin-token');
    expect(userName()).toBe('sin-usuario');
  });

  it('rechaza un usuario sin id', () => {
    sessionStorage.setItem('token', 'tok-abc');
    sessionStorage.setItem('user', JSON.stringify({ name: 'Sin id' }));

    renderProbe();

    expect(token()).toBe('sin-token');
  });

  it('loginAuth persiste en sessionStorage y actualiza el estado', () => {
    renderProbe();

    act(() => {
      screen.getByText('login').click();
    });

    expect(token()).toBe('tok-123');
    expect(userName()).toBe('Ana');
    expect(sessionStorage.getItem('token')).toBe('tok-123');
    expect(JSON.parse(sessionStorage.getItem('user')!)).toMatchObject({ email: 'ana@epn.edu.ec' });
  });

  it('logoutAuth limpia sessionStorage y vuelve al estado anónimo', () => {
    sessionStorage.setItem('token', 'tok-abc');
    sessionStorage.setItem('user', JSON.stringify({ id: '7', name: 'Luis', roles: ['ADMIN'] }));
    renderProbe();

    act(() => {
      screen.getByText('logout').click();
    });

    expect(token()).toBe('sin-token');
    expect(userName()).toBe('sin-usuario');
    expect(sessionStorage.getItem('token')).toBeNull();
    expect(sessionStorage.getItem('user')).toBeNull();
  });
});

describe('useAuth', () => {
  it('lanza un error descriptivo si se usa fuera de <AuthProvider>', () => {
    const Orphan = () => {
      useAuth();
      return null;
    };

    // React silencia el error en consola durante el render; lo verificamos
    // capturándolo con el spy que ya silencia console.error.
    expect(() => render(<Orphan />)).toThrow(
      'useAuth() debe usarse dentro de <AuthProvider>.'
    );
  });
});