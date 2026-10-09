import { Router } from 'express';
import { 
  createRoute, 
  getRoutes, 
  deleteRoute, 
  updateRoute, 
  generatePersonalizedRoute,
  getMyRoutes,
  enrollRoute,
  completeModule
} from '../controllers/routes.controller.js';
import { verifyToken, checkRoles } from '../middlewares/auth.middleware.js';
import { uploadCloudinary } from '../services/cloudinary.service.js';

const router = Router();

router.get('/my-routes', verifyToken, getMyRoutes);
router.post('/:id/enroll', verifyToken, checkRoles(['STUDENT']), enrollRoute);
router.post('/complete-module', verifyToken, checkRoles(['STUDENT']), completeModule);

router.post('/', verifyToken, checkRoles(['ADMIN']), createRoute);
router.get('/', verifyToken, checkRoles(['ADMIN', 'STUDENT']), getRoutes);
router.put('/:id', verifyToken, checkRoles(['ADMIN']), updateRoute);
router.delete('/:id', verifyToken, checkRoles(['ADMIN']), deleteRoute);

router.post('/generate', verifyToken, checkRoles(['STUDENT', 'ADMIN']), uploadCloudinary.single('file'), generatePersonalizedRoute);

export default router;