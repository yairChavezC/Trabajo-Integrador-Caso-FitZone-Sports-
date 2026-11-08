import test from 'node:test';
import assert from 'node:assert/strict';
import { createActivityService } from './activityService.js';
import { BusinessError } from '../errors.js';

const makeFixedNow = (isoString) => () => new Date(isoString).getTime();

const createMockDependencies = (overrides = {}) => {
  const defaultClass = {
    id: 1,
    idSede: 1,
    nombre: 'CrossFit WOD',
    profesor: 'Entrenador Juan',
    cupo: 5,
    fechaInicio: '2026-11-06T10:00:00.000Z',
    fechaFin: '2026-11-06T11:00:00.000Z'
  };

  const activityRepo = {
    lockActivityById: async (id) => ({ ...defaultClass, id }),
    findActivityById: async (id) => ({ ...defaultClass, id }),
    findAllActivities: async () => [{ ...defaultClass }],
    findMyRegistrations: async () => [],
    findRoleTypeById: async (idRol) => ({
      1: 'administrador',
      3: 'socio',
      4: 'gerente'
    })[idRol] ?? null,
    findAssignedSiteByUser: async () => 1,
    createActivity: async (dto) => ({ id: 99, ...dto }),
    updateActivity: async (id, dto) => ({ id, ...dto }),
    deleteActivity: async (id) => ({ id, deleted: true }),
    findClassesWithExpiredOffers: async () => [1],
    ...(overrides.activityRepo || {})
  };

  const transactionClient = {};
  const inscriptionRepo = {
    withTransaction: async (work) => work(transactionClient),
    hasActiveMembership: async (idUsuario) => idUsuario === 10,
    findActiveByUserAndClass: async () => null,
    countConfirmed: async () => 2,
    insertInscription: async (data) => ({ id: 101, ...data, fechaRegistro: new Date().toISOString() }),
    cancelInscription: async (id) => ({ id, estado: 'cancelado' }),
    countActiveInscriptions: async () => 0,
    findNextWaitlist: async () => null,
    promoteWaitlistInscription: async (id, mins) => ({
      id,
      idUsuario: 20,
      estado: 'notificado',
      fechaExpiracionOferta: new Date(Date.now() + mins * 60000).toISOString()
    }),
    expireWaitlistOffers: async () => [],
    markIneligibleWaitlistEntries: async () => [],
    acceptWaitlistOffer: async () => null,
    listByClass: async () => [],
    ...(overrides.inscriptionRepo || {})
  };

  const notifiedEvents = [];
  const persistedNotifications = [];
  const notificationRepo = {
    createWaitlistPromotion: async (evento, client) => {
      persistedNotifications.push({ evento, client });
    },
    ...(overrides.notificationRepo || {})
  };
  const waitlistSubject = {
    notify: async (evento) => {
      notifiedEvents.push(evento);
    },
    ...(overrides.waitlistSubject || {})
  };

  // Por defecto, 'ahora' son 10 horas antes del inicio de la clase (dentro de la ventana de 48h)
  const now = overrides.now || makeFixedNow('2026-11-06T00:00:00.000Z');

  return {
    service: createActivityService({
      activityRepo,
      inscriptionRepo,
      notificationRepo,
      waitlistSubject,
      now
    }),
    activityRepo,
    inscriptionRepo,
    notificationRepo,
    waitlistSubject,
    notifiedEvents,
    persistedNotifications,
    transactionClient
  };
};

test('Reserva: requiere usuario autenticado', async () => {
  const { service } = createMockDependencies();
  await assert.rejects(
    async () => service.reserveClass(1, null),
    (err) => err instanceof BusinessError && err.status === 401
  );
});

test('el rol administrador se expone como gerente en el módulo de clases', async () => {
  const { service } = createMockDependencies();

  assert.equal(await service.getCurrentUserRole(1), 'gerente');
  assert.equal(await service.getCurrentUserRole(4), 'gerente');
});

test('Reserva: con membresía activa confirma el cupo correctamente', async () => {
  const { service, notifiedEvents } = createMockDependencies({
    inscriptionRepo: {
      hasActiveMembership: async (uid) => uid === 10,
      countConfirmed: async () => 2,
      insertInscription: async (data) => ({ id: 50, ...data })
    }
  });

  const res = await service.reserveClass(1, 10);
  assert.equal(res.id, 50);
  assert.equal(res.estado, 'confirmado');
  assert.equal(notifiedEvents.length, 0);
});

test('Reserva: rechaza si el socio tiene membresía vencida o inexistente', async () => {
  const { service } = createMockDependencies({
    inscriptionRepo: {
      hasActiveMembership: async () => false
    }
  });

  await assert.rejects(
    async () => service.reserveClass(1, 99),
    (err) =>
      err instanceof BusinessError &&
      err.status === 403 &&
      err.message.includes('membresía activa')
  );
});

