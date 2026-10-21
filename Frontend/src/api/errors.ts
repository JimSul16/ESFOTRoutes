import type { ApiError } from '@/types';

/**
 * Extrae un mensaje legible de un error de Axios.
 *
 * El backend no es homogéneo: algunas rutas responden `{ message }` y otras
 * `{ error }` (incluso en el mismo flujo, p. ej. login devuelve ambas). Aquí se
 * normaliza para no repetir el `?.response?.data?.error || ...` en cada vista.
 */
export const getApiErrorMessage = (error: unknown, fallback = 'Ocurrió un error inesperado.'): string => {
  const data = (error as ApiError | undefined)?.response?.data;

  if (data?.error) return data.error;
  if (data?.message) return data.message;

  // Errores de red (sin respuesta del servidor) sí traen `message`.
  const generic = (error as { message?: string } | undefined)?.message;
  return generic || fallback;
};