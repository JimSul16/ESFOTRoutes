import { Router } from 'express';
import { getWeeklyActivity } from '../controllers/analytics.controller.js';
import { verifyToken, checkRoles } from '../middlewares/auth.middleware.js';

const router = Router();

// Analítica de estudio del estudiante (datos reales de Turso).
router.get('/weekly-activity', verifyToken, checkRoles(['STUDENT', 'ADMIN']), getWeeklyActivity);

export default router;
