import accessRepository from '../repositories/accessRepository.js';

// Constantes de dominio (RF-04, RF-05 y Roles)
const TIEMPO_EXPIRACION_QR_MS = 65 * 1000; // 60 seg de rotación + 5 seg de tolerancia de red
const TOLERANCIA_DESFASE_RELOJ_MS = -10 * 1000;
const AFORO_MAXIMO_DEFAULT = 100;
const ROL_CLIENTE_EXTERNO = 2;
const ROL_SOCIO = 3;

/**
 * Patrón Strategy / Pipeline de Reglas de Admisión (OCP - Unidad III):
 * Cada regla encapsula una condición de negocio independiente para autorizar el ingreso.
 * Si mañana se agrega una regla nueva (ej. apto médico vigente), se añade a esta lista
 * sin modificar el flujo del molinete.
 */
const REGLAS_ADMISION_INGRESO = [
    {
        codigo: 'RF-02',
        evaluar: async ({ usuario, clock }) => {
            if (usuario.activo === false) {
                return 'Acceso denegado: El socio se encuentra suspendido o inactivo.';
            }

            const estado = (usuario.estado_suscripcion || '').toLowerCase().trim();
            if (estado !== 'activa' && estado !== 'activo') {
                return 'Acceso denegado: El socio no posee una membresía activa.';
            }

            if (usuario.fecha_proximo_vencimiento) {
                const vencimiento = new Date(usuario.fecha_proximo_vencimiento);
                vencimiento.setHours(23, 59, 59, 999);
                const ahora = typeof clock === 'function' ? clock() : Date.now();
                if (!isNaN(vencimiento.getTime()) && vencimiento.getTime() < ahora) {
                    return 'Acceso denegado: El socio no posee una membresía activa (cuota vencida).';
                }
            }

            return null;
        }
    },
    {
        codigo: 'RN-01',
        evaluar: async ({ usuario, estaAdentroPreviamente, repo }) => {
            const accesoActivo = estaAdentroPreviamente !== undefined
                ? estaAdentroPreviamente
                : await repo.checkAccesoActivoGlobal(usuario.id);

            if (accesoActivo) {
                return 'Acceso denegado: El socio ya registra un ingreso activo en una sucursal (RN-01).';
            }
            return null;
        }
    },
    {
        codigo: 'RF-05',
        evaluar: async ({ aforoPrevio, aforoMaximoSede }) => {
            if (aforoPrevio >= aforoMaximoSede) {
                return 'Acceso denegado: La sucursal ha alcanzado su capacidad máxima de aforo.';
            }
            return null;
        }
    }
];

export class AccessService {
    /**
     * Inyección de Dependencias por Constructor (Unidad II y V):
     * Permite inyectar dobles de prueba (Stubs/Mocks) para el repositorio, el reloj del sistema
     * y las reglas de admisión en los tests unitarios sin mutar el estado global.
     */
    constructor(
        repository = accessRepository,
        clock = () => Date.now(),
        reglasAdmision = REGLAS_ADMISION_INGRESO
    ) {
        this.repo = repository;
        this.clock = clock;
        this.reglasAdmision = reglasAdmision;
    }

    /**
     * RF-04: Valida que el código QR tenga el formato FITZONE-<id>-<timestamp>
     * y que se encuentre dentro de la ventana de vigencia de 60 segundos.
     */
    validarFormatoYVigenciaQR(qrCode) {
        if (!qrCode || typeof qrCode !== 'string') {
            return { valido: false, mensaje: 'El código QR es inválido.' };
        }

        const partes = qrCode.trim().split('-');
        if (partes.length < 3 || partes[0] !== 'FITZONE' || !partes[1]) {
            return { valido: false, mensaje: 'Formato de código QR no reconocido por FitZone.' };
        }

        const timestamp = Number(partes[2]);
        if (isNaN(timestamp)) {
            return { valido: false, mensaje: 'El código QR no contiene una marca de tiempo válida.' };
        }

        const antiguedadMs = this.clock() - timestamp;
        if (antiguedadMs > TIEMPO_EXPIRACION_QR_MS || antiguedadMs < TOLERANCIA_DESFASE_RELOJ_MS) {
            return { 
                valido: false, 
                mensaje: 'Código QR expirado. Por favor, utilice el código actual en su pantalla.' 
            };
        }

        return { valido: true, userId: partes[1], timestamp };
    }

    /**
     * Obtiene el cupo máximo de la sede aplicando el valor por defecto en la capa de dominio.
     */
    async _obtenerCupoMaximoSede(sedeId) {
        if (typeof this.repo.getCupoSede !== 'function') {
            return AFORO_MAXIMO_DEFAULT;
        }
        const cupoBd = await this.repo.getCupoSede(sedeId);
        return Number(cupoBd) > 0 ? Number(cupoBd) : AFORO_MAXIMO_DEFAULT;
    }

    /**
     * Busca al socio a partir del QR validado (usa findUserByQR o findUserById según disponibilidad).
     */
    async _buscarSocioPorQR(qrCode, userId) {
        if (typeof this.repo.findUserByQR === 'function') {
            return await this.repo.findUserByQR(qrCode);
        }
        if (typeof this.repo.findUserById === 'function') {
            return await this.repo.findUserById(Number(userId));
        }
        return null;
    }

