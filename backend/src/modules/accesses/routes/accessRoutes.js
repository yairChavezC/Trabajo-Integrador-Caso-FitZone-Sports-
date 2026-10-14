import { Router } from 'express';
import accessController from '../controllers/accessController.js';

const router = Router();

router.post('/ingreso', accessController.registrarIngreso);

router.post('/salida', accessController.registrarSalida);

router.post('/scan', accessController.registrarEscaneo);

router.get('/estado/:sedeId', accessController.obtenerEstadoSede);

export default router;