test('Reserva: rechaza si el usuario ya posee una inscripción activa en la clase', async () => {
  const { service } = createMockDependencies({
    inscriptionRepo: {
      hasActiveMembership: async () => true,
      findActiveByUserAndClass: async () => ({ id: 12, estado: 'confirmado' })
    }
  });

  await assert.rejects(
    async () => service.reserveClass(1, 10),
    (err) =>
      err instanceof BusinessError &&
      err.status === 409 &&
      err.message.includes('Ya tenés una inscripción')
  );
});

test('Reserva: rechaza reserva si el cupo está completo y sugiere lista de espera', async () => {
  const { service } = createMockDependencies({
    inscriptionRepo: {
      hasActiveMembership: async () => true,
      countConfirmed: async () => 5 // Cupo es 5
    }
  });

  await assert.rejects(
    async () => service.reserveClass(1, 10),
    (err) =>
      err instanceof BusinessError &&
      err.status === 409 &&
      err.message.includes('La clase está completa')
  );
});

test('Lista de espera: permite anotarse si la clase está completa', async () => {
  const { service } = createMockDependencies({
    inscriptionRepo: {
      hasActiveMembership: async () => true,
      countConfirmed: async () => 5,
      insertInscription: async (data) => ({ id: 80, ...data })
    }
  });

  const res = await service.joinWaitlist(1, 10);
  assert.equal(res.id, 80);
  assert.equal(res.estado, 'en espera');
});

test('Lista de espera: rechaza inscripción si todavía existen cupos confirmados disponibles', async () => {
  const { service } = createMockDependencies({
    inscriptionRepo: {
      hasActiveMembership: async () => true,
      countConfirmed: async () => 3 // Cupo es 5
    }
  });

  await assert.rejects(
    async () => service.joinWaitlist(1, 10),
    (err) =>
      err instanceof BusinessError &&
      err.status === 409 &&
      err.message.includes('Todavía hay cupos')
  );
});

test('Cancelación: reserva confirmada con más de 2 horas se cancela y promueve al siguiente de lista de espera', async () => {
  let promotedId = null;
  const { service, notifiedEvents, persistedNotifications, transactionClient } = createMockDependencies({
    now: makeFixedNow('2026-11-06T06:00:00.000Z'), // 4 horas antes del inicio (10:00)
    inscriptionRepo: {
      findActiveByUserAndClass: async () => ({ id: 45, estado: 'confirmado' }),
      cancelInscription: async (id) => ({ id, estado: 'cancelado' }),
      countConfirmed: async () => 4, // tras cancelar, queda en 4 de 5
      findNextWaitlist: async () => ({ id: 77, idUsuario: 33 }),
      promoteWaitlistInscription: async (id) => {
        promotedId = id;
        return { id, idUsuario: 33, estado: 'notificado' };
      }
    }
  });

  const resultado = await service.cancelClassReservation(1, 10);
  assert.equal(resultado.cancelada.estado, 'cancelado');
  assert.equal(promotedId, 77);
  assert.equal(notifiedEvents.length, 1);
  assert.equal(notifiedEvents[0].idUsuario, 33);
  assert.equal(notifiedEvents[0].motivo, 'oferta_temporal_lista_espera');
  assert.equal(persistedNotifications.length, 1);
  assert.deepEqual(persistedNotifications[0].evento, notifiedEvents[0]);
  assert.equal(persistedNotifications[0].client, transactionClient);
});

test('si falla la persistencia de la notificación, la transacción de promoción falla', async () => {
  const { service } = createMockDependencies({
    inscriptionRepo: {
      findActiveByUserAndClass: async () => ({ id: 45, estado: 'confirmado' }),
      cancelInscription: async (id) => ({ id, estado: 'cancelado' }),
      countConfirmed: async () => 4,
      findNextWaitlist: async () => ({ id: 77, idUsuario: 33 }),
      promoteWaitlistInscription: async (id) => ({ id, idUsuario: 33, estado: 'notificado' })
    },
    notificationRepo: {
      createWaitlistPromotion: async () => {
        throw new Error('No se pudo guardar la notificación.');
      }
    }
  });

  await assert.rejects(
    () => service.cancelClassReservation(1, 10),
    /No se pudo guardar la notificación/
  );
});

test('Cancelación: reserva confirmada con menos de 2 horas es rechazada por política', async () => {
  const { service } = createMockDependencies({
    now: makeFixedNow('2026-11-06T09:30:00.000Z'), // 30 minutos antes del inicio (10:00)
    inscriptionRepo: {
      findActiveByUserAndClass: async () => ({ id: 45, estado: 'confirmado' })
    }
  });

  await assert.rejects(
    async () => service.cancelClassReservation(1, 10),
    (err) =>
      err instanceof BusinessError &&
      err.status === 409 &&
      err.message.includes('hasta 2 horas antes')
  );
});

