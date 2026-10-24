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
            const mensajeError = error.response?.data?.mensaje || error.message || 'Error al procesar el ingreso.';
            throw new Error(mensajeError);
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
            const mensajeError = error.response?.data?.mensaje || error.message || 'Error al procesar el escaneo.';
            throw new Error(mensajeError);
        }
    },

    /**
     * Registra un cliente externo sin sumarlo al aforo.
     */
    registrarIngresoExterno: async (datosSocio, sedeId) => {
        try {
            const response = await httpClient.post('/accesses/externo', { 
                ...datosSocio, 
                sedeId 
            });
            return response.data;
        } catch (error) {
            const mensajeError = error.response?.data?.mensaje || error.message || 'Error al registrar el ingreso del cliente externo.';
            throw new Error(mensajeError);
        }
    }
};