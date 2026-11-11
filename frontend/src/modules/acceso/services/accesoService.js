import { httpClient } from '../../../core/api/httpClient.js';

const STORAGE_PADRON_KEY = 'fitzone_padron_offline';
const STORAGE_COLA_KEY = 'fitzone_cola_accesos_offline';
const STORAGE_ESTADO_SEDE_PREFIX = 'fitzone_estado_sede_';
const TIEMPO_EXPIRACION_QR_MS = 65 * 1000;

let promesaSincronizacion = null;

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

export const accesoService = {
    /**
     * Descarga y guarda en localStorage el padrón de socios para contingencia offline (RNF-01).
     */
    actualizarReplicaLocal: async () => {
        try {
            const response = await httpClient.get('/accesses/padron-offline');
            const payload = response?.data || response;
            if (payload && Array.isArray(payload.socios)) {
                localStorage.setItem(STORAGE_PADRON_KEY, JSON.stringify(payload));
                console.info(`✅ [Modo Offline] Padrón sincronizado (${payload.socios.length} socios).`);
            }
            return payload;
        } catch (error) {
            return JSON.parse(localStorage.getItem(STORAGE_PADRON_KEY) || 'null');
        }
    },

    /**
     * Valida un código QR localmente contra la réplica guardada en el terminal de sede (RNF-01).
     */
    validarEscaneoLocalOffline: (qrCode, sedeId) => {
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

        if (isNaN(timestamp) || antiguedadMs > TIEMPO_EXPIRACION_QR_MS || antiguedadMs < -10000) {
            throw new Error('Código QR expirado. Por favor, utilice el código actual en su pantalla.');
        }

        const padronData = JSON.parse(localStorage.getItem(STORAGE_PADRON_KEY) || '{"socios":[]}');
        const socioIndex = padronData.socios.findIndex(s => Number(s.id) === userId);

        if (socioIndex === -1) {
            throw new Error('Socio no encontrado en el padrón local de contingencia.');
        }

        const socio = padronData.socios[socioIndex];
        const estado = (socio.estado_suscripcion || '').toLowerCase().trim();
        if (estado !== 'activa' && estado !== 'activo') {
            throw new Error('Acceso denegado: El socio no posee una membresía activa.');
        }

        const tipoAccion = socio.esta_adentro ? 'salida' : 'ingreso';
        const fechaEvento = new Date().toISOString();
        const sedeIdNorm = Number(sedeId) || 1;

        // 1. Invertimos el estado en el padrón local
        padronData.socios[socioIndex].esta_adentro = !socio.esta_adentro;
        localStorage.setItem(STORAGE_PADRON_KEY, JSON.stringify(padronData));

        // 2. Guardamos el evento en la cola local
        const colaActual = JSON.parse(localStorage.getItem(STORAGE_COLA_KEY) || '[]');
        colaActual.push({
            idLocal: `OFF-${Date.now()}-${userId}`,
            usuarioId: socio.id,
            nombre: socio.nombre,
            sedeId: sedeIdNorm,
            tipoAccion,
            fechaEvento
        });
        localStorage.setItem(STORAGE_COLA_KEY, JSON.stringify(colaActual));

        // 3. Actualizamos el estado local de la sede en localStorage
        const keySede = `${STORAGE_ESTADO_SEDE_PREFIX}${sedeIdNorm}`;
        const estadoSedeLocal = JSON.parse(
            localStorage.getItem(keySede) || '{"aforoActual":0,"aforoMaximo":100,"ultimosMovimientos":[]}'
        );

        const aforoPrevio = Number(estadoSedeLocal.aforoActual) || 0;
        // Solo sumamos/restamos aforo si no es cliente externo (rol != 2)
        if (Number(socio.id_rol) !== 2) {
            estadoSedeLocal.aforoActual = tipoAccion === 'salida' 
                ? Math.max(0, aforoPrevio - 1) 
                : aforoPrevio + 1;
        }

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

        localStorage.setItem(keySede, JSON.stringify(estadoSedeLocal));

        console.info(`⚡ [Modo Offline] ${tipoAccion.toUpperCase()} validado localmente (${socio.nombre}). Aforo local: ${estadoSedeLocal.aforoActual}. Pendientes: ${colaActual.length}`);

        return {
            autorizado: true,
            modoOffline: true,
            tipoAccion,
            mensaje: `${tipoAccion === 'ingreso' ? 'Ingreso' : 'Salida'} exitoso (Modo Offline)`,
            usuarioId: socio.id,
            nombreSocio: socio.nombre,
            aforoActual: estadoSedeLocal.aforoActual,
            aforoMaximo: estadoSedeLocal.aforoMaximo || 100,
            ultimosMovimientos: estadoSedeLocal.ultimosMovimientos,
            horaIngreso: fechaEvento
        };
    },

    /**
     * Sincroniza la cola offline con el backend y espera a que termine antes de liberar la promesa.
     */
    sincronizarColaOffline: async () => {
        if (promesaSincronizacion) {
            return promesaSincronizacion;
        }

        const cola = JSON.parse(localStorage.getItem(STORAGE_COLA_KEY) || '[]');
        if (cola.length === 0) return { procesados: 0 };

        promesaSincronizacion = (async () => {
            try {
                const response = await httpClient.post('/accesses/sincronizar-offline', { eventos: cola });
                localStorage.removeItem(STORAGE_COLA_KEY);
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
     * Intenta escanear en el servidor; si da error de red, valida en modo offline directo.
     */
    registrarEscaneo: async (qrCode, sedeId) => {
        try {
            await accesoService.sincronizarColaOffline();

            const response = await httpClient.post('/accesses/scan', {
                qrCode,
                sedeId
            });
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
            const response = await httpClient.post('/accesses/externo', { 
                ...datosSocio, 
                sedeId 
            });
            return response.data;
        } catch (error) {
            const mensajeError = error.response?.data?.mensaje || error.message || 'Error al registrar el ingreso del cliente externo.';
            throw new Error(mensajeError);
        }
    },

    /**
     * Obtiene el estado de la sede en una secuencia estricta:
     * 1. Sincroniza cola offline (si hay).
     * 2. Pide estado actualizado a PostgreSQL.
     * 3. Actualiza el padrón local.
     * Si cualquiera falla por red, devuelve el estado local guardado en localStorage sin pisarlo.
     */
    obtenerEstadoSede: async (sedeId) => {
        const sedeIdNorm = Number(sedeId) || 1;
        const keySede = `${STORAGE_ESTADO_SEDE_PREFIX}${sedeIdNorm}`;
        try {
            // Paso 1: Si había accesos offline, obligamos a que terminen de insertarse en la BD
            await accesoService.sincronizarColaOffline();

            // Paso 2: Recién cuando terminó el paso 1, consultamos el aforo e historial en la BD
            const response = await httpClient.get(`/accesses/estado/${sedeIdNorm}`);
            const data = response?.data?.data || response?.data || response;

            // Solo guardamos en localStorage si la cola offline ya está vacía
            const colaRestante = JSON.parse(localStorage.getItem(STORAGE_COLA_KEY) || '[]');
            if (data && colaRestante.length === 0) {
                localStorage.setItem(keySede, JSON.stringify(data));
            }

            // Paso 3: Actualizamos el padrón offline con los nuevos estados de PostgreSQL
            await accesoService.actualizarReplicaLocal();

            return data;
        } catch (error) {
            const estadoRespaldo = localStorage.getItem(keySede);
            if (estadoRespaldo) {
                return JSON.parse(estadoRespaldo);
            }
            return { aforoActual: 0, aforoMaximo: 100, ultimosMovimientos: [] };
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
    }
};