test('Cancelación: socio en lista de espera puede cancelar con menos de 2 horas antes de la clase', async () => {
  const { service, notifiedEvents } = createMockDependencies({
    now: makeFixedNow('2026-11-06T09:15:00.000Z'), // 45 minutos antes del inicio
    inscriptionRepo: {
      findActiveByUserAndClass: async () => ({ id: 62, estado: 'en espera' }),
      cancelInscription: async (id) => ({ id, estado: 'cancelado' })
    }
  });

  const res = await service.cancelClassReservation(1, 10);
  assert.equal(res.cancelada.id, 62);
  assert.equal(res.cancelada.estado, 'cancelado');
  // Al salir de lista de espera no se libera un cupo físico, por lo que no genera ofertas
  assert.equal(notifiedEvents.length, 0);
});

test('Cancelación: oferta notificada cancelada con menos de 2 horas se libera y ofrece al siguiente', async () => {
  const { service, notifiedEvents } = createMockDependencies({
    now: makeFixedNow('2026-11-06T09:00:00.000Z'), // 1 hora antes del inicio
    inscriptionRepo: {
      findActiveByUserAndClass: async () => ({ id: 70, estado: 'notificado' }),
      cancelInscription: async (id) => ({ id, estado: 'cancelado' }),
      countConfirmed: async () => 4,
      findNextWaitlist: async () => ({ id: 88, idUsuario: 44 }),
      promoteWaitlistInscription: async (id) => ({ id, idUsuario: 44, estado: 'notificado' })
    }
  });

  const res = await service.cancelClassReservation(1, 10);
  assert.equal(res.cancelada.estado, 'cancelado');
  assert.equal(notifiedEvents.length, 1);
  assert.equal(notifiedEvents[0].idUsuario, 44);
});

test('Aceptación de oferta: oferta vigente es confirmada exitosamente', async () => {
  const { service } = createMockDependencies({
    now: makeFixedNow('2026-11-06T08:00:00.000Z'),
    inscriptionRepo: {
      hasActiveMembership: async () => true,
      acceptWaitlistOffer: async (idClase, idUsuario) => ({
        id: 70,
        idClase,
        idUsuario,
        estado: 'confirmado'
      })
    }
  });

  const aceptada = await service.acceptWaitlistOfferForUser(1, 10);
  assert.equal(aceptada.id, 70);
  assert.equal(aceptada.estado, 'confirmado');
});

test('Aceptación de oferta: rechaza oferta vencida o inexistente', async () => {
  const { service } = createMockDependencies({
    inscriptionRepo: {
      hasActiveMembership: async () => true,
      acceptWaitlistOffer: async () => null
    }
  });

  await assert.rejects(
    async () => service.acceptWaitlistOfferForUser(1, 10),
    (err) =>
      err instanceof BusinessError &&
      err.status === 409 &&
      err.message.includes('ya venció')
  );
});

test('Aceptación de oferta: rechaza si la clase ya comenzó', async () => {
  const { service } = createMockDependencies({
    now: makeFixedNow('2026-11-06T10:05:00.000Z'), // 5 min después del inicio
    inscriptionRepo: {
      hasActiveMembership: async () => true
    }
  });

  await assert.rejects(
    async () => service.acceptWaitlistOfferForUser(1, 10),
    (err) =>
      err instanceof BusinessError &&
      err.status === 409 &&
      err.message.includes('la clase comenzó')
  );
});

test('Lista de espera: promueve a múltiples personas si se liberan varios cupos', async () => {
  let waitlistCandidates = [
    { id: 101, idUsuario: 201 },
    { id: 102, idUsuario: 202 }
  ];
  let currentConfirmed = 3; // Cupo es 5 -> hay 2 lugares libres

  const { service, notifiedEvents } = createMockDependencies({
    activityRepo: {
      findClassesWithExpiredOffers: async () => [1],
      lockActivityById: async () => ({
        id: 1,
        nombre: 'Spinning',
        cupo: 5,
        fechaInicio: '2026-11-06T12:00:00.000Z'
      })
    },
    inscriptionRepo: {
      expireWaitlistOffers: async () => [],
      markIneligibleWaitlistEntries: async () => [],
      countConfirmed: async () => currentConfirmed,
      findNextWaitlist: async () => {
        const candidate = waitlistCandidates.shift();
        if (candidate) currentConfirmed += 1;
        return candidate || null;
      },
      promoteWaitlistInscription: async (id) => ({
        id,
        idUsuario: id + 100,
        estado: 'notificado'
      })
    }
  });

  await service.processExpiredWaitlistOffers();
  assert.equal(notifiedEvents.length, 2);
  assert.equal(notifiedEvents[0].idInscripcion, 101);
  assert.equal(notifiedEvents[1].idInscripcion, 102);
});

