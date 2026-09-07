import { Router } from 'express';
import authRoutes from './modules/auth/authRoutes.js';
import sedeRoutes from './modules/sedes/routes/sedeRoutes.js';
import { verificarToken } from './core/middlewares/authMiddleware.js'; 
// import canchasRoutes from './modules/canchas/canchasRoutes.js';
// import sociosRoutes from './modules/socios/sociosRoutes.js';

const router = Router();

// 1. RUTAS PÚBLICAS (No piden token)
router.use('/auth', authRoutes);

// 🔒 BARRERA DE SEGURIDAD
// A partir de esta línea, cualquier ruta definida abajo exige token obligatorio
router.use(verificarToken);

// 2. RUTAS PROTEGIDAS
router.use('/sedes', sedeRoutes);
// router.use('/canchas', canchasRoutes);
// router.use('/socios', sociosRoutes);

export default router;