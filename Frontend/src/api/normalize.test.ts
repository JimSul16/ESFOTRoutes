import { describe, it, expect } from 'vitest';
import {
  toId,
  normalizeResource,
  normalizeModule,
  normalizeRoute,
  normalizeRoutes,
} from './normalize';
import type { RawLearningRoute, RawModule, RawResource } from '../types';

/**
 * Regresión del BUG 8: en Turso los `id` son INTEGER, así que el backend los
 * devuelve como número, pero los tipos del frontend los declaran `string`.
 * El tipo mentía y el código comparaba `number` contra `string` en runtime
 * (p. ej. `enrolledRouteIds.includes(route.id)`).
 *
 * Los fixtures usan la forma REAL que llega del backend (ids numéricos).
 */

const recurso = (over = {}): RawResource => ({
  id: 7,
  title: 'Guía de redes',
  url: 'https://esfot.epn.edu.ec/recursos/redes.pdf',
  type: 'PDF',
  ...over,
});

const modulo = (over = {}): RawModule => ({
  id: 12,
  title: 'Módulo 1: Fundamentos',
  routeId: 3,
  ...over,
});

describe('toId', () => {
  it('convierte los ids numéricos de Turso a string', () => {
    expect(toId(42)).toBe('42');
    expect(toId('42')).toBe('42');
  });

  it('devuelve undefined para valores ausentes', () => {
    expect(toId(null)).toBeUndefined();
    expect(toId(undefined)).toBeUndefined();
  });
});

describe('normalizeResource', () => {
  it('normaliza el id del recurso', () => {
    expect(normalizeResource(recurso()).id).toBe('7');
  });
});

describe('normalizeModule', () => {
  it('normaliza el id del módulo y el de la ruta', () => {
    const mod = normalizeModule(modulo());
    expect(mod.id).toBe('12');
    expect(mod.routeId).toBe('3');
  });

  it('normaliza también los recursos que cuelgan del módulo', () => {
    const mod = normalizeModule(modulo({ resources: [recurso()] }));
    expect(mod.resources?.[0].id).toBe('7');
  });

  it('no inventa un routeId si el módulo no lo tiene', () => {
    const mod = normalizeModule(modulo({ routeId: undefined }));
    expect(mod.routeId).toBeUndefined();
  });
});

describe('normalizeRoute', () => {
  const ruta = (over = {}): RawLearningRoute => ({
    id: 5,
    title: 'Ruta adaptativa',
    authorId: 9,
    modules: [modulo()],
    enrollments: [{ id: 3, userId: 9, routeId: 5 }],
    ...over,
  });

  it('normaliza el id de la ruta y el del autor', () => {
    const r = normalizeRoute(ruta());
    expect(r.id).toBe('5');
    expect(r.authorId).toBe('9');
  });

  it('normaliza en cascada módulos e inscripciones', () => {
    const r = normalizeRoute(ruta());
    expect(r.modules?.[0].id).toBe('12');
    expect(r.enrollments?.[0].id).toBe('3');
    expect(r.enrollments?.[0].routeId).toBe('5');
  });

  it('normaliza un listado de rutas', () => {
    const rutas = normalizeRoutes([ruta(), ruta({ id: 6 })]);
    expect(rutas.map((r) => r.id)).toEqual(['5', '6']);
  });
});
