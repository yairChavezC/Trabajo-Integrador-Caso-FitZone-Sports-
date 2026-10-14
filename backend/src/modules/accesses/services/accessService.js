import accessRepository from '../repositories/accessRepository.js';

class AccessService {
    
    // Función principal que va a ser llamada cuando alguien apoye el celular en el molinete
    async procesarIngreso(qrCode, sedeId) {
        try {
            // 1. RF-04: Validar QR y buscar usuario
            const usuario = await accessRepository.findUserByQR(qrCode);
            if (!usuario) {
                // Si no existe, rechazamos el acceso
                throw new Error('Código QR inválido o expirado.');
            }

            // 2. RF-02 / RF-04: Verificar que la membresía esté Activa
            const estadoMembresia = usuario.estado_membresia || usuario.estadoMembresia;
            if (estadoMembresia !== 'Activo' && estadoMembresia !== 'ACTIVO') {
                throw new Error('El usuario no tiene una membresía activa.');
            }

            // 3. RN-01: Verificar que no esté dentro de otra sede (ni en esta)
            const accesoActivo = await accessRepository.checkAccesoActivoGlobal(usuario.id);
            if (accesoActivo) {
                throw new Error('Acceso denegado: El usuario ya se encuentra registrado dentro de una sucursal.');
            }

            // 4. Todo en orden: Registramos el ingreso en la base de datos
            const registro = await accessRepository.createAccess({ idSede: sedeId, idUserId: usuario.id });

            // 5. RF-05: Calculamos el aforo actual para mandarlo a la pantalla de la recepcionista
            let aforoActual = 0;
            if (typeof accessRepository.getAforoActual === 'function') {
                aforoActual = await accessRepository.getAforoActual(sedeId);
            }

            // Retornamos un objeto con los datos exitosos
            return {
                autorizado: true,
                mensaje: 'Ingreso exitoso',
                usuarioId: usuario.id,
                aforoActual: aforoActual,
                horaIngreso: registro.fecha_entrada
            };

        } catch (error) {
            // Si cualquier paso anterior falla, devolvemos el error
            return {
                autorizado: false,
                mensaje: error.message
            };
        }
    }

    // NUEVA FUNCIÓN: Procesar la salida del socio
    async procesarSalida(idUserId, sedeId) {
        try {
            // Llamamos a la nueva función del repositorio
            const salida = await accessRepository.registrarSalida(idUserId, sedeId);

            if (!salida) {
                return {
                    autorizado: false,
                    mensaje: "El usuario no registra un ingreso activo en esta sede."
                };
            }

            // Calculamos el nuevo aforo para que baje el numerito en pantalla
            let aforoActual = 0;
            if (typeof accessRepository.getAforoActual === 'function') {
                aforoActual = await accessRepository.getAforoActual(sedeId);
            }

            return {
                autorizado: true,
                mensaje: "Salida registrada correctamente. Aforo liberado.",
                aforoActual: aforoActual,
                data: salida
            };
        } catch (error) {
            return {
                autorizado: false,
                mensaje: "Error al procesar la salida: " + error.message
            };
        }
    }
    
}

export default new AccessService();