import { Router } from 'express';
import { uploadFile, subirPortadaRuta, uploadProfilePicture } from '../controllers/upload.controller.js';
import { verifyToken, checkRoles } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/upload.middleware.js';
import { uploadCloudinary } from '../services/cloudinary.service.js';

const router = Router();

router.post('/', verifyToken, checkRoles(['ADMIN']), upload.single('file'), uploadFile);
router.post('/subir-portada', verifyToken, checkRoles(['ADMIN']), uploadCloudinary.single('portada'), subirPortadaRuta);
router.post('/profile', verifyToken, uploadCloudinary.single('image'), uploadProfilePicture);

export default router;