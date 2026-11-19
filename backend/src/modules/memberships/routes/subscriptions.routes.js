import { Router } from 'express';

export function createSubscriptionsRouter(controller) {
  const router = Router();
  router.post('/:idUsuario/renovar', controller.renovar);
  return router;
}