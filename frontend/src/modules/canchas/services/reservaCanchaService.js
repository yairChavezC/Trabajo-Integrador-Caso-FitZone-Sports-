import { httpClient } from '../../../core/api/httpClient';

export const obtenerDisponibilidadCanchas = async ({ idSede, fecha }) => {
  const respuesta = await httpClient.get('canchas/disponibilidad', {
    params: {
      idSede,
      fecha,
    },
  });

  return respuesta;
};

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

  return respuesta;
};