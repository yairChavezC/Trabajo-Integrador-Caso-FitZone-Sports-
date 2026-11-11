import accessRepository from '../repositories/accessRepository.js';

// Constantes de reglas de negocio (RF-04 y RF-05)
const TIEMPO_EXPIRACION_QR_MS = 65 * 1000; // 60 seg de rotación + 5 seg de tolerancia de red
const AFORO_MAXIMO_DEFAULT = 100;

class AccessService {
    
    /**
     * RF-04: Valida que el código QR tenga el formato FITZONE-<id>-<timestamp>
     * y que no haya expirado (máximo 60 segundos de antigüedad).
     */
    validarFormatoYVigenciaQR(qrCode) {
        if (!qrCode || typeof qrCode !== 'string') {
            return { valido: false, mensaje: 'El código QR es inválido.' };
        }

        const partes = qrCode.trim().split('-');
        if (partes.length < 3 || partes[0] !== 'FITZONE') {
            return { valido: false, mensaje: 'Formato de código QR no reconocido por FitZone.' };
        }

        const timestamp = Number(partes[2]);
        if (isNaN(timestamp)) {
            return { valido: false, mensaje: 'El código QR no contiene una marca de tiempo válida.' };
        }

        const antiguedadMs = Date.now() - timestamp;
        if (antiguedadMs > TIEMPO_EXPIRACION_QR_MS || antiguedadMs < -10000) {
            return { 
                valido: false, 
                mensaje: 'Código QR expirado. Por favor, utilice el código actual en su pantalla.' 
            };
        }

        return { valido: true, userId: partes[1], timestamp };
    }

