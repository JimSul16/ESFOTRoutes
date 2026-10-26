import httpClient from './httpClient';
import type { UploadResponse, CoverUploadResponse } from '../types';

export const uploadFile = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await httpClient.post<UploadResponse>('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const uploadProfileImage = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await httpClient.post<UploadResponse>('/upload/profile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const uploadCoverImage = async (file: File): Promise<CoverUploadResponse> => {
  const formData = new FormData();
  formData.append('portada', file);

  const response = await httpClient.post<CoverUploadResponse>('/upload/subir-portada', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
