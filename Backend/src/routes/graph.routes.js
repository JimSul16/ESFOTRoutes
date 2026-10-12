import { Router } from 'express';
import {
  getSubjects,
  getSubjectTopics,
  submitSelfDiagnosis,
  generatePersonalizedRoute,
  getRecommendations,
  getTopicContext
} from '../controllers/graph.controller.js';
import { verifyToken, checkRoles } from '../middlewares/auth.middleware.js';

const router = Router();

// Rutas de catálogo y diagnóstico (accesibles para estudiantes y administradores autenticados)
router.get('/subjects', verifyToken, getSubjects);
router.get('/subjects/:id/topics', verifyToken, getSubjectTopics);
router.post('/self-diagnosis', verifyToken, checkRoles(['STUDENT', 'ADMIN']), submitSelfDiagnosis);
router.post('/generate-personalized-route', verifyToken, checkRoles(['STUDENT', 'ADMIN']), generatePersonalizedRoute);
router.get('/recommendations', verifyToken, checkRoles(['STUDENT', 'ADMIN']), getRecommendations);
router.get('/topic/:topicId/context', verifyToken, getTopicContext);

export default router;
