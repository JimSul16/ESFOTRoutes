import httpClient from './httpClient';
import type {
  CompleteModulePayload,
  CompleteModuleResponse,
  EnrollResponse,
  LearningRoute,
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
  const response = await httpClient.get<LearningRoute[]>('/routes');
  return response.data;
};

export const createRoute = async (routeData: RoutePayload): Promise<RouteMutationResponse> => {
  const response = await httpClient.post<RouteMutationResponse>('/routes', routeData);
  return response.data;
};

export const deleteRoute = async (id: string): Promise<void> => {
  await httpClient.delete(`/routes/${id}`);
};

export const getRouteById = async (id: string): Promise<LearningRoute> => {
  const response = await httpClient.get<LearningRoute>(`/routes/${id}`);
  return response.data;
};

export const updateRoute = async (
  id: string,
  routeData: RoutePayload
): Promise<RouteMutationResponse> => {
  const response = await httpClient.put<RouteMutationResponse>(`/routes/${id}`, routeData);
  return response.data;
};

export const getMyRoutes = async (): Promise<LearningRoute[]> => {
  const response = await httpClient.get<LearningRoute[]>('/routes/my-routes');
  return response.data;
};

export const enrollRoute = async (routeId: string): Promise<EnrollResponse> => {
  const response = await httpClient.post<EnrollResponse>(`/routes/${routeId}/enroll`);
  return response.data;
};

export const completeModule = async (
  data: CompleteModulePayload
): Promise<CompleteModuleResponse> => {
  const response = await httpClient.post<CompleteModuleResponse>('/routes/complete-module', data);
  return response.data;
};

/**
 * El endpoint espera multipart con el campo `file` (multer en route.routes.js),
 * no `coverImage`: quien llama debe armar el FormData accordingly.
 */
export const generateRoute = async (formData: FormData): Promise<RouteMutationResponse> => {
  const response = await httpClient.post<RouteMutationResponse>('/routes/generate', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};