    /**
     * Método maestro que decide si procesa un ingreso o una salida según el estado actual del socio.
     */
    async procesarEscaneoMolinete(qrCode, sedeId) {
        try {
            const validacionQR = this.validarFormatoYVigenciaQR(qrCode);
            if (!validacionQR.valido) {
                return { autorizado: false, mensaje: validacionQR.mensaje };
            }

            const usuario = await accessRepository.findUserByQR(qrCode);
            if (!usuario) {
                return { autorizado: false, mensaje: 'Socio no encontrado o QR inválido.' };
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
            const validacionQR = this.validarFormatoYVigenciaQR(qrCode);
            if (!validacionQR.valido) {
                throw new Error(validacionQR.mensaje);
            }

            const usuario = await accessRepository.findUserByQR(qrCode);
            if (!usuario) {
                throw new Error('Código QR inválido o socio inexistente.');
            }

            const estadoMembresia = usuario.estado_suscripcion;
            if (estadoMembresia !== 'activa' && estadoMembresia !== 'activo') {
                throw new Error('Acceso denegado: El socio no posee una membresía activa.');
            }

            const accesoActivo = await accessRepository.checkAccesoActivoGlobal(usuario.id);
            if (accesoActivo) {
                throw new Error('Acceso denegado: El socio ya registra un ingreso activo en una sucursal (RN-01).');
            }

            let aforoPrevio = 0;
            if (typeof accessRepository.getAforoPorSede === 'function') {
                aforoPrevio = await accessRepository.getAforoPorSede(sedeId);
                if (aforoPrevio >= AFORO_MAXIMO_DEFAULT) {
                    throw new Error('Acceso denegado: La sucursal ha alcanzado su capacidad máxima de aforo.');
                }
            }

            const registro = await accessRepository.createAccess({ idSede: sedeId, idUserId: usuario.id });

            const aforoActual = typeof accessRepository.getAforoPorSede === 'function'
                ? await accessRepository.getAforoPorSede(sedeId)
                : aforoPrevio + 1;

            return {
                autorizado: true,
                tipoAccion: 'ingreso',
                mensaje: 'Ingreso exitoso',
                usuarioId: usuario.id,
                aforoActual: aforoActual,
                aforoMaximo: AFORO_MAXIMO_DEFAULT,
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
            const validacionQR = this.validarFormatoYVigenciaQR(qrCode);
            if (!validacionQR.valido) {
                return { autorizado: false, mensaje: validacionQR.mensaje };
            }

            const usuario = await accessRepository.findUserByQR(qrCode);
            if (!usuario) {
                return { autorizado: false, mensaje: 'Código QR inválido.' };
            }

            const salida = await accessRepository.registrarSalida(usuario.id, sedeId);

            if (!salida) {
                return {
                    autorizado: false,
                    mensaje: "El socio tiene un ingreso activo en otra sucursal distinta a esta."
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
                aforoMaximo: AFORO_MAXIMO_DEFAULT,
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

    /**
     * Registra un cliente externo en la tabla usuarios y marca el ingreso (no suma al aforo).
     */
    async registrarIngresoExterno({ nombre, dni, sedeId }) {
        try {
            let usuarioBd = null;

            if (typeof accessRepository.findUserByDni === 'function') {
                 usuarioBd = await accessRepository.findUserByDni(dni);
            }

            if (!usuarioBd) {
                 const ROL_CLIENTE_EXTERNO = 2;
                 if (typeof accessRepository.createUserPublic === 'function') {
                     usuarioBd = await accessRepository.createUserPublic({
                         nombre: nombre,
                         dni: dni,
                         id_rol: ROL_CLIENTE_EXTERNO
                     });
                 }
            }

            const registro = await accessRepository.createAccess({ 
                idSede: sedeId, 
                idUserId: usuarioBd.id 
            });

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

    /**
     * Obtiene el aforo actual, el aforo máximo y los últimos movimientos de una sede.
     */
    async obtenerEstadoSede(sedeId) {
        try {
            const aforoActual = await accessRepository.getAforoPorSede(sedeId);
            const ultimosMovimientos = await accessRepository.getUltimosMovimientosPorSede(sedeId);
            return { 
                aforoActual, 
                aforoMaximo: AFORO_MAXIMO_DEFAULT, 
                ultimosMovimientos 
            };
        } catch (error) {
            console.error("Error en obtenerEstadoSede (Servicio):", error);
            throw error;
        }
    }

    /**
     * Obtiene el historial de accesos de un usuario específico.
     */
    async obtenerHistorialSocio(userId) {
        try {
            return await accessRepository.getHistorialByUser(userId);
        } catch (error) {
            console.error("Error en obtenerHistorialSocio (Servicio):", error);
            throw error;
        }
    }

    /**
     * RNF-01: Obtiene el padrón de socios para la réplica local del terminal de sede.
     */
    async obtenerPadronOffline() {
        const socios = await accessRepository.getPadronOffline();
        return {
            fechaSincronizacion: new Date().toISOString(),
            socios: Array.isArray(socios) ? socios : []
        };
    }

   /**
     * RNF-01 / ADR-007: Sincroniza en lote los accesos registrados en modo offline
     * garantizando idempotencia y cumplimiento de RN-01.
     */
    async sincronizarAccesosOffline(eventos = []) {
        const resultados = { procesados: 0, errores: 0 };

        const eventosOrdenados = [...eventos].sort(
            (a, b) => new Date(a.fechaEvento) - new Date(b.fechaEvento)
        );

        for (const ev of eventosOrdenados) {
            try {
                if (ev.tipoAccion === 'ingreso') {
                    // Evita duplicar el ingreso si el socio ya figura adentro (Idempotencia / RN-01)
                    const yaEstaAdentro = await accessRepository.checkAccesoActivoGlobal(ev.usuarioId);
                    if (!yaEstaAdentro) {
                        await accessRepository.createAccess({
                            idSede: ev.sedeId,
                            idUserId: ev.usuarioId,
                            fechaEntrada: new Date(ev.fechaEvento)
                        });
                        resultados.procesados++;
                    }
                } else if (ev.tipoAccion === 'salida') {
                    const salida = await accessRepository.registrarSalida(
                        ev.usuarioId,
                        ev.sedeId,
                        ev.fechaEvento
                    );
                    if (salida) resultados.procesados++;
                }
            } catch (err) {
                resultados.errores++;
            }
        }

        return resultados;
    }
}

export default new AccessService();