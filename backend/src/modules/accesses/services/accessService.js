import { httpClient } from '../../../core/api/httpClient.js';

export const accesoService = {
    /**
     * Registra un ingreso manual a la sucursal.
     */
    registrarIngreso: async (qrCode, sedeId) => {
        try {
            const response = await httpClient.post('/accesses/ingreso', {
                qrCode,
                sedeId
            });
            return response.data;
        } catch (error) {
            // El httpClient ya estandarizó el mensaje, simplemente propagamos el error
            throw new Error(error.message || 'Error al procesar el ingreso.');
        }
    },

    /**
     * Método maestro (botón inteligente): decide automáticamente si procesa un ingreso o una salida mediante el escaneo del QR.
     */
    registrarEscaneo: async (qrCode, sedeId) => {
        try {
            const response = await httpClient.post('/accesses/scan', {
                qrCode,
                sedeId
            });
            return response.data;
        } catch (error) {
            // Propagamos directamente el mensaje estandarizado por el interceptor global
            throw new Error(error.message || 'Error al procesar el escaneo.');
        }
    }
};