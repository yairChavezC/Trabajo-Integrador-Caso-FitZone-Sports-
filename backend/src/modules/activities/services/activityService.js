import {
  findAllActivities,
  findActivityById,
  createActivity as createActivityInRepo,
  updateActivity as updateActivityInRepo,
  deleteActivity as deleteActivityInRepo
} from '../repositories/activityRepository.js';
import {
  withTransaction,
  countOccupied,
  countWaitlist,
  findActiveByUserAndClass,
  insertInscription,
  cancelInscription,
  findNextWaitlist,
  notifyWaitlistInscription,
  confirmOfferedInscription,
  listByClass
} from '../repositories/inscriptionRepository.js';
import { classWaitlistSubject } from '../observers/waitlistObserver.js';
import { BusinessError } from '../errors.js';
import { ESTADOS_INSCRIPCION, getInscriptionState } from '../domain/inscriptionState.js';

const HORAS_ANTICIPACION_RESERVA = 48;
const HORAS_LIMITE_CANCELACION = 2;

const horasHastaInicio = (fechaInicio) => {
  const inicio = new Date(fechaInicio);
  return (inicio.getTime() - Date.now()) / (1000 * 60 * 60);
};

const enriquecerClase = async (clase, idUsuario) => {
  if (!clase) return clase;

  const ocupados = await countOccupied(clase.id);
  const enEspera = await countWaitlist(clase.id);
  const miInscripcion = idUsuario
    ? await findActiveByUserAndClass(clase.id, idUsuario)
    : null;

  return {
    ...clase,
    cupoDisponible: Math.max(clase.cupo - ocupados, 0),
    inscriptosConfirmados: ocupados,
    enListaEspera: enEspera,
    miInscripcion: miInscripcion ?? null
  };
};

export const getAllActivities = async (idUsuario = null) => {
  try {
    const clases = await findAllActivities();
    return Promise.all(clases.map((clase) => enriquecerClase(clase, idUsuario)));
  } catch (error) {
    console.error('Error en activityService.getAllActivities:', error);
    throw error;
  }
};

export const getActivityById = async (id, idUsuario = null) => {
  try {
    if (!id) {
      throw new Error('El ID de la clase es obligatorio.');
    }

    const clase = await findActivityById(id);
    return enriquecerClase(clase, idUsuario);
  } catch (error) {
    console.error('Error en activityService.getActivityById:', error);
    throw error;
  }
};

export const createActivity = async (dto) => {
  try {
    if (!dto) {
      throw new Error('El DTO es obligatorio.');
    }

    return await createActivityInRepo(dto);
  } catch (error) {
    console.error('Error en activityService.createActivity:', error);
    throw error;
  }
};

export const updateActivity = async (id, dto) => {
  try {
    if (!id) {
      throw new Error('El ID de la clase es obligatorio.');
    }

    if (!dto) {
      throw new Error('El DTO es obligatorio.');
    }

    return await updateActivityInRepo(id, dto);
  } catch (error) {
    console.error('Error en activityService.updateActivity:', error);
    throw error;
  }
};

export const deleteActivity = async (id) => {
  try {
    if (!id) {
      throw new Error('El ID de la clase es obligatorio.');
    }

    return await deleteActivityInRepo(id);
  } catch (error) {
    console.error('Error en activityService.deleteActivity:', error);
    throw error;
  }
};

export const getInscriptionsByClass = async (idClase) => {
  const clase = await findActivityById(idClase);
  if (!clase) {
    throw new BusinessError('Clase no encontrada.', 404);
  }
  return listByClass(idClase);
};

export const reserveClass = async (idClase, idUsuario) => {
  if (!idUsuario) {
    throw new BusinessError('El usuario autenticado es obligatorio.', 401);
  }

  return withTransaction(async (client) => {
    const clase = await findActivityById(idClase);
    if (!clase) {
      throw new BusinessError('Clase no encontrada.', 404);
    }

    const horas = horasHastaInicio(clase.fechaInicio);
    if (horas < HORAS_ANTICIPACION_RESERVA) {
      throw new BusinessError(
        `La reserva requiere al menos ${HORAS_ANTICIPACION_RESERVA} horas de anticipación.`
      );
    }

    const activa = await findActiveByUserAndClass(idClase, idUsuario, client);
    if (activa) {
      throw new BusinessError(`Ya tenés una inscripción ${activa.estado} en esta clase.`);
    }

    const ocupados = await countOccupied(idClase, client);
    if (ocupados >= clase.cupo) {
      throw new BusinessError(
        'La clase está completa. Podés anotarte en lista de espera.',
        409
      );
    }

    return insertInscription(
      { idClase, idUsuario, estado: ESTADOS_INSCRIPCION.CONFIRMADO },
      client
    );
  });
};

