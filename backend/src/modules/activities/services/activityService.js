import * as defaultActivityRepo from '../repositories/activityRepository.js';
import * as defaultInscriptionRepo from '../repositories/inscriptionRepository.js';
import { classWaitlistSubject as defaultWaitlistSubject } from '../observers/waitlistObserver.js';
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

/**
 * Fábrica de servicio con Inyección de Dependencias para repositorios y observadores.
 * Permite desacoplar la lógica de negocio de la infraestructura de persistencia (Patrón Repository).
 */
export const createActivityService = (dependencies = {}) => {
  const activityRepo = dependencies.activityRepo || defaultActivityRepo;
  const inscriptionRepo = dependencies.inscriptionRepo || defaultInscriptionRepo;
  const waitlistSubject = dependencies.waitlistSubject || defaultWaitlistSubject;
  const now = dependencies.now || (() => Date.now());

  const withRegistrationTransaction = async (work) => {
    try {
      return await inscriptionRepo.withTransaction(work);
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
    if (!await inscriptionRepo.hasActiveMembership(idUsuario, client)) {
      throw new BusinessError('Necesitás una membresía activa y vigente para inscribirte.', 403);
    }
  };

  const offerAvailablePlaces = async (clase, client) => {
    await inscriptionRepo.expireWaitlistOffers(clase.id, client);
    await inscriptionRepo.markIneligibleWaitlistEntries(clase.id, client);

    if (new Date(clase.fechaInicio).getTime() <= now()) return [];

    const eventos = [];
    let ocupados = await inscriptionRepo.countConfirmed(clase.id, client);

    while (ocupados < clase.cupo) {
      const siguiente = await inscriptionRepo.findNextWaitlist(clase.id, client);
      if (!siguiente) break;

      const oferta = await inscriptionRepo.promoteWaitlistInscription(
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
      await waitlistSubject.notify(evento);
    }
  };

  const getAllActivities = async (idUsuario = null, idSede = null) => {
    try {
      return await activityRepo.findAllActivities(idUsuario, idSede);
    } catch (error) {
      console.error('Error en activityService.getAllActivities:', error);
      throw error;
    }
  };

  const getMyUpcomingRegistrations = async (idUsuario) => {
    if (!idUsuario) {
      throw new BusinessError('El usuario autenticado es obligatorio.', 401);
    }

    try {
      return await activityRepo.findMyRegistrations(idUsuario);
    } catch (error) {
      console.error('Error en activityService.getMyUpcomingRegistrations:', error);
      throw error;
    }
  };

  const getCurrentUserRole = async (idRol) => {
    if (!idRol) {
      throw new BusinessError('El rol autenticado es obligatorio.', 401);
    }
    return activityRepo.findRoleTypeById(idRol);
  };

  const getAssignedSiteForUser = async (idUsuario) => {
    if (!idUsuario) {
      throw new BusinessError('El usuario autenticado es obligatorio.', 401);
    }
    try {
      return await activityRepo.findAssignedSiteByUser(idUsuario);
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

  const getActivityById = async (id, idUsuario = null) => {
    try {
      if (!id) {
        throw new Error('El ID de la clase es obligatorio.');
      }

      return await activityRepo.findActivityById(id, idUsuario);
    } catch (error) {
      console.error('Error en activityService.getActivityById:', error);
      throw error;
    }
  };

  const createActivity = async (dto) => {
    try {
      if (!dto) {
        throw new Error('El DTO es obligatorio.');
      }

      return await activityRepo.createActivity(dto);
    } catch (error) {
      console.error('Error en activityService.createActivity:', error);
      throw error;
    }
  };

  const updateActivity = async (id, dto) => {
    try {
      if (!id) {
        throw new Error('El ID de la clase es obligatorio.');
      }

      if (!dto) {
        throw new Error('El DTO es obligatorio.');
      }

      return await inscriptionRepo.withTransaction(async (client) => {
        const clase = await activityRepo.lockActivityById(id, client);
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
        const confirmados = await inscriptionRepo.countConfirmed(id, client);
        validarReduccionDeCupo(updateDto.cupo, confirmados);

        return activityRepo.updateActivity(id, updateDto, client);
      });
    } catch (error) {
      console.error('Error en activityService.updateActivity:', error);
      throw error;
    }
  };

  const deleteActivity = async (id) => {
    try {
      if (!id) {
        throw new Error('El ID de la clase es obligatorio.');
      }

      const confirmados = await inscriptionRepo.countConfirmed(id);
      if (confirmados > 0) {
        throw new BusinessError(
          `No se puede eliminar la clase porque cuenta con ${confirmados} reserva(s) activa(s). Cancelá las inscripciones primero.`,
          409
        );
      }

      return await activityRepo.deleteActivity(id);
    } catch (error) {
      if (error.code === '23503') {
        throw new BusinessError(
          'No se puede eliminar la clase porque cuenta con registros históricos de inscripciones asociadas.',
          409
        );
      }
      console.error('Error en activityService.deleteActivity:', error);
      throw error;
    }
  };

  const getInscriptionsByClass = async (idClase) => {
    const clase = await activityRepo.findActivityById(idClase);
    if (!clase) {
      throw new BusinessError('Clase no encontrada.', 404);
    }
    return inscriptionRepo.listByClass(idClase);
  };

  const reserveClass = async (idClase, idUsuario) => {
    if (!idUsuario) {
      throw new BusinessError('El usuario autenticado es obligatorio.', 401);
    }

    const resultado = await withRegistrationTransaction(async (client) => {
      const clase = await activityRepo.lockActivityById(idClase, client);
      if (!clase) {
        throw new BusinessError('Clase no encontrada.', 404);
      }

      validarVentanaReserva(clase.fechaInicio, now());
      await requireEligibleMember(idUsuario, client);

      const activa = await inscriptionRepo.findActiveByUserAndClass(idClase, idUsuario, client);
      if (activa) {
        throw new BusinessError(`Ya tenés una inscripción ${activa.estado} en esta clase.`, 409);
      }

      const eventos = await offerAvailablePlaces(clase, client);
      const confirmados = await inscriptionRepo.countConfirmed(idClase, client);
      validarCapacidadParaReserva(clase.cupo, confirmados);

      return {
        inscripcion: await inscriptionRepo.insertInscription(
          { idClase, idUsuario, estado: 'confirmado' },
          client
        ),
        eventos
      };
    });

    await notifyWaitlistEvents(resultado.eventos);
    return resultado.inscripcion;
  };

  const joinWaitlist = async (idClase, idUsuario) => {
    if (!idUsuario) {
      throw new BusinessError('El usuario autenticado es obligatorio.', 401);
    }

    const resultado = await withRegistrationTransaction(async (client) => {
      const clase = await activityRepo.lockActivityById(idClase, client);
      if (!clase) {
        throw new BusinessError('Clase no encontrada.', 404);
      }

      validarVentanaListaEspera(clase.fechaInicio, now());
      await requireEligibleMember(idUsuario, client);

      const activa = await inscriptionRepo.findActiveByUserAndClass(idClase, idUsuario, client);
      if (activa) {
        throw new BusinessError(`Ya tenés una inscripción ${activa.estado} en esta clase.`, 409);
      }

      const eventos = await offerAvailablePlaces(clase, client);
      const ocupados = await inscriptionRepo.countConfirmed(idClase, client);
      validarCapacidadParaListaEspera(clase.cupo, ocupados);

      return {
        inscripcion: await inscriptionRepo.insertInscription(
          { idClase, idUsuario, estado: 'en espera' },
          client
        ),
        eventos
      };
    });

    await notifyWaitlistEvents(resultado.eventos);
    return resultado.inscripcion;
  };

  const cancelClassReservation = async (idClase, idUsuario) => {
    if (!idUsuario) {
      throw new BusinessError('El usuario autenticado es obligatorio.', 401);
    }

    const resultado = await inscriptionRepo.withTransaction(async (client) => {
      const clase = await activityRepo.lockActivityById(idClase, client);
      if (!clase) {
        throw new BusinessError('Clase no encontrada.', 404);
      }

      const activa = await inscriptionRepo.findActiveByUserAndClass(idClase, idUsuario, client);
      if (!activa) {
        throw new BusinessError('No tenés una inscripción activa en esta clase.', 404);
      }

      // Regla de cancelación unificada:
      // Para reservas confirmadas se requiere al menos 2 horas de anticipación.
      // Para inscripciones en lista de espera o notificaciones de oferta temporal,
      // el socio puede cancelar/retirarse en cualquier momento antes de que comience la clase.
      if (activa.estado === 'confirmado') {
        validarVentanaCancelacion(clase.fechaInicio, now());
      } else {
        if (new Date(clase.fechaInicio).getTime() <= now()) {
          throw new BusinessError('No se puede cancelar una inscripción de una clase que ya comenzó.', 409);
        }
      }

      const cancelada = await inscriptionRepo.cancelInscription(activa.id, client);
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

  const acceptWaitlistOfferForUser = async (idClase, idUsuario) => {
    if (!idUsuario) {
      throw new BusinessError('El usuario autenticado es obligatorio.', 401);
    }

    return withRegistrationTransaction(async (client) => {
      const clase = await activityRepo.lockActivityById(idClase, client);
      if (!clase) {
        throw new BusinessError('Clase no encontrada.', 404);
      }
      await requireEligibleMember(idUsuario, client);
      if (new Date(clase.fechaInicio).getTime() <= now()) {
        throw new BusinessError('La oferta ya no se puede aceptar porque la clase comenzó.', 409);
      }
      const aceptada = await inscriptionRepo.acceptWaitlistOffer(idClase, idUsuario, client);
      if (!aceptada) {
        throw new BusinessError('La oferta de lugar no existe o ya venció.', 409);
      }
      return aceptada;
    });
  };

  const processExpiredWaitlistOffers = async () => {
    const idClases = await activityRepo.findClassesWithExpiredOffers();

    for (const idClase of idClases) {
      const eventos = await inscriptionRepo.withTransaction(async (client) => {
        const clase = await activityRepo.lockActivityById(idClase, client);
        if (!clase) return [];
        return offerAvailablePlaces(clase, client);
      });
      await notifyWaitlistEvents(eventos);
    }
  };

  const startWaitlistOfferExpirationWorker = () => {
    if (waitlistWorker) return;

    waitlistWorker = setInterval(() => {
      processExpiredWaitlistOffers().catch((error) => {
        console.error('Error procesando vencimientos de lista de espera:', error);
      });
    }, waitlistOfferCheckIntervalMs);
    waitlistWorker.unref();
  };

  return {
    getAllActivities,
    getMyUpcomingRegistrations,
    getCurrentUserRole,
    getAssignedSiteForUser,
    getActivityById,
    createActivity,
    updateActivity,
    deleteActivity,
    getInscriptionsByClass,
    reserveClass,
    joinWaitlist,
    cancelClassReservation,
    acceptWaitlistOfferForUser,
    processExpiredWaitlistOffers,
    startWaitlistOfferExpirationWorker
  };
};

const defaultService = createActivityService();

export const getAllActivities = defaultService.getAllActivities;
export const getMyUpcomingRegistrations = defaultService.getMyUpcomingRegistrations;
export const getCurrentUserRole = defaultService.getCurrentUserRole;
export const getAssignedSiteForUser = defaultService.getAssignedSiteForUser;
export const getActivityById = defaultService.getActivityById;
export const createActivity = defaultService.createActivity;
export const updateActivity = defaultService.updateActivity;
export const deleteActivity = defaultService.deleteActivity;
export const getInscriptionsByClass = defaultService.getInscriptionsByClass;
export const reserveClass = defaultService.reserveClass;
export const joinWaitlist = defaultService.joinWaitlist;
export const cancelClassReservation = defaultService.cancelClassReservation;
export const acceptWaitlistOfferForUser = defaultService.acceptWaitlistOfferForUser;
export const processExpiredWaitlistOffers = defaultService.processExpiredWaitlistOffers;
export const startWaitlistOfferExpirationWorker = defaultService.startWaitlistOfferExpirationWorker;
