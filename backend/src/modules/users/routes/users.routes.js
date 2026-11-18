import { Router } from 'express';

export function createUsersRouter(controller) {
  const router = Router();

  router.get('/:id', controller.getUser);
  router.post('/', controller.createUser);

  return router;
}