import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeader = () => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

export const getRoutes = async () => {
  const response = await axios.get(`${API_URL}/routes`, { headers: getAuthHeader() });
  return response.data;
};

export const createRoute = async (routeData) => {
  const response = await axios.post(`${API_URL}/routes`, routeData, { headers: getAuthHeader() });
  return response.data;
};

export const deleteRoute = async (id) => {
  const response = await axios.delete(`${API_URL}/routes/${id}`, { headers: getAuthHeader() });
  return response.data;
};