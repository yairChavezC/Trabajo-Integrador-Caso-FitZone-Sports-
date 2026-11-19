import * as defaultActivityRepo from '../repositories/activityRepository.js';
import * as defaultInscriptionRepo from '../repositories/inscriptionRepository.js';
import * as defaultMembershipRepo from '../repositories/membershipRepository.js';
import * as defaultNotificationRepo from '../repositories/notificationRepository.js';
import { createWaitlistSubject } from '../observers/waitlistObserver.js';
import { BusinessError } from '../errors.js';
import {
  validarVentanaReserva,
  validarVentanaListaEspera,
  validarVentanaCancelacion,
  esCancelacionTardia,
  validarCapacidadParaReserva,
  validarCapacidadParaListaEspera
} from '../domain/classPolicy.js';

const defaultWaitlistOfferMinutes = 15;
const defaultWaitlistOfferCheckIntervalMs = 60000;
const defaultPenalidadHoras = 48;

let waitlistWorker;

/**
 * Fábrica de servicio de inscripciones con Inyección de Dependencias.
 * Encapsula reservas, lista de espera, cancelaciones, ofertas temporales y el
 * proceso periódico de vencimiento de ofertas.
 */
export const createInscriptionService = (dependencies = {}) => {
  const activityRepo = dependencies.activityRepo || defaultActivityRepo;
  const inscriptionRepo = dependencies.inscriptionRepo || defaultInscriptionRepo;
  const membershipRepo =
    dependencies.membershipRepo || defaultMembershipRepo;
  const notificationRepo = dependencies.notificationRepo || defaultNotificationRepo;
  const waitlistSubject =
    dependencies.waitlistSubject || createWaitlistSubject(notificationRepo);
  const now = dependencies.now || (() => Date.now());

  const penalidadHoras = Number(
    dependencies.penalidadHoras ?? process.env.PENALIDAD_CANCELACION_TARDIA_HORAS ?? defaultPenalidadHoras
  );

  if (!Number.isInteger(penalidadHoras) || penalidadHoras <= 0) {
    throw new Error('PENALIDAD_CANCELACION_TARDIA_HORAS debe ser un entero mayor que cero.');
  }

  const verificarSinBloqueoPorCancelacionTardia = async (idUsuario, client) => {
    const ultima = await inscriptionRepo.findUltimaCancelacionTardia(idUsuario, client);
    if (!ultima) return;
    const fechaFinBloqueo = new Date(ultima.fecha_cancelacion).getTime() + penalidadHoras * 60 * 60 * 1000;
    if (now() < fechaFinBloqueo) {
      throw new BusinessError(
        `Tuviste una cancelación tardía. No podés reservar, anotarte en lista de espera ni aceptar ofertas hasta el ${new Date(fechaFinBloqueo).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}.`,
        409
      );
    }
  };

  const waitlistOfferMinutes = Number(
    dependencies.waitlistOfferMinutes ?? process.env.WAITLIST_OFFER_MINUTES ?? defaultWaitlistOfferMinutes
  );
  const waitlistOfferCheckIntervalMs = Number(
    dependencies.waitlistOfferCheckIntervalMs ??
      process.env.WAITLIST_OFFER_CHECK_INTERVAL_MS ??
      defaultWaitlistOfferCheckIntervalMs
  );

  if (!Number.isInteger(waitlistOfferMinutes) || waitlistOfferMinutes <= 0) {
    throw new Error('WAITLIST_OFFER_MINUTES debe ser un entero mayor que cero.');
  }

  if (!Number.isInteger(waitlistOfferCheckIntervalMs) || waitlistOfferCheckIntervalMs <= 0) {
    throw new Error('WAITLIST_OFFER_CHECK_INTERVAL_MS debe ser un entero mayor que cero.');
  }

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
    if (!await membershipRepo.hasActiveMembership(idUsuario, client)) {
      throw new BusinessError('Necesitás una membresía activa y vigente para inscribirte.', 403);
    }
  };

  const offerAvailablePlaces = async (clase, client) => {
    await inscriptionRepo.expireWaitlistOffers(clase.id, client);
    await membershipRepo.markIneligibleWaitlistEntries(clase.id, client);

    if (new Date(clase.fechaInicio).getTime() <= now()) return [];

    const eventos = [];
    let ocupados = await inscriptionRepo.countConfirmed(clase.id, client);

    while (ocupados < clase.cupo) {
      const siguiente = await membershipRepo.findNextWaitlist(clase.id, client);
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
      await waitlistSubject.notify(evento, { transactionClient: client });
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
      await verificarSinBloqueoPorCancelacionTardia(idUsuario, client);

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
      await verificarSinBloqueoPorCancelacionTardia(idUsuario, client);

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

      if (activa.estado === 'confirmado') {
        validarVentanaCancelacion(clase.fechaInicio, now());
      } else {
        if (new Date(clase.fechaInicio).getTime() <= now()) {
          throw new BusinessError('No se puede cancelar una inscripción de una clase que ya comenzó.', 409);
        }
      }

      const ahora = now();
      const tardía = activa.estado === 'confirmado' && esCancelacionTardia(clase.fechaInicio, ahora);
      const cancelada = await inscriptionRepo.cancelInscription(activa.id, {
        estado: tardía ? 'cancelado_tarde' : 'cancelado',
        fechaCancelacion: new Date(ahora).toISOString()
      }, client);
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
      await verificarSinBloqueoPorCancelacionTardia(idUsuario, client);
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
      getInscriptionsByClass,
      reserveClass,
      joinWaitlist,
      cancelClassReservation,
      acceptWaitlistOfferForUser,
      processExpiredWaitlistOffers,
      startWaitlistOfferExpirationWorker
    };
};

// Instancia por defecto con los repositorios reales para exponer la API como
// named exports del módulo (compatibilidad con controladores y tests de integración).
const defaultInscriptionService = createInscriptionService();

export const reserveClass = defaultInscriptionService.reserveClass;
export const joinWaitlist = defaultInscriptionService.joinWaitlist;
export const cancelClassReservation = defaultInscriptionService.cancelClassReservation;
export const getInscriptionsByClass = defaultInscriptionService.getInscriptionsByClass;
export const acceptWaitlistOfferForUser = defaultInscriptionService.acceptWaitlistOfferForUser;
export const processExpiredWaitlistOffers = defaultInscriptionService.processExpiredWaitlistOffers;
export const startWaitlistOfferExpirationWorker = defaultInscriptionService.startWaitlistOfferExpirationWorker;

