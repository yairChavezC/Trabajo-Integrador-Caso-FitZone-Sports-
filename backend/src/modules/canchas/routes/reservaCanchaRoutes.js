import { Router } from 'express';
import { verificarToken } from '../../../core/middlewares/authMiddleware.js';

export const createReservaCanchaRouter = (reservaCanchaController) => {
  const router = Router();

  // GET /mis-reservas
  router.get('/mis-reservas', verificarToken, reservaCanchaController.obtenerMisReservas);

  // POST /checkout
  router.post('/checkout', verificarToken, reservaCanchaController.checkoutReservaCancha);

  return router;
};