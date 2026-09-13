import { ValidateAccessDTO } from '../dtos/access.dto.js';
import accessService from '../services/accessService.js';

class AccessController {
    
    // Método que maneja la petición POST de un nuevo ingreso
    async registrarIngreso(req, res) {
        try {
            // 1. Usamos el DTO (T01) para validar lo que nos mandan en el body
            const dto = new ValidateAccessDTO(req.body);
            const erroresValidacion = dto.validate();

            // Si faltan datos, devolvemos error 400 (Bad Request)
            if (erroresValidacion.length > 0) {
                return res.status(400).json({
                    success: false,
                    errores: erroresValidacion
                });
            }

            // 2. Llamamos al Service (T03) pasándole los datos ya validados
            const resultado = await accessService.procesarIngreso(dto.qrCode, dto.sedeId);

            // 3. Si la lógica de negocio (Service) rechazó el acceso (ej: cuota vencida)
            if (!resultado.autorizado) {
                return res.status(403).json({ // 403 Forbidden
                    success: false,
                    mensaje: resultado.mensaje
                });
            }

            // 4. Si todo salió bien, devolvemos un 200 OK con el aforo y datos
            return res.status(200).json({
                success: true,
                data: resultado
            });

        } catch (error) {
            // Si hay un error grave (ej: se cayó la base de datos)
            console.error('Error en AccessController:', error);
            // Nota: Si en core/middlewares tienen un manejador global de errores, 
            // acá en lugar de res.status(500) harías un `next(error)`
            return res.status(500).json({
                success: false,
                mensaje: 'Error interno del servidor al procesar el ingreso.'
            });
        }
    }
}

export default new AccessController();