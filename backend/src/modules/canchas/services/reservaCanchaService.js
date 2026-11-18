export const createReservaCanchaService = (reservaCanchaRepo) => {
  /**
   * Valida reglas de negocio y delega la creación atómica con bloqueo pesimista.
   */
  const crearReservaPendiente = async ({ idCancha, idUsuario, fechaInicio, fechaFin, monto }) => {
    // 1. Validar que la fecha de fin sea posterior a la de inicio
    if (new Date(fechaInicio) >= new Date(fechaFin)) {
      const error = new Error('La fecha/hora de inicio debe ser anterior a la de fin.');
      error.status = 400;
      throw error;
    }

    // 2. Ejecutar inserción con bloqueo pesimista (FOR UPDATE) y respaldo de constraint en BD
    try {
      return await reservaCanchaRepo.insertReservaConBloqueoPesimista({
        idCancha,
        idUsuario,
        fechaInicio,
        fechaFin,
        monto
      });
    } catch (error) {
      if (error.status) {
        throw error;
      }
      if (error.code === '23505' || error.code === '23P01') {
        const conflictError = new Error('El horario seleccionado ya se encuentra ocupado o reservado.');
        conflictError.status = 409;
        throw conflictError;
      }
      throw error;
    }
  };

  /**
   * Cambia el estado (confirmada tras pago aprobado o cancelada por compensación/rechazo).
   */
  const actualizarEstadoReserva = async (idReserva, nuevoEstado) => {
    const reservaActualizada = await reservaCanchaRepo.updateEstadoReserva(idReserva, nuevoEstado);

    if (!reservaActualizada) {
      const error = new Error(`No se encontró la reserva con ID ${idReserva}`);
      error.status = 404;
      throw error;
    }

    return reservaActualizada;
  };

  const obtenerReservasPorUsuario = async (idUsuario) => {
    if (!idUsuario || isNaN(Number(idUsuario))) {
      const error = new Error('El ID de usuario proporcionado no es válido.');
      error.status = 400;
      throw error;
    }

    return await reservaCanchaRepo.findReservasByUsuario(Number(idUsuario));
  };

  return {
    crearReservaPendiente,
    actualizarEstadoReserva,
    obtenerReservasPorUsuario
  };
};