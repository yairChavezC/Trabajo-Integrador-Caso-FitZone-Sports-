import { ValidateAccessDTO } from '../dtos/access.dto.js';
import accessService from '../services/accessService.js';

class AccessController {
    
    async registrarEscaneo(req, res) {
        try {
            const dto = new ValidateAccessDTO(req.body);
            const erroresValidacion = dto.validate();
            if (erroresValidacion.length > 0) return res.status(400).json({ success: false, errores: erroresValidacion });
            
            const resultado = await accessService.procesarEscaneoMolinete(dto.qrCode, dto.sedeId);
            if (!resultado.autorizado) return res.status(400).json({ success: false, mensaje: resultado.mensaje });
            return res.status(200).json({ success: true, data: resultado });
        } catch (error) {
            return res.status(500).json({ success: false, mensaje: 'Error interno del servidor al procesar el escaneo.' });
        }
    }

    async registrarIngreso(req, res) {
        try {
            const dto = new ValidateAccessDTO(req.body);
            const erroresValidacion = dto.validate();
            if (erroresValidacion.length > 0) return res.status(400).json({ success: false, errores: erroresValidacion });

            const resultado = await accessService.procesarIngreso(dto.qrCode, dto.sedeId);
            if (!resultado.autorizado) return res.status(400).json({ success: false, mensaje: resultado.mensaje });
            return res.status(200).json({ success: true, data: resultado });
        } catch (error) {
            return res.status(500).json({ success: false, mensaje: 'Error interno del servidor al procesar el ingreso.' });
        }
    }

    async registrarSalida(req, res) {
        try {
            const { qrCode, sedeId } = req.body;
            if (!qrCode || !sedeId) return res.status(400).json({ success: false, mensaje: 'Faltan datos obligatorios para registrar la salida.' });

            const resultado = await accessService.procesarSalida(qrCode, sedeId);
            if (!resultado.autorizado) return res.status(400).json({ success: false, mensaje: resultado.mensaje });
            return res.status(200).json({ success: true, data: resultado });
        } catch (error) {
            return res.status(500).json({ success: false, mensaje: 'Error interno del servidor al procesar la salida.' });
        }
    }

    async obtenerEstadoSede(req, res) {
        try {
            const { sedeId } = req.params;
            const estado = await accessService.obtenerEstadoSede(sedeId);
            return res.status(200).json({ success: true, data: estado });
        } catch (error) {
            return res.status(500).json({ success: false, mensaje: "Error del servidor" });
        }
    }

    async registrarExterno(req, res) {
        try {
            const { nombre, dni, sedeId } = req.body;
            if (!nombre || !dni || !sedeId) {
                return res.status(400).json({ success: false, mensaje: 'Nombre, DNI y Sede son campos obligatorios.' });
            }
            const resultado = await accessService.registrarIngresoExterno({ nombre, dni, sedeId });
            return res.status(201).json({ success: true, data: resultado });
        } catch (error) {
            return res.status(500).json({ success: false, mensaje: error.message || 'Error interno al registrar cliente externo.' });
        }
    }

    async obtenerHistorialSocio(req, res) {
        try {
            const userId = req.usuario?.id; 

            if (!userId) {
                return res.status(401).json({ success: false, mensaje: "Usuario no autenticado." });
            }

            const historial = await accessService.obtenerHistorialSocio(userId);

            return res.status(200).json({
                success: true,
                data: historial
            });
        } catch (error) {
            console.error("Error al obtener historial del socio:", error);
            return res.status(500).json({ success: false, mensaje: "Error del servidor" });
        }
    }

    async obtenerPadronOffline(req, res) {
        try {
            const padron = await accessService.obtenerPadronOffline();
            return res.status(200).json({ success: true, data: padron });
        } catch (error) {
            return res.status(500).json({ success: false, mensaje: "Error al generar padrón offline." });
        }
    }

    async sincronizarOffline(req, res) {
        try {
            const { eventos } = req.body;
            if (!Array.isArray(eventos)) {
                return res.status(400).json({ success: false, mensaje: "Se requiere un listado de eventos." });
            }
            const resultado = await accessService.sincronizarAccesosOffline(eventos);
            return res.status(200).json({ success: true, data: resultado });
        } catch (error) {
            return res.status(500).json({ success: false, mensaje: "Error al sincronizar eventos offline." });
        }
    }
} 

export default new AccessController();