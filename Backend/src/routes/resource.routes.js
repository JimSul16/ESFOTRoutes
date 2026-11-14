import { Router } from 'express';
import { createResource, getResources, getCatalog, updateResource, deleteResource } from '../controllers/resource.controller.js';
import { verifyToken, checkRoles } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/', verifyToken, checkRoles(['ADMIN']), createResource);
// RR-006: catálogo con búsqueda/filtro para el estudiante.
router.get('/catalog', verifyToken, checkRoles(['STUDENT', 'ADMIN']), getCatalog);
router.get('/', verifyToken, checkRoles(['ADMIN', 'STUDENT']), getResources);
router.put('/:id', verifyToken, checkRoles(['ADMIN']), updateResource);
router.delete('/:id', verifyToken, checkRoles(['ADMIN']), deleteResource);

export default router;