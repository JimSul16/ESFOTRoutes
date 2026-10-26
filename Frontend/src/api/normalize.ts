import type {
  Enrollment,
  LearningRoute,
  Module,
  RawEnrollment,
  RawLearningRoute,
  RawModule,
  RawResource,
  Resource,
} from '../types';

/**
 * Normalización de ids en la capa API.
 *
 * En Turso (SQLite) los `id` son `INTEGER PRIMARY KEY`, así que el backend
 * los devuelve como **número**, mientras que los tipos del frontend los
 * declaran `string`. El tipo mentía y el código comparaba `number` contra
 * `string` en runtime (p. ej. `enrolledRouteIds.includes(route.id)`).
 *
 * El proyecto ya normalizaba de esta forma en `AuthProvider` y `admin.api.ts`;
 * aquí se extiende al resto de la capa API para que el tipo sea cierto y
 * los ids sean comparables entre sí.
 */

/** Convierte un id numérico de Turso a string. */
export const toId = (value: number | string | null | undefined): string | undefined => {
  if (value === null || value === undefined) return undefined;
  return String(value);
};

export const normalizeResource = (resource: RawResource): Resource => ({
  ...resource,
  id: toId(resource.id) ?? String(resource.id),
});

export const normalizeModule = (module: RawModule): Module => ({
  ...module,
  id: toId(module.id) ?? String(module.id),
  routeId: toId(module.routeId),
  resources: module.resources?.map(normalizeResource),
});

export const normalizeEnrollment = (enrollment: RawEnrollment): Enrollment => ({
  ...enrollment,
  id: toId(enrollment.id) ?? String(enrollment.id),
  userId: toId(enrollment.userId),
  routeId: toId(enrollment.routeId),
});

export const normalizeRoute = (route: RawLearningRoute): LearningRoute => ({
  ...route,
  id: toId(route.id) ?? String(route.id),
  authorId: toId(route.authorId),
  modules: route.modules?.map(normalizeModule),
  enrollments: route.enrollments?.map(normalizeEnrollment),
});

export const normalizeRoutes = (routes: RawLearningRoute[]): LearningRoute[] =>
  routes.map(normalizeRoute);
