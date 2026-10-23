import { Router } from 'express';
import { checkoutReservaCancha } from './reservaCanchaController.js';
import { verificarToken } from '../../core/middlewares/authMiddleware.js';

const router = Router();

// POST /api/reservas-canchas/checkout
router.post('/checkout', verificarToken, checkoutReservaCancha);

export default router;