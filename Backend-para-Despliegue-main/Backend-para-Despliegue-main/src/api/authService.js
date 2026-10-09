import apiClient from './apiClient';

export const registerUser = async (userData) => {
  const response = await apiClient.post('/auth/register', userData);
  return response.data;
};

export const loginUser = async (credentials) => {
  const response = await apiClient.post('/auth/login', credentials);
  return response.data;
};

export const verifyAccount = async (token) => {
  const response = await apiClient.get(`/auth/verify/${token}`);
  return response.data;
};

export const forgotPassword = async (emailData) => {
  const response = await apiClient.post('/auth/forgot-password', emailData);
  return response.data;
};

export const resetPassword = async (token, newPasswordData) => {
  const response = await apiClient.post(`/auth/reset-password/${token}`, newPasswordData);
  return response.data;
};