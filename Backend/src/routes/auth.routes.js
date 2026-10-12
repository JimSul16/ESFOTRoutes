import { Router } from 'express';
import * as authCtrl from '../controllers/auth.controller.js'; 
import { verifyToken, checkRoles } from '../middlewares/auth.middleware.js';

const router = Router();


router.post('/register', authCtrl.register);        
router.get('/verify/:token', authCtrl.verifyAccount);
router.post('/login', authCtrl.login);     
router.post('/forgot-password', authCtrl.forgotPassword); 
router.patch('/reset-password/:token', authCtrl.resetPassword); 
router.get('/unlock-account/:token', authCtrl.renderUnlockAccountForm); 
router.post('/unlock-account/:token', authCtrl.unlockAccountViaToken); 


router.get('/profile', verifyToken, authCtrl.getProfile);
router.put('/profile', verifyToken, authCtrl.updateProfile);
router.put('/change-password', verifyToken, authCtrl.changePassword);
router.get('/sessions', verifyToken, authCtrl.getSessionHistory);

router.get('/admin/users', verifyToken, checkRoles(['ADMIN']), (req, res) => {
  res.json({ message: "Bienvenido, Administrador. Aquí están los usuarios." });
});

router.post('/learning-paths', verifyToken, checkRoles(['ADMIN', 'TEACHER']), (req, res) => {
  res.json({ message: "Ruta de aprendizaje creada con éxito." });
});

export default router;