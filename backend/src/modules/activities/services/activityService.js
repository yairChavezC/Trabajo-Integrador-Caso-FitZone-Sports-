import {
  findAllActivities,
  findActivityById,
  lockActivityById,
  findMyRegistrations,
  findRoleTypeById,
  findAssignedSiteByUser,
  findClassesWithExpiredOffers,
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
  listByClass,
  hasActiveMembership,
  expireWaitlistOffers,
  markIneligibleWaitlistEntries,
  acceptWaitlistOffer
} from '../repositories/inscriptionRepository.js';
import { classWaitlistSubject } from '../observers/waitlistObserver.js';
import { BusinessError } from '../errors.js';
import {
  validarVentanaReserva,
  validarVentanaListaEspera,
  validarVentanaCancelacion,
  validarCapacidadParaReserva,
  validarCapacidadParaListaEspera,
  validarReduccionDeCupo
} from '../domain/classPolicy.js';

const waitlistOfferMinutes = Number(process.env.WAITLIST_OFFER_MINUTES || 15);
const waitlistOfferCheckIntervalMs = Number(
  process.env.WAITLIST_OFFER_CHECK_INTERVAL_MS || 60000
);
let waitlistWorker;

if (!Number.isInteger(waitlistOfferMinutes) || waitlistOfferMinutes <= 0) {
  throw new Error('WAITLIST_OFFER_MINUTES debe ser un entero mayor que cero.');
}

if (!Number.isInteger(waitlistOfferCheckIntervalMs) || waitlistOfferCheckIntervalMs <= 0) {
  throw new Error('WAITLIST_OFFER_CHECK_INTERVAL_MS debe ser un entero mayor que cero.');
}

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

const requireEligibleMember = async (idUsuario, client) => {
  if (!await hasActiveMembership(idUsuario, client)) {
    throw new BusinessError('Necesitás una membresía activa y vigente para inscribirte.', 403);
  }
};

const offerAvailablePlaces = async (clase, client) => {
  await expireWaitlistOffers(clase.id, client);
  await markIneligibleWaitlistEntries(clase.id, client);

  if (new Date(clase.fechaInicio).getTime() <= Date.now()) return [];

  const eventos = [];
  let ocupados = await countConfirmed(clase.id, client);

  while (ocupados < clase.cupo) {
    const siguiente = await findNextWaitlist(clase.id, client);
    if (!siguiente) break;

    const oferta = await promoteWaitlistInscription(
      siguiente.id,
      waitlistOfferMinutes,
      client
    );
    if (!oferta) break;

    const evento = {
      idClase: clase.id,
      nombreClase: clase.nombre,
      idUsuario: oferta.idUsuario,
      idInscripcion: oferta.id,
      motivo: 'oferta_temporal_lista_espera'
    };
    eventos.push(evento);
    ocupados += 1;
  }

  return eventos;
};

const notifyWaitlistEvents = async (eventos) => {
  for (const evento of eventos) {
    await classWaitlistSubject.notify(evento);
  }
};

export const getAllActivities = async (idUsuario = null, idSede = null) => {
  try {
    return await findAllActivities(idUsuario, idSede);
  } catch (error) {
    console.error('Error en activityService.getAllActivities:', error);
    throw error;
  }
};

export const getMyUpcomingRegistrations = async (idUsuario) => {
  if (!idUsuario) {
    throw new BusinessError('El usuario autenticado es obligatorio.', 401);
  }

  try {
    return await findMyRegistrations(idUsuario);
  } catch (error) {
    console.error('Error en activityService.getMyUpcomingRegistrations:', error);
    throw error;
  }
};

export const getCurrentUserRole = async (idRol) => {
  if (!idRol) {
    throw new BusinessError('El rol autenticado es obligatorio.', 401);
  }
  return findRoleTypeById(idRol);
};

