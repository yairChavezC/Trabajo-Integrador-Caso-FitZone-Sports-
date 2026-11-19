import { Router } from 'express';
import { requireRole } from '../requireRole.js'; 

const ROL_GERENTE = 4;

export function createPlansRouter(controller) {
  const router = Router();

  router.get('/', controller.getPlans);
  router.get('/:id', controller.getPlan);
  router.post('/', requireRole(ROL_GERENTE), controller.createPlan);
  router.put('/:id', requireRole(ROL_GERENTE), controller.updatePlan);
  router.patch('/:id/activo', requireRole(ROL_GERENTE), controller.setPlanActivo);

  return router;
}