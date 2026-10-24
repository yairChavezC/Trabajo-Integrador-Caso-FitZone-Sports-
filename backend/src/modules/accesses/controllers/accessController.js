import { ValidateAccessDTO } from '../dtos/access.dto.js';
import accessService from '../services/accessService.js';
import accessRepository from '../repositories/accessRepository.js'; 

class AccessController {
    
    async registrarEscaneo(req, res) {
        try {
            const dto = new ValidateAccessDTO(req.body);
            const erroresValidacion = dto.validate();
            if (erroresValidacion.length > 0) return res.status(400).json({ success: false, errores: erroresValidacion });
            
            const resultado = await accessService.procesarEscaneoMolinete(dto.qrCode, dto.sedeId);
            if (!resultado.autorizado) return res.status(403).json({ success: false, mensaje: resultado.mensaje });
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
            if (!resultado.autorizado) return res.status(403).json({ success: false, mensaje: resultado.mensaje });
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
            const aforoActual = await accessRepository.getAforoPorSede(sedeId);
            const ultimosMovimientos = await accessRepository.getUltimosMovimientosPorSede(sedeId);
            return res.status(200).json({ success: true, data: { aforoActual, ultimosMovimientos } });
        } catch (error) {
            return res.status(500).json({ success: false, mensaje: "Error del servidor" });
        }
    }

    // 👇 AHORA SÍ ESTÁ ADENTRO DE LA CLASE
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

    // =====================================================================
    // HISTORIAL DEL SOCIO (Para el Dashboard)
    // =====================================================================
    async obtenerHistorialSocio(req, res) {
        try {
            // Obtenemos el ID del socio (Idealmente desde un token JWT, pero por ahora lo sacamos del query o hardcodeamos)
            const userId = req.query.userId || 10; // 10 es el ID de Luis Advíncula según tu base de datos

            const historial = await accessRepository.getHistorialByUser(userId);

            return res.status(200).json({
                success: true,
                data: historial
            });
        } catch (error) {
            console.error("Error al obtener historial del socio:", error);
            return res.status(500).json({ success: false, mensaje: "Error del servidor" });
        }
    }
} 

export default new AccessController();