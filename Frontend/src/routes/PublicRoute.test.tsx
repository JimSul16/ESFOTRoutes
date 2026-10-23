import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthProvider';
import PublicRoute from './PublicRoute';

const Usuario = {
  id: '7',
  name: 'Ana',
  email: 'ana@epn.edu.ec',
  roles: ['STUDENT'],
};

const montar = (inicial = '/login') =>
  render(
    <MemoryRouter initialEntries={[inicial]}>
      <AuthProvider>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<div>formulario de login</div>} />
            <Route path="/register" element={<div>formulario de registro</div>} />
          </Route>
          <Route path="/dashboard" element={<div>panel estudiante</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );

const cerrarSesion = () => {
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
};

const iniciarSesion = (user = Usuario) => {
  sessionStorage.setItem('token', 'tok-123');
  sessionStorage.setItem('user', JSON.stringify(user));
};

describe('PublicRoute', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('deja pasar a quien no tiene sesión', () => {
    cerrarSesion();
    montar();
    expect(screen.getByText('formulario de login')).toBeTruthy();
  });

  // Regresión de la hidratación: con el token aplicado dentro de un useEffect,
  // el primer render veía el estado anónimo y expulsaba al usuario ya logueado.
  it('expulsa a quien ya tiene sesión al intentar entrar a /login', () => {
    iniciarSesion();
    montar();
    expect(screen.getByText('panel estudiante')).toBeTruthy();
  });

  it('expulsa también desde otras rutas públicas', () => {
    iniciarSesion();
    montar('/register');
    expect(screen.getByText('panel estudiante')).toBeTruthy();
  });
});