import { Router } from 'express';
import accessController from '../controllers/accessController.js';
import { verificarToken } from '../../../core/middlewares/authMiddleware.js'; 

const router = Router();

// 🔒 Rutas protegidas: Requieren estar logueado
router.post('/ingreso', verificarToken, accessController.registrarIngreso);
router.post('/salida', verificarToken, accessController.registrarSalida);
router.post('/scan', verificarToken, accessController.registrarEscaneo);
router.get('/estado/:sedeId', verificarToken, accessController.obtenerEstadoSede);
router.post('/externo', verificarToken, accessController.registrarExterno);

// 🔒 Historial personal del usuario logueado
router.get('/me/historial', verificarToken, accessController.obtenerHistorialSocio);

export default router;