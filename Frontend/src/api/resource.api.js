import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const getAuthHeader = () => {
  const token = sessionStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
};

export const getResources = async () => {
  const response = await axios.get(`${API_URL}/resources`, { 
    headers: getAuthHeader() 
  });
  return response.data;
};

export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await axios.post(`${API_URL}/upload`, formData, {
    headers: {
      ...getAuthHeader(),
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.url;
};

export const createResource = async (resourceData) => {
  const response = await axios.post(`${API_URL}/resources`, resourceData, { 
    headers: getAuthHeader() 
  });
  return response.data;
};

export const deleteResource = async (id) => {
  const response = await axios.delete(`${API_URL}/resources/${id}`, { 
    headers: getAuthHeader() 
  });
  return response.data;
};