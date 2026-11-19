import { Router } from 'express';

export const createCanchasRouter = (canchaController) => {
  const router = Router();

  router.get('/disponibilidad', canchaController.getDisponibilidad);

  return router;
};