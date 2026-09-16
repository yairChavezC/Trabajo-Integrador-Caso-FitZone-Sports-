import { Router } from 'express';
import authRoutes from './modules/auth/authRoutes.js';
import sedeRoutes from './modules/sedes/routes/sedeRoutes.js';
import canchasRoutes from './modules/canchas/routes/canchasRoutes.js';
import { verificarToken } from './core/middlewares/authMiddleware.js'; 
import accessRoutes from './modules/accesses/routes/accessRoutes.js';
import paymentRoutes from './modules/payments/routes/paymentRoutes.js';
import activityRoutes from './modules/activities/routes/activityRoutes.js';

const router = Router();

// 1. RUTAS PÚBLICAS (No piden token)
router.use('/auth', authRoutes);

// 🔒 BARRERA DE SEGURIDAD
// A partir de esta línea, cualquier ruta definida abajo exige token obligatorio
router.use(verificarToken);

// 2. RUTAS PROTEGIDAS (Exigen token)
router.use('/sedes', sedeRoutes);
router.use('/canchas', canchasRoutes);
router.use('/accesses', accessRoutes);
router.use('/payments', paymentRoutes); // <-- Protegido nuevamente abajo de la barrera
router.use('/clases', activityRoutes);

export default router;