import {
  validarInvariantesNuevaReserva,
  validarTransicionReserva
} from '../domain/reservaCanchaDomain.js';

export const createReservaCanchaService = (
  reservaCanchaRepo,
  validarTransicion = validarTransicionReserva
) => {
  /**
   * Valida invariantes de dominio y delega la creación atómica con bloqueo pesimista.
   */
  const crearReservaPendiente = async ({ idCancha, idUsuario, fechaInicio, fechaFin, monto }) => {
    // 1. Delegar validación de invariantes al Dominio
    try {
      validarInvariantesNuevaReserva({ fechaInicio, fechaFin, monto });
    } catch (domainError) {
      domainError.status = 400;
      throw domainError;
    }

    // 2. Ejecutar inserción atómica con bloqueo pesimista (FOR UPDATE) y respaldo de constraint en BD
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
   * Cambia el estado validando primero mediante la máquina de estados del dominio (Patrón State).
   */
  const actualizarEstadoReserva = async (idReserva, nuevoEstado) => {
    const reservaActual = await reservaCanchaRepo.findReservaById(idReserva);

    if (!reservaActual) {
      const error = new Error(`No se encontró la reserva con ID ${idReserva}`);
      error.status = 404;
      throw error;
    }

    // Validar transición en el dominio y mapear a error HTTP si es ilegal
    try {
      validarTransicion(reservaActual.estado, nuevoEstado);
    } catch (domainError) {
      domainError.status = domainError.domainCode === 'TRANSICION_INVALIDA' ? 409 : 400;
      throw domainError;
    }

    return await reservaCanchaRepo.updateEstadoReserva(idReserva, nuevoEstado);
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