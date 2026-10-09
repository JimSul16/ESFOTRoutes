import { Router } from 'express';
import { processChatMessage, generateModuleAssessment } from '../controllers/chat.controller.js';
import { verifyToken, checkRoles } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/send', verifyToken, checkRoles(['STUDENT']), processChatMessage);
router.post('/assessment', verifyToken, checkRoles(['STUDENT']), generateModuleAssessment);

export default router;