    /**
     * Método maestro (Molinete Inteligente):
     * Valida el QR y consulta al socio una única vez, decidiendo si ejecuta ingreso o salida.
     */
    async procesarEscaneoMolinete(qrCode, sedeId) {
        try {
            const validacionQR = this.validarFormatoYVigenciaQR(qrCode);
            if (!validacionQR.valido) {
                return { autorizado: false, mensaje: validacionQR.mensaje };
            }

            const usuario = await this._buscarSocioPorQR(qrCode, validacionQR.userId);
            if (!usuario) {
                return { autorizado: false, mensaje: 'Socio no encontrado o QR inválido.' };
            }

            const estaAdentro = await this.repo.checkAccesoActivoGlobal(usuario.id);

            if (estaAdentro) {
                return await this._ejecutarSalida(usuario, sedeId);
            }
            return await this._ejecutarIngreso(usuario, sedeId, false);
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
                return { autorizado: false, mensaje: validacionQR.mensaje };
            }

            const usuario = await this._buscarSocioPorQR(qrCode, validacionQR.userId);
            if (!usuario) {
                return { autorizado: false, mensaje: 'Código QR inválido o socio inexistente.' };
            }

            return await this._ejecutarIngreso(usuario, sedeId);
        } catch (error) {
            return { autorizado: false, mensaje: error.message };
        }
    }

    /**
     * Ejecuta el pipeline de reglas de admisión (RF-02, RN-01, RF-05) y persiste la entrada.
     */
    async _ejecutarIngreso(usuario, sedeId, estaAdentroPreviamente = undefined) {
        const [aforoMaximoSede, aforoPrevio] = await Promise.all([
            this._obtenerCupoMaximoSede(sedeId),
            typeof this.repo.getAforoPorSede === 'function'
                ? this.repo.getAforoPorSede(sedeId)
                : Promise.resolve(0)
        ]);

        const contexto = {
            usuario,
            sedeId,
            estaAdentroPreviamente,
            aforoPrevio,
            aforoMaximoSede,
            repo: this.repo,
            clock: this.clock
        };

        for (const regla of this.reglasAdmision) {
            const motivoRechazo = await regla.evaluar(contexto);
            if (motivoRechazo) {
                return { autorizado: false, mensaje: motivoRechazo };
            }
        }

        const registro = await this.repo.createAccess({ idSede: sedeId, idUserId: usuario.id });

        const aforoActual = typeof this.repo.getAforoPorSede === 'function'
            ? await this.repo.getAforoPorSede(sedeId)
            : aforoPrevio + 1;

        return {
            autorizado: true,
            tipoAccion: 'ingreso',
            mensaje: 'Ingreso exitoso',
            usuarioId: usuario.id,
            aforoActual,
            aforoMaximo: aforoMaximoSede,
            horaIngreso: registro.fecha_entrada
        };
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

            const usuario = await this._buscarSocioPorQR(qrCode, validacionQR.userId);
            if (!usuario) {
                return { autorizado: false, mensaje: 'Código QR inválido.' };
            }

            return await this._ejecutarSalida(usuario, sedeId);
        } catch (error) {
            console.error("Error en procesarSalida:", error);
            return {
                autorizado: false,
                mensaje: "Error al procesar la salida: " + error.message
            };
        }
    }

    /**
     * Ejecuta el cierre de permanencia en la sede actual y libera aforo.
     */
    async _ejecutarSalida(usuario, sedeId) {
        const salida = await this.repo.registrarSalida(usuario.id, sedeId);

        if (!salida) {
            return {
                autorizado: false,
                mensaje: "El socio tiene un ingreso activo en otra sucursal distinta a esta."
            };
        }

        const [aforoActual, aforoMaximoSede] = await Promise.all([
            typeof this.repo.getAforoPorSede === 'function'
                ? this.repo.getAforoPorSede(sedeId)
                : Promise.resolve(0),
            this._obtenerCupoMaximoSede(sedeId)
        ]);

        return {
            autorizado: true,
            tipoAccion: 'salida',
            mensaje: "Salida registrada correctamente.",
            usuarioId: usuario.id,
            aforoActual,
            aforoMaximo: aforoMaximoSede,
            data: salida
        };
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
        if (typeof this.repo.findUserByDni === 'function') {
            usuarioBd = await this.repo.findUserByDni(dniLimpio);
        }

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
            if (typeof this.repo.createUserPublic === 'function') {
                usuarioBd = await this.repo.createUserPublic({
                    nombre: nombreLimpio,
                    dni: dniLimpio,
                    id_rol: ROL_CLIENTE_EXTERNO,
                    contacto: `externo.${dniLimpio}@fitzone.com`
                });
            }
        }

        const registro = await this.repo.createAccess({ 
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
        const [aforoActual, aforoMaximo, ultimosMovimientos] = await Promise.all([
            this.repo.getAforoPorSede(sedeId),
            this._obtenerCupoMaximoSede(sedeId),
            this.repo.getUltimosMovimientosPorSede(sedeId)
        ]);
        return { 
            aforoActual, 
            aforoMaximo, 
            ultimosMovimientos 
        };
    }

    /**
     * Obtiene el historial de accesos de un usuario específico.
     */
    async obtenerHistorialSocio(userId) {
        return await this.repo.getHistorialByUser(userId);
    }

    /**
     * RNF-01: Obtiene el padrón de socios para la réplica local del terminal de sede.
     */
    async obtenerPadronOffline() {
        const socios = await this.repo.getPadronOffline();
        return {
            fechaSincronizacion: new Date(this.clock()).toISOString(),
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
                    const yaEstaAdentro = await this.repo.checkAccesoActivoGlobal(ev.usuarioId);
                    if (!yaEstaAdentro) {
                        await this.repo.createAccess({
                            idSede: ev.sedeId,
                            idUserId: ev.usuarioId,
                            fechaEntrada: new Date(ev.fechaEvento)
                        });
                        resultados.procesados++;
                    }
                } else if (ev.tipoAccion === 'salida') {
                    const salida = this.repo.registrarSalida
    ? await this.repo.registrarSalida(ev.usuarioId, ev.sedeId, ev.fechaEvento)
    : null;
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