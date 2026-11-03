import { Router } from 'express';
import controller from './subscriptions.controller.js';

const router = Router();

// POST /api/memberships/:idUsuario/renovar con { "idPlan": 1 }
router.post('/:idUsuario/renovar', controller.renovar);

export default router;