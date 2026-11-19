import { httpClient } from '../../../core/api/httpClient.js';

const STORAGE_PADRON_KEY = 'fitzone_padron_offline';
const STORAGE_COLA_KEY = 'fitzone_cola_accesos_offline';
const STORAGE_SEDES_KEY = 'fitzone_sedes_offline';
const STORAGE_USUARIO_KEY = 'usuario';
const STORAGE_ESTADO_SEDE_PREFIX = 'fitzone_estado_sede_';
const TIEMPO_EXPIRACION_QR_MS = 65 * 1000;
const TOLERANCIA_DESFASE_MS = -10 * 1000;
const ROL_CLIENTE_EXTERNO = 2;

let promesaSincronizacion = null;

/**
 * Patrón Adapter (Unidad III / ADR-006):
 * Encapsula la API de almacenamiento del navegador (localStorage).
 * Si en el futuro se migra la persistencia local a IndexedDB, solo cambia este adaptador.
 */
const offlineStorageAdapter = {
    obtenerPadron() {
        return JSON.parse(localStorage.getItem(STORAGE_PADRON_KEY) || '{"socios":[]}');
    },
    guardarPadron(padron) {
        localStorage.setItem(STORAGE_PADRON_KEY, JSON.stringify(padron));
    },
    obtenerCola() {
        return JSON.parse(localStorage.getItem(STORAGE_COLA_KEY) || '[]');
    },
    guardarCola(cola) {
        localStorage.setItem(STORAGE_COLA_KEY, JSON.stringify(cola));
    },
    limpiarCola() {
        localStorage.removeItem(STORAGE_COLA_KEY);
    },
    obtenerEstadoSede(sedeId) {
        const raw = localStorage.getItem(`${STORAGE_ESTADO_SEDE_PREFIX}${sedeId}`);
        return raw ? JSON.parse(raw) : { aforoActual: 0, aforoMaximo: 100, ultimosMovimientos: [] };
    },
    guardarEstadoSede(sedeId, estado) {
        localStorage.setItem(`${STORAGE_ESTADO_SEDE_PREFIX}${sedeId}`, JSON.stringify(estado));
    },
    obtenerCupoCatalogoSede(sedeId, fallback = 100) {
        const sedes = JSON.parse(localStorage.getItem(STORAGE_SEDES_KEY) || '[]');
        const sede = sedes.find(s => Number(s.id) === Number(sedeId));
        return Number(sede?.cupo) || Number(fallback) || 100;
    },
    obtenerUsuarioSesion() {
        return JSON.parse(localStorage.getItem(STORAGE_USUARIO_KEY) || '{}');
    }
};

const esErrorDeRed = (error) => {
    const msg = error?.message || '';
    return (
        !navigator.onLine ||
        msg.includes('No se pudo conectar') ||
        msg.includes('Error en la petición') ||
        msg.includes('502') ||
        msg.includes('503') ||
        msg.includes('Network Error')
    );
};

const parsearYValidarQR = (qrCode) => {
    if (!qrCode || typeof qrCode !== 'string') {
        throw new Error('El código QR es inválido.');
    }
    const partes = qrCode.trim().split('-');
    if (partes.length < 3 || partes[0] !== 'FITZONE') {
        throw new Error('Formato de código QR no reconocido por FitZone.');
    }
    const userId = Number(partes[1]);
    const timestamp = Number(partes[2]);
    const antiguedadMs = Date.now() - timestamp;

    if (isNaN(timestamp) || antiguedadMs > TIEMPO_EXPIRACION_QR_MS || antiguedadMs < TOLERANCIA_DESFASE_MS) {
        throw new Error('Código QR expirado. Por favor, utilice el código actual en su pantalla.');
    }
    return { userId, timestamp };
};

