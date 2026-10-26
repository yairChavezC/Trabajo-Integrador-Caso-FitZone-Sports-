import { Router } from 'express';
import authRoutes from './modules/auth/authRoutes.js';
import sedeRoutes from './modules/sedes/routes/sedeRoutes.js';
import canchasRoutes from './modules/canchas/routes/canchasRoutes.js';
import { verificarToken } from './core/middlewares/authMiddleware.js'; 
import accessRoutes from './modules/accesses/routes/accessRoutes.js';
import paymentRoutes from './modules/payments/routes/paymentRoutes.js';
import activityRoutes from './modules/activities/routes/activityRoutes.js';
import usersRoutes from './modules/users/users.routes.js';
import plansRoutes from './modules/memberships/plans.routes.js';
import reservaCanchaRoutes from './modules/reservaCancha/reservaCanchaRoutes.js';


const router = Router();

//RUTAS PÚBLICAS (No piden token)
router.use('/auth', authRoutes);



//A partir de esta línea, cualquier ruta definida abajo exige token obligatorio
router.use(verificarToken);

//RUTAS PROTEGIDAS (Exigen token)
router.use('/sedes', sedeRoutes);
router.use('/canchas', canchasRoutes);
router.use('/reservas-canchas', reservaCanchaRoutes);
router.use('/accesses', accessRoutes);
router.use('/payments', paymentRoutes); // <-- Protegido nuevamente abajo de la barrera
router.use('/clases', activityRoutes);
router.use('/users', usersRoutes);
router.use('/plans', plansRoutes);

export default router;