export const getAssignedSiteForUser = async (idUsuario) => {
  if (!idUsuario) {
    throw new BusinessError('El usuario autenticado es obligatorio.', 401);
  }
  try {
    return await findAssignedSiteByUser(idUsuario);
  } catch (error) {
    if (error.code === '42P01') {
      throw new BusinessError(
        'La gestión de agenda por sede no está configurada. Aplicá la migración y asigná una sede.',
        503
      );
    }
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

      const errors = dto.validate(clase);
      if (errors.length > 0) {
        throw new BusinessError(errors.join(' '), 400);
      }

      const updateDto = {
        idSede: dto.idSede ?? clase.idSede,
        nombre: dto.nombre ?? clase.nombre,
        profesor: dto.profesor ?? clase.profesor,
        cupo: dto.cupo ?? clase.cupo,
        fechaInicio: dto.fechaInicio ?? clase.fechaInicio,
        fechaFin: dto.fechaFin ?? clase.fechaFin
      };
      const confirmados = await countConfirmed(id, client);
      validarReduccionDeCupo(updateDto.cupo, confirmados);

      return updateActivityInRepo(id, updateDto, client);
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

  const resultado = await withRegistrationTransaction(async (client) => {
    const clase = await lockActivityById(idClase, client);
    if (!clase) {
      throw new BusinessError('Clase no encontrada.', 404);
    }

    validarVentanaReserva(clase.fechaInicio);
    await requireEligibleMember(idUsuario, client);

    const activa = await findActiveByUserAndClass(idClase, idUsuario, client);
    if (activa) {
      throw new BusinessError(`Ya tenés una inscripción ${activa.estado} en esta clase.`, 409);
    }

    const eventos = await offerAvailablePlaces(clase, client);
    const confirmados = await countConfirmed(idClase, client);
    validarCapacidadParaReserva(clase.cupo, confirmados);

    return {
      inscripcion: await insertInscription(
        { idClase, idUsuario, estado: 'confirmado' },
        client
      ),
      eventos
    };
  });

  await notifyWaitlistEvents(resultado.eventos);
  return resultado.inscripcion;
};

export const joinWaitlist = async (idClase, idUsuario) => {
  if (!idUsuario) {
    throw new BusinessError('El usuario autenticado es obligatorio.', 401);
  }

  const resultado = await withRegistrationTransaction(async (client) => {
    const clase = await lockActivityById(idClase, client);
    if (!clase) {
      throw new BusinessError('Clase no encontrada.', 404);
    }

    validarVentanaListaEspera(clase.fechaInicio);
    await requireEligibleMember(idUsuario, client);

    const activa = await findActiveByUserAndClass(idClase, idUsuario, client);
    if (activa) {
      throw new BusinessError(`Ya tenés una inscripción ${activa.estado} en esta clase.`, 409);
    }

    const eventos = await offerAvailablePlaces(clase, client);
    const ocupados = await countConfirmed(idClase, client);
    validarCapacidadParaListaEspera(clase.cupo, ocupados);

    return {
      inscripcion: await insertInscription(
        { idClase, idUsuario, estado: 'en espera' },
        client
      ),
      eventos
    };
  });

  await notifyWaitlistEvents(resultado.eventos);
  return resultado.inscripcion;
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
    const eventos = ['confirmado', 'notificado'].includes(activa.estado)
      ? await offerAvailablePlaces(clase, client)
      : [];
    const eventoPrincipal = eventos[0] ?? null;

    return {
      resultado: {
        cancelada,
        oferta: eventoPrincipal,
        idClase
      },
      eventos
    };
  });

  await notifyWaitlistEvents(resultado.eventos);
  return resultado.resultado;
};

export const acceptWaitlistOfferForUser = async (idClase, idUsuario) => {
  if (!idUsuario) {
    throw new BusinessError('El usuario autenticado es obligatorio.', 401);
  }

  return withRegistrationTransaction(async (client) => {
    const clase = await lockActivityById(idClase, client);
    if (!clase) {
      throw new BusinessError('Clase no encontrada.', 404);
    }
    await requireEligibleMember(idUsuario, client);
    if (new Date(clase.fechaInicio).getTime() <= Date.now()) {
      throw new BusinessError('La oferta ya no se puede aceptar porque la clase comenzó.', 409);
    }
    const aceptada = await acceptWaitlistOffer(idClase, idUsuario, client);
    if (!aceptada) {
      throw new BusinessError('La oferta de lugar no existe o ya venció.', 409);
    }
    return aceptada;
  });
};

export const processExpiredWaitlistOffers = async () => {
  const idClases = await findClassesWithExpiredOffers();

  for (const idClase of idClases) {
    const eventos = await withTransaction(async (client) => {
      const clase = await lockActivityById(idClase, client);
      if (!clase) return [];
      return offerAvailablePlaces(clase, client);
    });
    await notifyWaitlistEvents(eventos);
  }
};

export const startWaitlistOfferExpirationWorker = () => {
  if (waitlistWorker) return;

  waitlistWorker = setInterval(() => {
    processExpiredWaitlistOffers().catch((error) => {
      console.error('Error procesando vencimientos de lista de espera:', error);
    });
  }, waitlistOfferCheckIntervalMs);
  waitlistWorker.unref();
};
