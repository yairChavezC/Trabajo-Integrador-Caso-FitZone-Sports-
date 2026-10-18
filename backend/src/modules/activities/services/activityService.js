import {
  findAllActivities,
  findActivityById,
  lockActivityById,
  createActivity as createActivityInRepo,
  updateActivity as updateActivityInRepo,
  deleteActivity as deleteActivityInRepo
} from '../repositories/activityRepository.js';
import {
  withTransaction,
  countConfirmed,
  findActiveByUserAndClass,
  insertInscription,
  cancelInscription,
  findNextWaitlist,
  promoteWaitlistInscription,
  listByClass
} from '../repositories/inscriptionRepository.js';
import { classWaitlistSubject } from '../observers/waitlistObserver.js';
import * as notificationRepository from '../repositories/notificationRepository.js';
import { BusinessError } from '../errors.js';
import {
  validarVentanaReserva,
  validarVentanaCancelacion,
  validarCapacidadParaReserva,
  validarCapacidadParaListaEspera,
  validarReduccionDeCupo
} from '../domain/classPolicy.js';

const withRegistrationTransaction = async (work) => {
  try {
    return await withTransaction(work);
  } catch (error) {
    if (
      error.code === '23505' &&
      error.constraint === 'uq_inscripciones_clase_usuario_activa'
    ) {
      throw new BusinessError('Ya tenés una inscripción activa en esta clase.', 409);
    }
    throw error;
  }
};

export const getAllActivities = async (idUsuario = null) => {
  try {
    return await findAllActivities(idUsuario);
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

    return await findActivityById(id, idUsuario);
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

    return await withTransaction(async (client) => {
      const clase = await lockActivityById(id, client);
      if (!clase) return null;

      const confirmados = await countConfirmed(id, client);
      validarReduccionDeCupo(dto.cupo, confirmados);

      return updateActivityInRepo(id, dto, client);
    });
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

  return withRegistrationTransaction(async (client) => {
    const clase = await lockActivityById(idClase, client);
    if (!clase) {
      throw new BusinessError('Clase no encontrada.', 404);
    }

    validarVentanaReserva(clase.fechaInicio);

    const activa = await findActiveByUserAndClass(idClase, idUsuario, client);
    if (activa) {
      throw new BusinessError(`Ya tenés una inscripción ${activa.estado} en esta clase.`, 409);
    }

    const confirmados = await countConfirmed(idClase, client);
    validarCapacidadParaReserva(clase.cupo, confirmados);

    return insertInscription(
      { idClase, idUsuario, estado: 'confirmado' },
      client
    );
  });
};

export const joinWaitlist = async (idClase, idUsuario) => {
  if (!idUsuario) {
    throw new BusinessError('El usuario autenticado es obligatorio.', 401);
  }

  return withRegistrationTransaction(async (client) => {
    const clase = await lockActivityById(idClase, client);
    if (!clase) {
      throw new BusinessError('Clase no encontrada.', 404);
    }

    validarVentanaReserva(clase.fechaInicio);

    const activa = await findActiveByUserAndClass(idClase, idUsuario, client);
    if (activa) {
      throw new BusinessError(`Ya tenés una inscripción ${activa.estado} en esta clase.`, 409);
    }

    const confirmados = await countConfirmed(idClase, client);
    validarCapacidadParaListaEspera(clase.cupo, confirmados);

    return insertInscription(
      { idClase, idUsuario, estado: 'en espera' },
      client
    );
  });
};

export const cancelClassReservation = async (idClase, idUsuario) => {
  if (!idUsuario) {
    throw new BusinessError('El usuario autenticado es obligatorio.', 401);
  }

  const resultado = await withTransaction(async (client) => {
    const clase = await lockActivityById(idClase, client);
    if (!clase) {
      throw new BusinessError('Clase no encontrada.', 404);
    }

    validarVentanaCancelacion(clase.fechaInicio);

    const activa = await findActiveByUserAndClass(idClase, idUsuario, client);
    if (!activa) {
      throw new BusinessError('No tenés una inscripción activa en esta clase.', 404);
    }

    const cancelada = await cancelInscription(activa.id, client);
    let promovida = null;

    if (activa.estado === 'confirmado') {
      const siguiente = await findNextWaitlist(idClase, client);
      if (siguiente) {
        promovida = await promoteWaitlistInscription(siguiente.id, client);
      }
    }

    const notificacion = promovida
      ? await notificationRepository.createWaitlistPromotion({
          idClase,
          nombreClase: clase.nombre,
          idUsuario: promovida.idUsuario,
          idInscripcion: promovida.id,
          motivo: 'baja_de_cupo_confirmado'
        }, client)
      : null;

    return {
      resultado: { cancelada, promovida, idClase },
      evento: notificacion
        ? {
            idClase,
            nombreClase: clase.nombre,
            idUsuario: promovida.idUsuario,
            idInscripcion: promovida.id,
            motivo: 'baja_de_cupo_confirmado',
            notificacion
          }
        : null
    };
  });

  if (resultado.evento) {
    await classWaitlistSubject.notify(resultado.evento);
  }

  return resultado.resultado;
};