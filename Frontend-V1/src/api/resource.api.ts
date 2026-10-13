import httpClient from './httpClient';
import type { Resource } from '../types';

export const getResources = async (): Promise<Resource[]> => {
  const response = await httpClient.get<Resource[]>('/resources');
  return response.data;
};

export const createResource = async (resourceData: Partial<Resource>): Promise<Resource> => {
  const response = await httpClient.post<Resource>('/resources', resourceData);
  return response.data;
};

export const updateResource = async (id: string, resourceData: Partial<Resource>): Promise<Resource> => {
  const response = await httpClient.put<Resource>(`/resources/${id}`, resourceData);
  return response.data;
};

export const deleteResource = async (id: string): Promise<void> => {
  await httpClient.delete(`/resources/${id}`);
};