export const joinWaitlist = async (idClase, idUsuario) => {
  if (!idUsuario) {
    throw new BusinessError('El usuario autenticado es obligatorio.', 401);
  }

  return withTransaction(async (client) => {
    const clase = await findActivityById(idClase);
    if (!clase) {
      throw new BusinessError('Clase no encontrada.', 404);
    }

    const horas = horasHastaInicio(clase.fechaInicio);
    if (horas < HORAS_ANTICIPACION_RESERVA) {
      throw new BusinessError(
        `La lista de espera requiere al menos ${HORAS_ANTICIPACION_RESERVA} horas de anticipación.`
      );
    }

    const activa = await findActiveByUserAndClass(idClase, idUsuario, client);
    if (activa) {
      throw new BusinessError(`Ya tenés una inscripción ${activa.estado} en esta clase.`);
    }

    const ocupados = await countOccupied(idClase, client);
    if (ocupados < clase.cupo) {
      throw new BusinessError('Todavía hay cupos. Reservá un lugar confirmado.');
    }

    return insertInscription(
      { idClase, idUsuario, estado: ESTADOS_INSCRIPCION.EN_ESPERA },
      client
    );
  });
};

export const cancelClassReservation = async (idClase, idUsuario) => {
  if (!idUsuario) {
    throw new BusinessError('El usuario autenticado es obligatorio.', 401);
  }

  const resultado = await withTransaction(async (client) => {
    const clase = await findActivityById(idClase);
    if (!clase) {
      throw new BusinessError('Clase no encontrada.', 404);
    }

    const horas = horasHastaInicio(clase.fechaInicio);
    if (horas < HORAS_LIMITE_CANCELACION) {
      throw new BusinessError(
        `Solo se puede cancelar hasta ${HORAS_LIMITE_CANCELACION} horas antes del inicio.`
      );
    }

    const activa = await findActiveByUserAndClass(idClase, idUsuario, client);
    if (!activa) {
      throw new BusinessError('No tenés una inscripción activa en esta clase.', 404);
    }

    const estadoActual = getInscriptionState(activa.estado);
    if (!estadoActual.puedeCancelar) {
      throw new BusinessError('Esta inscripción no se puede cancelar.');
    }

    const cancelada = await cancelInscription(activa.id, client);
    let notificada = null;

    if (estadoActual.avisaListaEsperaAlSalir) {
      const siguiente = await findNextWaitlist(idClase, client);
      if (siguiente) {
        notificada = await notifyWaitlistInscription(siguiente.id, client);
      }
    }

    return { cancelada, notificada, idClase };
  });

  if (resultado.notificada) {
    await classWaitlistSubject.notify({
      idClase: resultado.idClase,
      idUsuario: resultado.notificada.idUsuario,
      idInscripcion: resultado.notificada.id,
      motivo: 'baja_de_cupo'
    });
  }

  return resultado;
};

export const confirmWaitlistOffer = async (idClase, idUsuario) => {
  if (!idUsuario) {
    throw new BusinessError('El usuario autenticado es obligatorio.', 401);
  }

  return withTransaction(async (client) => {
    const activa = await findActiveByUserAndClass(idClase, idUsuario, client);
    if (!activa) {
      throw new BusinessError('No tenés una oferta pendiente en esta clase.', 404);
    }

    const estadoActual = getInscriptionState(activa.estado);
    if (!estadoActual.puedeConfirmarOferta) {
      throw new BusinessError('No hay un cupo liberado para confirmar.');
    }

    return confirmOfferedInscription(activa.id, client);
  });
};

export const rejectWaitlistOffer = async (idClase, idUsuario) => {
  if (!idUsuario) {
    throw new BusinessError('El usuario autenticado es obligatorio.', 401);
  }

  const resultado = await withTransaction(async (client) => {
    const activa = await findActiveByUserAndClass(idClase, idUsuario, client);
    if (!activa) {
      throw new BusinessError('No tenés una oferta pendiente en esta clase.', 404);
    }

    const estadoActual = getInscriptionState(activa.estado);
    if (!estadoActual.puedeConfirmarOferta) {
      throw new BusinessError('No hay un cupo liberado para rechazar.');
    }

    const cancelada = await cancelInscription(activa.id, client);
    const siguiente = await findNextWaitlist(idClase, client);
    const notificada = siguiente
      ? await notifyWaitlistInscription(siguiente.id, client)
      : null;

    return { cancelada, notificada, idClase };
  });

  if (resultado.notificada) {
    await classWaitlistSubject.notify({
      idClase: resultado.idClase,
      idUsuario: resultado.notificada.idUsuario,
      idInscripcion: resultado.notificada.id,
      motivo: 'oferta_rechazada'
    });
  }

  return resultado;
};