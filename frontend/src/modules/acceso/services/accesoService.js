import { httpClient } from '../../../core/api/httpClient.js';

export const accesoService = {
    registrarIngreso: async (qrCode, sedeId) => {
        try {
            const response = await httpClient.post('/accesses/ingreso', {
                qrCode,
                sedeId
            });
            
            return response.data;
            
        } catch (error) {
            // Buscamos el mensaje de error originado en el backend o en el interceptor
            const mensajeError = error.response?.data?.mensaje || error.message || 'Error al procesar el ingreso.';
            
            // Lanzamos un error limpio para que lo agarre el hook (useAcceso.js)
            throw new Error(mensajeError);
        }
    }
};