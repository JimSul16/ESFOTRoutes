import { Router } from 'express';
import {
  processChatMessage,
  generateModuleAssessment,
  getChatSessions,
  getChatMessages
} from '../controllers/chat.controller.js';
import { verifyToken, checkRoles } from '../middlewares/auth.middleware.js';
import { aiLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = Router();

// Solo los endpoints que llaman a Gemini llevan `aiLimiter` (por usuario).
router.post('/send', verifyToken, aiLimiter, checkRoles(['STUDENT']), processChatMessage);
router.post('/assessment', verifyToken, aiLimiter, checkRoles(['STUDENT']), generateModuleAssessment);

// Lectura del historial: no consume cuota de IA.
router.get('/sessions', verifyToken, checkRoles(['STUDENT']), getChatSessions);
router.get('/sessions/:sessionId/messages', verifyToken, checkRoles(['STUDENT']), getChatMessages);

export default router;
