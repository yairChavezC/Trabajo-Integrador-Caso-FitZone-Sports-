import accessRepository from '../repositories/accessRepository.js';

class AccessService {
    
    /**
     * Método maestro que decide si procesa un ingreso o una salida según el estado actual del socio.
     */
    async procesarEscaneoMolinete(qrCode, sedeId) {
        try {
            const usuario = await accessRepository.findUserByQR(qrCode);
            if (!usuario) {
                return { autorizado: false, mensaje: 'QR inválido.' };
            }

            const estaAdentro = await accessRepository.checkAccesoActivoGlobal(usuario.id);

            if (estaAdentro) {
                const resultadoSalida = await this.procesarSalida(qrCode, sedeId);
                
                if (resultadoSalida && resultadoSalida.autorizado) {
                    resultadoSalida.tipoAccion = 'salida';
                }
                return resultadoSalida;
            } else {
                const resultadoIngreso = await this.procesarIngreso(qrCode, sedeId);
                
                if (resultadoIngreso && resultadoIngreso.autorizado) {
                    resultadoIngreso.tipoAccion = 'ingreso';
                }
                return resultadoIngreso;
            }
        } catch (error) {
            console.error("Error crítico en procesarEscaneoMolinete:", error);
            return { autorizado: false, mensaje: "Error en el servidor." };
        }
    }
    
    /**
     * Procesa y valida el ingreso de un socio a la sucursal.
     */
    async procesarIngreso(qrCode, sedeId) {
        try {
            const usuario = await accessRepository.findUserByQR(qrCode);
            if (!usuario) {
                throw new Error('Código QR inválido o expirado.');
            }

            const estadoMembresia = usuario.estado_suscripcion;
            if (estadoMembresia !== 'activa' && estadoMembresia !== 'activo') {
                throw new Error('El usuario no tiene una membresía activa.');
            }

            const accesoActivo = await accessRepository.checkAccesoActivoGlobal(usuario.id);
            if (accesoActivo) {
                throw new Error('Acceso denegado: El usuario ya se encuentra registrado dentro de una sucursal.');
            }

            const registro = await accessRepository.createAccess({ idSede: sedeId, idUserId: usuario.id });

            let aforoActual = 0;
            if (typeof accessRepository.getAforoPorSede === 'function') {
                aforoActual = await accessRepository.getAforoPorSede(sedeId);
            }

            return {
                autorizado: true,
                tipoAccion: 'ingreso',
                mensaje: 'Ingreso exitoso',
                usuarioId: usuario.id,
                aforoActual: aforoActual,
                horaIngreso: registro.fecha_entrada
            };

        } catch (error) {
            return {
                autorizado: false,
                mensaje: error.message
            };
        }
    }

    /**
     * Procesa y valida la salida de un socio de la sucursal.
     */
    async procesarSalida(qrCode, sedeId) { 
        try {
            const usuario = await accessRepository.findUserByQR(qrCode);
            if (!usuario) {
                return { autorizado: false, mensaje: 'Código QR inválido.' };
            }

            const salida = await accessRepository.registrarSalida(usuario.id, sedeId);

            if (!salida) {
                return {
                    autorizado: false,
                    mensaje: "El usuario no registra un ingreso activo en esta sucursal."
                };
            }

            let aforoActual = 0;
            if (typeof accessRepository.getAforoPorSede === 'function') {
                aforoActual = await accessRepository.getAforoPorSede(sedeId);
            }

            return {
                autorizado: true,
                tipoAccion: 'salida',
                mensaje: "Salida registrada correctamente.",
                usuarioId: usuario.id,
                aforoActual: aforoActual,
                data: salida
            };
        } catch (error) {
            console.error("Error en procesarSalida:", error);
            return {
                autorizado: false,
                mensaje: "Error al procesar la salida: " + error.message
            };
        }
    }

    // =====================================================================
    // REGISTRO DE CLIENTE EXTERNO
    // =====================================================================
    /**
     * Registra un cliente externo en la tabla usuarios y marca el ingreso.
     */
    async registrarIngresoExterno({ nombre, dni, sedeId }) {
        try {
            let usuarioBd = null;

            // 1. Comprobar si ya existe en la BD por DNI
            if (typeof accessRepository.findUserByDni === 'function') {
                 usuarioBd = await accessRepository.findUserByDni(dni);
            }

            // 2. Si no existe, lo creamos con id_rol = 2 (Cliente Externo)
            if (!usuarioBd) {
                 const ROL_CLIENTE_EXTERNO = 2; // 👈 2 = Cliente Externo

                 if (typeof accessRepository.createUserPublic === 'function') {
                     usuarioBd = await accessRepository.createUserPublic({
                         nombre: nombre,
                         dni: dni,
                         id_rol: ROL_CLIENTE_EXTERNO // Sin email porque la columna no existe
                     });
                 }
            }

            // 3. Registrar el ingreso en la tabla control_acceso
            const registro = await accessRepository.createAccess({ 
                idSede: sedeId, 
                idUserId: usuarioBd.id 
            });

            // 4. Retornar payload exitoso
            return {
                autorizado: true,
                tipoAccion: 'ingreso',
                mensaje: `Cliente externo ${nombre} registrado con éxito.`,
                usuario: {
                    id: usuarioBd.id,
                    nombre: usuarioBd.nombre,
                    rol: 'cliente_externo'
                },
                acceso: registro
            };

        } catch (error) {
            console.error("Error en registrarIngresoExterno:", error);
            throw error;
        }
    }
}

export default new AccessService();