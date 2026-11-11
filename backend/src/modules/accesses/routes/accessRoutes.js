import { Router } from 'express';
import accessController from '../controllers/accessController.js';
import { verificarToken } from '../../../core/middlewares/authMiddleware.js'; 

const router = Router();

// 🛡️ Middleware de Autorización: Solo permite Recepcionista (1) o Gerente (4)
const soloPersonal = (req, res, next) => {
    const rol = Number(req.usuario?.rol);
    if (rol !== 1 && rol !== 4) {
        return res.status(403).json({ 
            success: false, 
            mensaje: 'Acceso denegado: Se requieren permisos de recepción o gerencia.' 
        });
    }
    next();
};

// 🔒 Rutas operativas de puerta: Requieren token válido + rol de personal (1 o 4)
router.post('/ingreso', verificarToken, soloPersonal, accessController.registrarIngreso);
router.post('/salida', verificarToken, soloPersonal, accessController.registrarSalida);
router.post('/scan', verificarToken, soloPersonal, accessController.registrarEscaneo);
router.get('/estado/:sedeId', verificarToken, soloPersonal, accessController.obtenerEstadoSede);
router.post('/externo', verificarToken, soloPersonal, accessController.registrarExterno);

// 📡 Rutas para Contingencia Offline y Sincronización Diferida (RNF-01)
router.get('/padron-offline', verificarToken, soloPersonal, accessController.obtenerPadronOffline);
router.post('/sincronizar-offline', verificarToken, soloPersonal, accessController.sincronizarOffline);

// 🔒 Historial personal: Requiere token válido (accesible para el Socio logueado)
router.get('/me/historial', verificarToken, accessController.obtenerHistorialSocio);

export default router;