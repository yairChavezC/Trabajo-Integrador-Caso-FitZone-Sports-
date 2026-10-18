import { BusinessError } from '../errors.js';

export const HORAS_ANTICIPACION_RESERVA = 48;
export const HORAS_LIMITE_CANCELACION = 2;

const horasHastaInicio = (fechaInicio, ahora) => {
  const inicio = new Date(fechaInicio).getTime();
  if (Number.isNaN(inicio)) {
    throw new BusinessError('La fecha de inicio no es válida.', 400);
  }

  return (inicio - ahora) / (1000 * 60 * 60);
};

export const validarVentanaReserva = (fechaInicio, ahora = Date.now()) => {
  if (horasHastaInicio(fechaInicio, ahora) < HORAS_ANTICIPACION_RESERVA) {
    throw new BusinessError(
      `La reserva requiere al menos ${HORAS_ANTICIPACION_RESERVA} horas de anticipación.`,
      409
    );
  }
};

export const validarVentanaCancelacion = (fechaInicio, ahora = Date.now()) => {
  if (horasHastaInicio(fechaInicio, ahora) < HORAS_LIMITE_CANCELACION) {
    throw new BusinessError(
      `Solo se puede cancelar hasta ${HORAS_LIMITE_CANCELACION} horas antes del inicio.`,
      409
    );
  }
};

export const validarCapacidadParaReserva = (cupo, confirmados) => {
  if (confirmados >= cupo) {
    throw new BusinessError(
      'La clase está completa. Podés anotarte en lista de espera.',
      409
    );
  }
};

export const validarCapacidadParaListaEspera = (cupo, confirmados) => {
  if (confirmados < cupo) {
    throw new BusinessError('Todavía hay cupos. Reservá un lugar confirmado.', 409);
  }
};

export const validarReduccionDeCupo = (cupo, confirmados) => {
  if (cupo < confirmados) {
    throw new BusinessError(
      `No se puede reducir el cupo por debajo de las ${confirmados} reservas confirmadas.`,
      409
    );
  }
};
