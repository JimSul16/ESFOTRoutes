import { describe, it, expect, beforeEach, vi } from 'vitest';
import httpClient from './httpClient';
import {
  getRoutes,
  getMyRoutes,
  getRouteById,
  createRoute,
  updateRoute,
  enrollRoute,
} from './route.api';
import { getResources, createResource } from './resource.api';
import { getProfile, getSessions } from './auth.api';

vi.mock('./httpClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const mockGet = vi.mocked(httpClient.get);
const mockPost = vi.mocked(httpClient.post);
const mockPut = vi.mocked(httpClient.put);

/**
 * Contrato de la capa API — regresión del BUG 8.
 *
 * `normalize.test.ts` prueba el helper; este test prueba el **call site**:
 * que la capa API aplique de verdad la normalización. Si alguien revierte
 * `route.api.ts` a `return response.data`, este test falla (y el anterior
 * seguiría en verde).
 */

/** Respuesta cruda del backend: los ids de Turso son INTEGER. */
const rutaCruda = (over = {}) => ({
  id: 5,
  title: 'Ruta adaptativa',
  authorId: 9,
  modules: [{ id: 12, title: 'Módulo 1', routeId: 5 }],
  enrollments: [{ id: 3, userId: 9, learningRouteId: 5, createdAt: '2026-10-20' }],
  ...over,
});

describe('Capa API — normalización de ids en la respuesta', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getRoutes devuelve los ids como string aunque Turso los mande como número', async () => {
    mockGet.mockResolvedValue({ data: [rutaCruda()] } as never);

    const rutas = await getRoutes();

    expect(rutas[0].id).toBe('5');
    expect(rutas[0].authorId).toBe('9');
    expect(rutas[0].modules?.[0].id).toBe('12');
    expect(rutas[0].modules?.[0].routeId).toBe('5');
  });

  it('getMyRoutes normaliza también las inscripciones', async () => {
    mockGet.mockResolvedValue({ data: [rutaCruda()] } as never);

    const rutas = await getMyRoutes();

    expect(rutas[0].enrollments?.[0].id).toBe('3');
    expect(rutas[0].enrollments?.[0].userId).toBe('9');
  });

  it('getRouteById normaliza la ruta', async () => {
    mockGet.mockResolvedValue({ data: rutaCruda() } as never);

    const ruta = await getRouteById('5');

    expect(ruta.id).toBe('5');
  });

  it('createRoute desenvuelve el sobre { message, route }', async () => {
    mockPost.mockResolvedValue({ data: { message: 'ok', route: rutaCruda() } } as never);

    const res = await createRoute({ title: 'Ruta adaptativa' });

    expect(res.message).toBe('ok');
    expect(res.route.id).toBe('5');
  });

  it('updateRoute desenvuelve el sobre { message, route }', async () => {
    mockPut.mockResolvedValue({ data: { message: 'ok', route: rutaCruda() } } as never);

    const res = await updateRoute('5', { title: 'Ruta adaptativa' });

    expect(res.route.id).toBe('5');
  });

  it('enrollRoute normaliza la inscripción que devuelve el backend', async () => {
    mockPost.mockResolvedValue({
      data: { message: 'ok', enrollment: { id: 3, userId: 9, learningRouteId: 5 } },
    } as never);

    const res = await enrollRoute('5');

    expect(res.enrollment?.id).toBe('3');
    expect(res.enrollment?.userId).toBe('9');
  });

  it('getResources normaliza los ids de cada recurso', async () => {
    mockGet.mockResolvedValue({
      data: [{ id: 7, title: 'Guía', url: 'https://x.pdf', type: 'PDF' }],
    } as never);

    const recursos = await getResources();

    expect(recursos[0].id).toBe('7');
  });

  it('createResource desenvuelve el sobre { message, resource }', async () => {
    mockPost.mockResolvedValue({
      data: { message: 'ok', resource: { id: 7, title: 'Guía', url: 'https://x.pdf', type: 'PDF' } },
    } as never);

    const res = await createResource({ title: 'Guía', url: 'https://x.pdf', type: 'PDF' });

    expect(res.message).toBe('ok');
    // Antes devolvía el sobre entero y `id` acababa siendo "undefined".
    expect(res.resource.id).toBe('7');
    expect(res.resource.title).toBe('Guía');
  });

  it('getProfile normaliza el id del usuario', async () => {
    mockGet.mockResolvedValue({ data: { id: 78, name: 'Ana', email: 'a@b.c', roles: [] } } as never);

    const user = await getProfile();

    expect(user.id).toBe('78');
  });

  it('getSessions normaliza el id de cada sesión', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 3, email: 'a@b.c', role: 'STUDENT' }] } as never);

    const sesiones = await getSessions();

    expect(sesiones[0].id).toBe('3');
  });
});
