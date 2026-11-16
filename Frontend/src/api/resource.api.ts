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

// ─── Catálogo de Recursos para Estudiantes (RR-006) ───────────────────────────

export interface CatalogQuery {
  search?: string;
  type?: 'LINK' | 'PDF' | 'VIDEO' | 'IMAGE' | 'DOCUMENT';
}

export interface CatalogResourceItem {
  id: string;
  title: string;
  description?: string | null;
  type: 'LINK' | 'PDF' | 'VIDEO' | 'IMAGE' | 'DOCUMENT';
  url: string;
  createdAt?: string;
  authorName?: string;
}

export interface CatalogResponse {
  resources: CatalogResourceItem[];
  total: number;
}

export const getResourceCatalog = async (
  query?: CatalogQuery
): Promise<CatalogResponse> => {
  const params = new URLSearchParams();
  if (query?.search?.trim()) params.append('search', query.search.trim());
  if (query?.type) params.append('type', query.type);

  const qs = params.toString();
  const response = await httpClient.get<CatalogResponse>(
    `/resources/catalog${qs ? `?${qs}` : ''}`
  );
  return {
    ...response.data,
    resources: (response.data.resources || []).map((r) => ({
      ...r,
      id: String(r.id),
    })),
  };
};
