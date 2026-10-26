import { Router } from 'express';
import { checkoutReservaCancha, obtenerMisReservas } from './reservaCanchaController.js';
import { verificarToken } from '../../core/middlewares/authMiddleware.js';

const router = Router();

// GET /api/reservas-canchas/mis-reservas
router.get('/mis-reservas', verificarToken, obtenerMisReservas);

// POST /api/reservas-canchas/checkout
router.post('/checkout', verificarToken, checkoutReservaCancha);

export default router;