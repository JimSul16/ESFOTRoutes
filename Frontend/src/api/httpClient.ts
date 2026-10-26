import axios, { AxiosError, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';
import type { ApiError } from '../types';

// En producción la URL la inyecta Vercel en el build (VITE_API_URL).
// Si falta, se avisa en consola: antes caía en silencio a localhost y el
// sitio desplegado intentaba hablarle a la máquina del desarrollador.
const configuredBaseURL = import.meta.env.VITE_API_URL?.trim();

if (import.meta.env.PROD && !configuredBaseURL) {
  console.error(
    '[ESFOT] VITE_API_URL no está definida en este build. El frontend apuntará a ' +
      'http://localhost:3000 y todas las peticiones fallarán. Configúrala en Vercel y redeploya.'
  );
}

const baseURL = configuredBaseURL || 'http://localhost:3000/api';

const httpClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  validateStatus: (status) => status >= 200 && status < 300,
});

httpClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

httpClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default httpClient;
