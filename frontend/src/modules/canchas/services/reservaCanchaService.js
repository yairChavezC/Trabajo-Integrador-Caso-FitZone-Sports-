import { httpClient } from '../../../core/api/httpClient';
import { adaptarListaCanchas } from '../adapters/canchaAdapter';

// 1. Componente base: consulta la API y adapta la respuesta
const obtenerDisponibilidadBase = async ({ idSede, fecha }) => {
  const respuesta = await httpClient.get('canchas/disponibilidad', {
    params: { idSede, fecha },
  });

  if (respuesta && respuesta.success) {
    return {
      ...respuesta,
      data: adaptarListaCanchas(respuesta.data || [], fecha),
    };
  }

  return respuesta;
};

// 2. Patrón Decorator: agrega caché en memoria manteniendo exactamente la misma interfaz
const crearDecoradorCache = (servicioBase, ttlMs = 60_000) => {
  const cache = new Map();

  const obtener = async ({ idSede, fecha, forzarRecarga = false }) => {
    const clave = `${idSede}:${fecha}`;
    const entrada = cache.get(clave);
    const ahora = Date.now();

    if (!forzarRecarga && entrada && ahora - entrada.timestamp < ttlMs) {
      return entrada.valor;
    }

    const resultado = await servicioBase({ idSede, fecha });
    if (resultado && resultado.success) {
      cache.set(clave, { valor: resultado, timestamp: Date.now() });
    }
    return resultado;
  };

  obtener.invalidar = (idSede, fecha) => {
    if (idSede && fecha) {
      cache.delete(`${idSede}:${fecha}`);
    } else {
      cache.clear();
    }
  };

  return obtener;
};

// Exportamos el servicio decorado con la misma firma original
export const obtenerDisponibilidadCanchas = crearDecoradorCache(obtenerDisponibilidadBase);

export const procesarCheckoutReserva = async ({
  idCancha,
  fechaInicio,
  fechaFin,
  monto,
  metodoPago = 'TARJETA',
}) => {
  const respuesta = await httpClient.post('/reservas-canchas/checkout', {
    idCancha,
    fechaInicio,
    fechaFin,
    monto,
    metodoPago,
  });

  // Al reservar, invalidamos la caché para que el próximo render refleje el turno ocupado
  obtenerDisponibilidadCanchas.invalidar();

  return respuesta;
};