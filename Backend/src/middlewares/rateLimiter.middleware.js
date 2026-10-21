import rateLimit from 'express-rate-limit';

/**
 * Limitador estricto para endpoints que consumen cuotas de Inteligencia Artificial (Gemini)
 * Máximo 20 peticiones por ventana de 15 minutos
 */
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Has superado el límite de consultas de Inteligencia Artificial. Por favor, espera 15 minutos antes de intentar de nuevo.'
  }
});