test('Actualización de clase: no permite reducir el cupo por debajo de reservas confirmadas', async () => {
  const { service } = createMockDependencies({
    inscriptionRepo: {
      countConfirmed: async () => 4
    }
  });

  const fakeDto = {
    cupo: 3,
    validate: () => []
  };

  await assert.rejects(
    async () => service.updateActivity(1, fakeDto),
    (err) =>
      err instanceof BusinessError &&
      err.status === 409 &&
      err.message.includes('No se puede reducir el cupo por debajo de las 4 reservas confirmadas')
  );
});

test('Eliminación de clase: rechaza si la actividad tiene reservas activas', async () => {
  const { service } = createMockDependencies({
    inscriptionRepo: {
      countConfirmed: async () => 3
    }
  });

  await assert.rejects(
    async () => service.deleteActivity(1),
    (err) =>
      err instanceof BusinessError &&
      err.status === 409 &&
      err.message.includes('cuenta con 3 reserva(s) activa(s)')
  );
});

test('Actualizar cupo promueve la lista de espera y notifica tras la transacción', async () => {
  const operaciones = [];
  let esperaConsultada = false;
  const { service, notifiedEvents } = createMockDependencies({
    activityRepo: {
      updateActivity: async (id, dto) => ({ id, ...dto })
    },
    inscriptionRepo: {
      countConfirmed: async () => 2,
      findNextWaitlist: async () => {
        if (esperaConsultada) return null;
        esperaConsultada = true;
        return { id: 45 };
      },
      promoteWaitlistInscription: async () => ({
        id: 45,
        idUsuario: 22,
        estado: 'notificado'
      }),
      withTransaction: async (work) => {
        operaciones.push('begin');
        const result = await work({});
        operaciones.push('commit');
        return result;
      }
    },
    waitlistSubject: {
      notify: async (evento) => {
        operaciones.push('notify');
        notifiedEvents.push(evento);
      }
    }
  });

  const clase = await service.updateActivity(1, {
    cupo: 6,
    validate: () => []
  });

  assert.equal(clase.cupo, 6);
  assert.equal(notifiedEvents.length, 1);
  assert.deepEqual(operaciones, ['begin', 'commit', 'notify']);
});

test('Eliminar clase bloquea y borra dentro de la misma transacción', async () => {
  const client = {};
  const llamadas = [];
  const { service } = createMockDependencies({
    activityRepo: {
      lockActivityById: async (_id, transactionClient) => {
        llamadas.push(['lock', transactionClient]);
        return { id: 1 };
      },
      deleteActivity: async (_id, transactionClient) => {
        llamadas.push(['delete', transactionClient]);
        return { id: 1 };
      }
    },
    inscriptionRepo: {
      countConfirmed: async (_id, transactionClient) => {
        llamadas.push(['count', transactionClient]);
        return 0;
      },
      withTransaction: async (work) => work(client)
    }
  });

  await service.deleteActivity(1);

  assert.deepEqual(llamadas, [
    ['lock', client],
    ['count', client],
    ['delete', client]
  ]);
});

test('no permite mover fechas si hay inscripciones activas', async () => {
  const { service } = createMockDependencies({
    inscriptionRepo: {
      countActiveInscriptions: async () => 1
    }
  });

  await assert.rejects(
    service.updateActivity(1, {
      fechaInicio: '2026-11-07T10:00:00.000Z',
      validate: () => []
    }),
    (error) => error instanceof BusinessError && error.status === 409
  );
});

test('no permite cambiar el inicio a una fecha pasada', async () => {
  const { service } = createMockDependencies({
    inscriptionRepo: {
      countActiveInscriptions: async () => 0
    }
  });

  await assert.rejects(
    service.updateActivity(1, {
      fechaInicio: '2026-11-05T10:00:00.000Z',
      validate: () => []
    }),
    (error) => error instanceof BusinessError && error.status === 400
  );
});

test('permite corregir datos no temporales de una clase pasada', async () => {
  const { service } = createMockDependencies({
    now: makeFixedNow('2026-11-07T00:00:00.000Z'),
    inscriptionRepo: {
      countActiveInscriptions: async () => 0
    }
  });

  const result = await service.updateActivity(1, {
    profesor: 'Nueva profesora',
    validate: () => []
  });

  assert.equal(result.profesor, 'Nueva profesora');
});

test('no permite crear una clase con inicio pasado', async () => {
  const { service } = createMockDependencies();

  await assert.rejects(
    service.createActivity({
      fechaInicio: '2026-11-05T10:00:00.000Z'
    }),
    (error) => error instanceof BusinessError && error.status === 400
  );
});
