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

            // RF-05: Obtenemos el cupo real de la sede y validamos disponibilidad de aforo
            const aforoMaximoSede = typeof accessRepository.getCupoSede === 'function'
                ? await accessRepository.getCupoSede(sedeId)
                : AFORO_MAXIMO_DEFAULT;

            let aforoPrevio = 0;
            if (typeof accessRepository.getAforoPorSede === 'function') {
                aforoPrevio = await accessRepository.getAforoPorSede(sedeId);
                if (aforoPrevio >= aforoMaximoSede) {
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
                aforoMaximo: aforoMaximoSede,
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

            const aforoMaximoSede = typeof accessRepository.getCupoSede === 'function'
                ? await accessRepository.getCupoSede(sedeId)
                : AFORO_MAXIMO_DEFAULT;

            return {
                autorizado: true,
                tipoAccion: 'salida',
                mensaje: "Salida registrada correctamente.",
                usuarioId: usuario.id,
                aforoActual: aforoActual,
                aforoMaximo: aforoMaximoSede,
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
     * Registra el acceso en puerta de un Cliente Externo (id_rol = 2):
     * - Si el DNI pertenece a un Socio (id_rol = 3) o Personal (1, 4), bloquea la carga manual y exige QR.
     * - Si el DNI ya existe como Cliente Externo (id_rol = 2), reutiliza su cuenta existente sin duplicarla.
     * - Si el DNI no existe, crea la cuenta con id_rol = 2 y registra el acceso (sin sumar al aforo de socios).
     */
    async registrarIngresoExterno({ nombre, dni, sedeId }) {
        const dniLimpio = String(dni || '').trim();
        const nombreLimpio = String(nombre || '').trim();

        if (!dniLimpio || !nombreLimpio) {
            const err = new Error('El nombre y el DNI son obligatorios.');
            err.statusCode = 400;
            throw err;
        }

        let usuarioBd = null;
        if (typeof accessRepository.findUserByDni === 'function') {
            usuarioBd = await accessRepository.findUserByDni(dniLimpio);
        }

        const ROL_CLIENTE_EXTERNO = 2;
        const ROL_SOCIO = 3;
        let yaEstabaRegistrado = false;

        if (usuarioBd) {
            const rolUsuario = Number(usuarioBd.id_rol);

            // 1. Si el DNI es de un SOCIO (id_rol = 3), prohibimos que entre como externo sin QR
            if (rolUsuario === ROL_SOCIO) {
                const err = new Error(
                    `Acceso denegado por esta vía: El DNI ${dniLimpio} pertenece al socio registrado "${usuarioBd.nombre}". Debe validar su ingreso escaneando su código QR dinámico.`
                );
                err.statusCode = 400;
                throw err;
            }

            // 2. Si el DNI es de personal del gimnasio (Recepcionista = 1 o Gerente = 4)
            if (rolUsuario !== ROL_CLIENTE_EXTERNO) {
                const err = new Error(
                    `El DNI ${dniLimpio} pertenece a un usuario interno del sistema (${usuarioBd.nombre}) y no a un cliente externo.`
                );
                err.statusCode = 400;
                throw err;
            }

            // 3. Si es id_rol === 2, es un Cliente Externo que ya tenía cuenta creada: la reutilizamos
            yaEstabaRegistrado = true;
        } else {
            // 4. Si no existe en la BD, lo creamos como Cliente Externo (id_rol = 2)
            if (typeof accessRepository.createUserPublic === 'function') {
                usuarioBd = await accessRepository.createUserPublic({
                    nombre: nombreLimpio,
                    dni: dniLimpio,
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
            yaEstabaRegistrado,
            mensaje: yaEstabaRegistrado
                ? `Ingreso registrado para el cliente externo existente: ${usuarioBd.nombre} (DNI ${usuarioBd.dni}).`
                : `Nuevo cliente externo ${usuarioBd.nombre} dado de alta e ingresado con éxito.`,
            usuario: {
                id: usuarioBd.id,
                nombre: usuarioBd.nombre,
                dni: usuarioBd.dni,
                rol: 'cliente_externo'
            },
            acceso: registro
        };
    }
/**
     * Obtiene el aforo actual, el aforo máximo real (cupo) y los últimos movimientos de una sede.
     */
    async obtenerEstadoSede(sedeId) {
        try {
            const [aforoActual, aforoMaximo, ultimosMovimientos] = await Promise.all([
                accessRepository.getAforoPorSede(sedeId),
                typeof accessRepository.getCupoSede === 'function'
                    ? accessRepository.getCupoSede(sedeId)
                    : Promise.resolve(AFORO_MAXIMO_DEFAULT),
                accessRepository.getUltimosMovimientosPorSede(sedeId)
            ]);
            return { 
                aforoActual, 
                aforoMaximo, 
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