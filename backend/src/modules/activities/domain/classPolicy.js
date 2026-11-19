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
  const horasRestantes = horasHastaInicio(fechaInicio, ahora);
  if (horasRestantes > HORAS_ANTICIPACION_RESERVA || horasRestantes <= 0) {
    throw new BusinessError(
      `La reserva se habilita durante las ${HORAS_ANTICIPACION_RESERVA} horas previas al inicio de la clase.`,
      409
    );
  }
};

export const validarVentanaListaEspera = (fechaInicio, ahora = Date.now()) => {
  if (horasHastaInicio(fechaInicio, ahora) <= 0) {
    throw new BusinessError('La lista de espera se cierra cuando comienza la clase.', 409);
  }
};

export const validarVentanaCancelacion = (fechaInicio, ahora = Date.now()) => {
  const horasRestantes = horasHastaInicio(fechaInicio, ahora);
  if (horasRestantes <= 0) {
    throw new BusinessError(
      'No se puede cancelar una inscripción después de que comienza la clase.',
      409
    );
  }
};

/**
 * Devuelve true si la cancelación es tardía: menos de 2 horas antes del inicio
 * pero la clase aún no comenzó.
 */
export const esCancelacionTardia = (fechaInicio, ahora = Date.now()) => {
  const horasRestantes = horasHastaInicio(fechaInicio, ahora);
  return horasRestantes > 0 && horasRestantes < HORAS_LIMITE_CANCELACION;
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

export const validarInicioFuturo = (fechaInicio, ahora = Date.now()) => {
  const inicio = new Date(fechaInicio).getTime();
  if (Number.isNaN(inicio)) {
    throw new BusinessError('La fecha de inicio no es válida.', 400);
  }
  if (inicio <= ahora) {
    throw new BusinessError('La fecha de inicio debe estar en el futuro.', 400);
  }
};

export const calcularAccionesClase = (clase, ahora = Date.now()) => {
  const horasRestantes = horasHastaInicio(clase.fechaInicio, ahora);
  const miInscripcion = clase.miInscripcion;

  return {
    ...clase,
    puedeReservar:
      !miInscripcion &&
      horasRestantes > 0 &&
      horasRestantes <= HORAS_ANTICIPACION_RESERVA &&
      Number(clase.cupoDisponible) > 0,
    puedeAnotarseListaEspera:
      !miInscripcion &&
      horasRestantes > 0 &&
      Number(clase.cupoDisponible) <= 0,
    puedeAceptarOferta: Boolean(
      miInscripcion?.estado === 'notificado' &&
      horasRestantes > 0 &&
      new Date(miInscripcion.fechaExpiracionOferta).getTime() > ahora
    ),
    puedeCancelar: Boolean(
      miInscripcion &&
      horasRestantes > 0
    )
  };
};
