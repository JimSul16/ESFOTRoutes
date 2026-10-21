import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthProvider';
import PrivateRoute from './PrivateRoute';

const estudiante = { id: '7', name: 'Ana', email: 'ana@epn.edu.ec', roles: ['STUDENT'] };
const admin = { id: '1', name: 'Admin', email: 'admin@epn.edu.ec', roles: ['ADMIN'] };

const montar = (allowedRoles?: readonly string[]) =>
  render(
    <MemoryRouter initialEntries={['/protegida']}>
      <AuthProvider>
        <Routes>
          <Route path="/protegida" element={<PrivateRoute allowedRoles={allowedRoles} />}>
            <Route index element={<div>contenido protegido</div>} />
          </Route>
          <Route path="/login" element={<div>formulario de login</div>} />
          <Route path="/dashboard" element={<div>panel estudiante</div>} />
          <Route path="/admin" element={<div>panel admin</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );

const sinSesion = () => {
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
};

const conSesion = (user: typeof estudiante | typeof admin) => {
  sessionStorage.setItem('token', 'tok-123');
  sessionStorage.setItem('user', JSON.stringify(user));
};

describe('PrivateRoute', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe('bloqueo de acceso', () => {
    it('envía a /login si no hay token', () => {
      sinSesion();
      montar(['STUDENT']);
      expect(screen.getByText('formulario de login')).toBeTruthy();
    });

    it('envía a /login si hay token pero no usuario', () => {
      sessionStorage.setItem('token', 'tok-123');
      montar(['STUDENT']);
      expect(screen.getByText('formulario de login')).toBeTruthy();
    });

    it('envía a /login si el usuario no tiene roles', () => {
      sessionStorage.setItem('token', 'tok-123');
      sessionStorage.setItem('user', JSON.stringify({ id: '9', name: 'X', roles: [] }));
      montar(['STUDENT']);
      expect(screen.getByText('formulario de login')).toBeTruthy();
    });

    it('ignora un usuario corrupto en sessionStorage', () => {
      sessionStorage.setItem('token', 'tok-123');
      sessionStorage.setItem('user', '{no-es-json');
      montar(['STUDENT']);
      expect(screen.getByText('formulario de login')).toBeTruthy();
    });
  });

  describe('control de acceso por rol', () => {
    it('deja pasar a un estudiante en una ruta de STUDENT', () => {
      conSesion(estudiante);
      montar(['STUDENT']);
      expect(screen.getByText('contenido protegido')).toBeTruthy();
    });

    it('impide que un estudiante entre en una ruta de ADMIN y lo manda a su panel', () => {
      conSesion(estudiante);
      montar(['ADMIN']);
      expect(screen.getByText('panel estudiante')).toBeTruthy();
      expect(screen.queryByText('contenido protegido')).toBeNull();
    });

    it('manda a /admin a un admin que intenta entrar a una ruta de STUDENT', () => {
      conSesion(admin);
      montar(['STUDENT']);
      expect(screen.getByText('panel admin')).toBeTruthy();
    });

    it('deja pasar si el usuario tiene alguno de los roles permitidos', () => {
      conSesion(admin);
      montar(['STUDENT', 'ADMIN']);
      expect(screen.getByText('contenido protegido')).toBeTruthy();
    });

    it('deja pasar a cualquier usuario con sesión si no se restringen roles', () => {
      conSesion(estudiante);
      montar();
      expect(screen.getByText('contenido protegido')).toBeTruthy();
    });
  });
});