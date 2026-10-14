import { ValidateAccessDTO } from '../dtos/access.dto.js';
import accessService from '../services/accessService.js';
import accessRepository from '../repositories/accessRepository.js'; 

class AccessController {
    
    // =====================================================================
    // 1. MÉTODO MAESTRO (BOTÓN INTELIGENTE): Decide si entra o sale
    // =====================================================================
    async registrarEscaneo(req, res) {
        try {
            const dto = new ValidateAccessDTO(req.body);
            const erroresValidacion = dto.validate();

            if (erroresValidacion.length > 0) {
                return res.status(400).json({
                    success: false,
                    errores: erroresValidacion
                });
            }

            const resultado = await accessService.procesarEscaneoMolinete(dto.qrCode, dto.sedeId);

            if (!resultado.autorizado) {
                return res.status(403).json({ 
                    success: false,
                    mensaje: resultado.mensaje
                });
            }

            return res.status(200).json({
                success: true,
                data: resultado
            });

        } catch (error) {
            console.error('Error en AccessController (Escaneo):', error);
            return res.status(500).json({
                success: false,
                mensaje: 'Error interno del servidor al procesar el escaneo.'
            });
        }
    }

    // =====================================================================
    // 2. MÉTODO ESPECÍFICO: Solo Ingreso
    // =====================================================================
    async registrarIngreso(req, res) {
        try {
            const dto = new ValidateAccessDTO(req.body);
            const erroresValidacion = dto.validate();

            if (erroresValidacion.length > 0) {
                return res.status(400).json({ success: false, errores: erroresValidacion });
            }

            const resultado = await accessService.procesarIngreso(dto.qrCode, dto.sedeId);

            if (!resultado.autorizado) {
                return res.status(403).json({ success: false, mensaje: resultado.mensaje });
            }

            return res.status(200).json({ success: true, data: resultado });

        } catch (error) {
            console.error('Error en AccessController (Ingreso):', error);
            return res.status(500).json({ success: false, mensaje: 'Error interno del servidor al procesar el ingreso.' });
        }
    }

    // =====================================================================
    // 3. MÉTODO ESPECÍFICO: Solo Salida
    // =====================================================================
    async registrarSalida(req, res) {
        try {
            const { qrCode, sedeId } = req.body;

            if (!qrCode || !sedeId) {
                return res.status(400).json({ success: false, mensaje: 'Faltan datos obligatorios para registrar la salida.' });
            }

            const resultado = await accessService.procesarSalida(qrCode, sedeId);

            if (!resultado.autorizado) {
                return res.status(400).json({ success: false, mensaje: resultado.mensaje });
            }

            return res.status(200).json({ success: true, data: resultado });

        } catch (error) {
            console.error('Error en AccessController (Salida):', error);
            return res.status(500).json({ success: false, mensaje: 'Error interno del servidor al procesar la salida.' });
        }
    }

    // =====================================================================
    // 4. ESTADO DE SEDE: Aforo y Últimos Movimientos
    // =====================================================================
    async obtenerEstadoSede(req, res) {
        try {
            const { sedeId } = req.params;

            const aforoActual = await accessRepository.getAforoPorSede(sedeId);
            const ultimosMovimientos = await accessRepository.getUltimosMovimientosPorSede(sedeId);

            return res.status(200).json({
                success: true,
                data: {
                    aforoActual,
                    ultimosMovimientos
                }
            });
        } catch (error) {
            console.error("Error al obtener estado de sede:", error);
            return res.status(500).json({ success: false, mensaje: "Error del servidor" });
        }
    }
}

export default new AccessController();