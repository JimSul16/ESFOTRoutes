import { Router } from 'express';
import { executeCode } from '../controllers/execute.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/run', verifyToken, executeCode);

export default router;