export const accesoService = {
    obtenerUsuarioActual: () => {
        return offlineStorageAdapter.obtenerUsuarioSesion();
    },

    /**
     * Descarga y guarda en localStorage el padrón de socios para contingencia offline (RNF-01).
     */
    actualizarReplicaLocal: async () => {
        try {
            const response = await httpClient.get('/accesses/padron-offline');
            const payload = response?.data || response;
            if (payload && Array.isArray(payload.socios)) {
                offlineStorageAdapter.guardarPadron(payload);
                console.info(`✅ [Modo Offline] Padrón sincronizado (${payload.socios.length} socios).`);
            }
            return payload;
        } catch (error) {
            return offlineStorageAdapter.obtenerPadron();
        }
    },

    /**
     * Valida un código QR localmente contra la réplica guardada en el terminal de sede (RNF-01 / ADR-006).
     */
    validarEscaneoLocalOffline: (qrCode, sedeId) => {
        const { userId } = parsearYValidarQR(qrCode);

        const padronData = offlineStorageAdapter.obtenerPadron();
        const socioIndex = padronData.socios.findIndex(s => Number(s.id) === userId);
        if (socioIndex === -1) {
            throw new Error('Socio no encontrado en el padrón local de contingencia.');
        }

        const socio = padronData.socios[socioIndex];
        const estado = (socio.estado_suscripcion || '').toLowerCase().trim();
        if (estado !== 'activa' && estado !== 'activo') {
            throw new Error('Acceso denegado: El socio no posee una membresía activa.');
        }

        const sedeIdNorm = Number(sedeId) || 1;

        if (socio.esta_adentro && socio.id_sede_activa && Number(socio.id_sede_activa) !== sedeIdNorm) {
            throw new Error('Acceso denegado: El socio ya registra un ingreso activo en otra sucursal (RN-01).');
        }

        const tipoAccion = socio.esta_adentro ? 'salida' : 'ingreso';
        const fechaEvento = new Date().toISOString();

        const estadoSedeLocal = offlineStorageAdapter.obtenerEstadoSede(sedeIdNorm);
        const cupoMaximoSede = offlineStorageAdapter.obtenerCupoCatalogoSede(sedeIdNorm, estadoSedeLocal.aforoMaximo);
        const aforoPrevio = Number(estadoSedeLocal.aforoActual) || 0;

        if (tipoAccion === 'ingreso' && Number(socio.id_rol) !== ROL_CLIENTE_EXTERNO && aforoPrevio >= cupoMaximoSede) {
            throw new Error('Acceso denegado: La sucursal ha alcanzado su capacidad máxima de aforo.');
        }

        padronData.socios[socioIndex].esta_adentro = !socio.esta_adentro;
        padronData.socios[socioIndex].id_sede_activa = tipoAccion === 'ingreso' ? sedeIdNorm : null;
        offlineStorageAdapter.guardarPadron(padronData);

        const colaActual = offlineStorageAdapter.obtenerCola();
        colaActual.push({
            idLocal: `OFF-${Date.now()}-${userId}`,
            usuarioId: socio.id,
            nombre: socio.nombre,
            sedeId: sedeIdNorm,
            tipoAccion,
            fechaEvento
        });
        offlineStorageAdapter.guardarCola(colaActual);

        if (Number(socio.id_rol) !== ROL_CLIENTE_EXTERNO) {
            estadoSedeLocal.aforoActual = tipoAccion === 'salida' 
                ? Math.max(0, aforoPrevio - 1) 
                : aforoPrevio + 1;
        }
        estadoSedeLocal.aforoMaximo = cupoMaximoSede;

        const nuevoMov = {
            id: `OFF-MOV-${Date.now()}`,
            id_usuario: socio.id,
            nombre: socio.nombre,
            fecha_entrada: fechaEvento,
            fecha_salida: tipoAccion === 'salida' ? fechaEvento : null
        };
        estadoSedeLocal.ultimosMovimientos = [
            nuevoMov, 
            ...(Array.isArray(estadoSedeLocal.ultimosMovimientos) ? estadoSedeLocal.ultimosMovimientos : [])
        ].slice(0, 5);

        offlineStorageAdapter.guardarEstadoSede(sedeIdNorm, estadoSedeLocal);

        return {
            autorizado: true,
            modoOffline: true,
            tipoAccion,
            mensaje: `${tipoAccion === 'ingreso' ? 'Ingreso' : 'Salida'} exitoso (Modo Offline)`,
            usuarioId: socio.id,
            nombreSocio: socio.nombre,
            aforoActual: estadoSedeLocal.aforoActual,
            aforoMaximo: cupoMaximoSede,
            ultimosMovimientos: estadoSedeLocal.ultimosMovimientos,
            horaIngreso: fechaEvento
        };
    },

    /**
     * Sincroniza la cola offline con el backend con cerrojo de concurrencia (ADR-007).
     */
    sincronizarColaOffline: async () => {
        if (promesaSincronizacion) {
            return promesaSincronizacion;
        }

        const cola = offlineStorageAdapter.obtenerCola();
        if (cola.length === 0) return { procesados: 0 };

        promesaSincronizacion = (async () => {
            try {
                const response = await httpClient.post('/accesses/sincronizar-offline', { eventos: cola });
                offlineStorageAdapter.limpiarCola();
                console.info(`🔄 [Modo Offline] ${cola.length} accesos offline sincronizados con la base de datos.`);
                return response?.data || response;
            } finally {
                promesaSincronizacion = null;
            }
        })();

        return promesaSincronizacion;
    },

    registrarIngreso: async (qrCode, sedeId) => {
        try {
            const response = await httpClient.post('/accesses/ingreso', { qrCode, sedeId });
            return response.data;
        } catch (error) {
            const mensajeError = error.response?.data?.mensaje || error.message || 'Error al procesar el ingreso.';
            throw new Error(mensajeError);
        }
    },

    registrarEscaneo: async (qrCode, sedeId) => {
        try {
            await accesoService.sincronizarColaOffline();
            const response = await httpClient.post('/accesses/scan', { qrCode, sedeId });
            return response.data;
        } catch (error) {
            if (esErrorDeRed(error)) {
                return accesoService.validarEscaneoLocalOffline(qrCode, sedeId);
            }
            const mensajeError = error.response?.data?.mensaje || error.message || 'Error al procesar el escaneo.';
            throw new Error(mensajeError);
        }
    },

    registrarIngresoExterno: async (datosSocio, sedeId) => {
        try {
            const response = await httpClient.post('/accesses/externo', { ...datosSocio, sedeId });
            return response.data;
        } catch (error) {
            const mensajeError = error.response?.data?.mensaje || error.message || 'Error al registrar el ingreso del cliente externo.';
            throw new Error(mensajeError);
        }
    },

    obtenerEstadoSede: async (sedeId) => {
        const sedeIdNorm = Number(sedeId) || 1;
        try {
            await accesoService.sincronizarColaOffline();

            const response = await httpClient.get(`/accesses/estado/${sedeIdNorm}`);
            const data = response?.data?.data || response?.data || response;

            const colaRestante = offlineStorageAdapter.obtenerCola();
            if (data && colaRestante.length === 0) {
                offlineStorageAdapter.guardarEstadoSede(sedeIdNorm, data);
            }

            await accesoService.actualizarReplicaLocal();
            return data;
        } catch (error) {
            return offlineStorageAdapter.obtenerEstadoSede(sedeIdNorm);
        }
    },

    obtenerMiHistorial: async () => {
        try {
            const response = await httpClient.get('/accesses/me/historial');
            return response?.data?.data || response?.data || [];
        } catch (error) {
            const mensajeError = error.response?.data?.mensaje || error.message || 'Error al obtener el historial de accesos.';
            throw new Error(mensajeError);
        }
    },

    obtenerMisReservasCanchas: async () => {
        try {
            const response = await httpClient.get('/reservas-canchas/mis-reservas');
            const lista = Array.isArray(response)
                ? response
                : response?.data?.data || response?.data || [];
            return Array.isArray(lista) ? lista.slice(0, 5) : [];
        } catch (error) {
            return [];
        }
    },

    obtenerMisInscripcionesClases: async () => {
        try {
            const resClases = await httpClient.get('/clases');

            const catalogoClases = Array.isArray(resClases)
                ? resClases
                : resClases?.data?.data || resClases?.data || [];

            const desdeCatalogo = Array.isArray(catalogoClases)
                ? catalogoClases
                    .filter((c) => Boolean(c.miInscripcion))
                    .map((c) => ({
                        idInscripcion: c.miInscripcion.id,
                        idClase: c.id,
                        nombreClase: c.nombre,
                        instructor: c.profesor,
                        sede: c.sede,
                        fechaInicio: c.fechaInicio,
                        fechaFin: c.fechaFin,
                        estado: c.miInscripcion.estado
                    }))
                : [];

            return desdeCatalogo.slice(0, 5);
        } catch (error) {
            return [];
        }
    }
}