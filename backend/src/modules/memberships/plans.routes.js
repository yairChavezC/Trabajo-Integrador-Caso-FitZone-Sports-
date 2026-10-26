import { Router } from 'express';
import controller from './plans.controller.js';
import { requireRole } from './requireRole.js';

const ROL_GERENTE = 4; // id del rol "gerente" en la tabla rol

const router = Router();

// Cualquier usuario con sesión puede ver los planes
router.get('/', controller.getPlans);
router.get('/:id', controller.getPlan);

// Solo el gerente puede crearlos, editarlos o desactivarlos
router.post('/', requireRole(ROL_GERENTE), controller.createPlan);
router.put('/:id', requireRole(ROL_GERENTE), controller.updatePlan);
router.patch('/:id/activo', requireRole(ROL_GERENTE), controller.setPlanActivo);

export default router;