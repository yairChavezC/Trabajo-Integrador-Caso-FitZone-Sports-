import * as reservaCanchaRepo from './reservaCanchaRepository.js';

/**
 * Valida disponibilidad y crea la reserva en estado 'pendiente'.
 */
export const crearReservaPendiente = async ({ idCancha, idUsuario, fechaInicio, fechaFin, monto }) => {
  // 1. Validar que la fecha de fin sea posterior a la de inicio
  if (new Date(fechaInicio) >= new Date(fechaFin)) {
    const error = new Error('La fecha/hora de inicio debe ser anterior a la de fin.');
    error.status = 400;
    throw error;
  }

  // 2. Control de concurrencia: asegurar que no haya un turno ya tomado
  const ocupado = await reservaCanchaRepo.existeSolapamiento(idCancha, fechaInicio, fechaFin);
  if (ocupado) {
    const error = new Error('El horario seleccionado ya se encuentra ocupado o reservado.');
    error.status = 409; // Conflicto
    throw error;
  }

  // 3. Persistir reserva con estado 'pendiente'
  return await reservaCanchaRepo.insertReserva({
    idCancha,
    idUsuario,
    fechaInicio,
    fechaFin,
    monto
  });
};

/**
 * Cambia el estado (confirmada tras pago aprobado o cancelada por compensación/rechazo).
 */
export const actualizarEstadoReserva = async (idReserva, nuevoEstado) => {
  const reservaActualizada = await reservaCanchaRepo.updateEstadoReserva(idReserva, nuevoEstado);
  
  if (!reservaActualizada) {
    const error = new Error(`No se encontró la reserva con ID ${idReserva}`);
    error.status = 404;
    throw error;
  }

  return reservaActualizada;
};