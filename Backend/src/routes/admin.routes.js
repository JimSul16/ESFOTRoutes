import { Router } from 'express';
import { getUsers, createUser, updateUser, toggleUserStatus, unlockUser, getUserProgress } from '../controllers/admin.controller.js';
import { verifyToken, checkRoles } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(verifyToken, checkRoles(['ADMIN']));

router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
// RR-004: resumen de avances de un usuario (vista admin).
router.get('/users/:id/progress', getUserProgress);
router.patch('/users/:id/status', toggleUserStatus);
router.post('/unlock/:id', unlockUser);

export default router;