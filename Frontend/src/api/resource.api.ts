import httpClient from './httpClient';
import { normalizeResource } from './normalize';
import type { RawResource, Resource } from '../types';

/**
 * Respuesta de los endpoints que persisten un recurso: el backend devuelve
 * `{ message, resource }`, no el recurso suelto.
 *
 * Antes la capa API devolvía `response.data` directamente, así que el
 * "recurso" que recibía el frontend era en realidad el sobre `{ message, ... }`
 * y `normalizeResource` fabricaba un `id: "undefined"`.
 */
export interface ResourceMutationResponse {
  message: string;
  resource: Resource;
}

export const getResources = async (): Promise<Resource[]> => {
  const response = await httpClient.get<RawResource[]>('/resources');
  return response.data.map(normalizeResource);
};

export const createResource = async (
  resourceData: Partial<Resource>
): Promise<ResourceMutationResponse> => {
  const response = await httpClient.post<{ message: string; resource: RawResource }>(
    '/resources',
    resourceData
  );
  return { ...response.data, resource: normalizeResource(response.data.resource) };
};

export const updateResource = async (
  id: string,
  resourceData: Partial<Resource>
): Promise<ResourceMutationResponse> => {
  const response = await httpClient.put<{ message: string; resource: RawResource }>(
    `/resources/${id}`,
    resourceData
  );
  return { ...response.data, resource: normalizeResource(response.data.resource) };
};

export const deleteResource = async (id: string): Promise<void> => {
  await httpClient.delete(`/resources/${id}`);
};
