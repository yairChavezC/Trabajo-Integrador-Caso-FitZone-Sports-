import { Router } from 'express';

export function createUsersRouter(controller) {
  const router = Router();

  router.get('/', controller.getUsers);
  router.get('/:id', controller.getUser);
  router.post('/', controller.createUser);
  router.get('/:id/pagos', controller.getPagos);

  return router;
}