import { Router } from 'express';
import { 
  createRoute, 
  getRoutes, 
  getRouteById,
  deleteRoute, 
  updateRoute, 
  generatePersonalizedRoute,
  getMyRoutes,
  enrollRoute,
  completeModule,
  getModuleAssessments
} from '../controllers/routes.controller.js';
import { verifyToken, checkRoles } from '../middlewares/auth.middleware.js';
import { handleUploadError, uploadMaterial } from '../middlewares/upload.middleware.js';

const router = Router();

router.get('/my-routes', verifyToken, getMyRoutes);
router.get('/:id', verifyToken, checkRoles(['ADMIN', 'STUDENT']), getRouteById);
router.post('/:id/enroll', verifyToken, checkRoles(['STUDENT']), enrollRoute);
router.post('/complete-module', verifyToken, checkRoles(['STUDENT']), completeModule);

// RR-008: evaluaciones generadas de un módulo (listado).
// `/:id` solo captura un segmento, así que esta ruta de 3 segmentos no choca.
router.get('/modules/:moduleId/assessments', verifyToken, checkRoles(['ADMIN', 'STUDENT']), getModuleAssessments);

router.post('/', verifyToken, checkRoles(['ADMIN']), createRoute);
router.get('/', verifyToken, checkRoles(['ADMIN', 'STUDENT']), getRoutes);
router.put('/:id', verifyToken, checkRoles(['ADMIN']), updateRoute);
router.delete('/:id', verifyToken, checkRoles(['ADMIN']), deleteRoute);

// Genera una ruta con IA a partir de un material de estudio (PDF/TXT/MD).
// Antes usaba el multer de imágenes, así que subir un PDF devolvía 400.
router.post('/generate', verifyToken, checkRoles(['STUDENT', 'ADMIN']), uploadMaterial.single('file'), generatePersonalizedRoute);

// Los errores de multer se responden en JSON (no en texto plano).
router.use(handleUploadError);

export default router;