import httpClient from './httpClient';
import { normalizeEnrollment, normalizeRoute, normalizeRoutes } from './normalize';
import type {
  CompleteModulePayload,
  CompleteModuleResponse,
  EnrollResponse,
  LearningRoute,
  RawLearningRoute,
  RoutePayload,
} from '../types';

/**
 * Respuesta de los endpoints que persisten una ruta: el backend devuelve
 * `{ message, route }`, no la ruta suelta.
 */
export interface RouteMutationResponse {
  message: string;
  route: LearningRoute;
}

export const getRoutes = async (): Promise<LearningRoute[]> => {
  const response = await httpClient.get<RawLearningRoute[]>('/routes');
  return normalizeRoutes(response.data);
};

export const createRoute = async (routeData: RoutePayload): Promise<RouteMutationResponse> => {
  const response = await httpClient.post<{ message: string; route: RawLearningRoute }>(
    '/routes',
    routeData
  );
  return { ...response.data, route: normalizeRoute(response.data.route) };
};

export const deleteRoute = async (id: string): Promise<void> => {
  await httpClient.delete(`/routes/${id}`);
};

export const getRouteById = async (id: string): Promise<LearningRoute> => {
  const response = await httpClient.get<RawLearningRoute>(`/routes/${id}`);
  return normalizeRoute(response.data);
};

export const updateRoute = async (
  id: string,
  routeData: RoutePayload
): Promise<RouteMutationResponse> => {
  const response = await httpClient.put<{ message: string; route: RawLearningRoute }>(
    `/routes/${id}`,
    routeData
  );
  return { ...response.data, route: normalizeRoute(response.data.route) };
};

export const getMyRoutes = async (): Promise<LearningRoute[]> => {
  const response = await httpClient.get<RawLearningRoute[]>('/routes/my-routes');
  return normalizeRoutes(response.data);
};

export const enrollRoute = async (routeId: string): Promise<EnrollResponse> => {
  const response = await httpClient.post<EnrollResponse>(`/routes/${routeId}/enroll`);
  // `enrollment` es la fila cruda de Turso: sus ids llegan como número.
  return {
    ...response.data,
    enrollment: response.data.enrollment
      ? normalizeEnrollment(response.data.enrollment)
      : response.data.enrollment,
  };
};

export const completeModule = async (
  data: CompleteModulePayload
): Promise<CompleteModuleResponse> => {
  const response = await httpClient.post<CompleteModuleResponse>('/routes/complete-module', data);
  return response.data;
};
