import { Router } from 'express';
import accessController from '../controllers/accessController.js';

const router = Router();

router.post('/ingreso', accessController.registrarIngreso);

export default router;