
// Importamos el cliente configurado por tu equipo (ajustá la cantidad de '../' si es necesario)
import httpClient from '../../../core/api/httpClient.js';

export const accesoService = {
    
    // Función para procesar el ingreso (consumiendo el endpoint que hicimos antes)
    registrarIngreso: async (qrCode, sedeId) => {
        try {
            // Hacemos el POST a la ruta de nuestro módulo
            const response = await httpClient.post('/accesses/ingreso', {
                qrCode,
                sedeId
            });
            
            // Axios guarda la respuesta del backend dentro de la propiedad "data"
            return response.data;
            
        } catch (error) {
            // Si el backend tira un error (ej: 400 o 403), Axios lo captura acá.
            // Extraemos el mensaje de error que mandamos desde el backend o ponemos uno genérico.
            const mensajeError = error.response?.data?.mensaje || 'Error de conexión con el servidor.';
            throw new Error(mensajeError);
        }
    }
};