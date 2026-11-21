import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

/**
 * Limitador estricto para endpoints que consumen cuotas de Inteligencia Artificial (Gemini)
 * Máximo 20 peticiones por ventana de 15 minutos
 *
 * Se monta DESPUÉS de `verifyToken` y cuenta por usuario: por IP, todo el
 * campus (una sola IP pública) compartía las mismas 20 consultas.
 */
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user?.id ? `user:${req.user.id}` : ipKeyGenerator(req.ip)),
  message: {
    success: false,
    error: 'Has superado el límite de consultas de Inteligencia Artificial. Por favor, espera 15 minutos antes de intentar de nuevo.'
  }
});
