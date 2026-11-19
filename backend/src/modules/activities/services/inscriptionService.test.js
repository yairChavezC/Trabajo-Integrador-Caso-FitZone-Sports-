import test from 'node:test';
import assert from 'node:assert/strict';
import { createInscriptionService } from './inscriptionService.js';
import { BusinessError } from '../errors.js';
import { createWaitlistSubject } from '../observers/waitlistObserver.js';

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
    findMyRegistrations: async () => [],
    findClassesWithExpiredOffers: async () => [1],
    ...(overrides.activityRepo || {})
  };

  const transactionClient = {};
  const inscriptionRepo = {
    withTransaction: async (work) => work(transactionClient),
    findActiveByUserAndClass: async () => null,
    countConfirmed: async () => 2,
    insertInscription: async (data) => ({ id: 101, ...data, fechaRegistro: new Date().toISOString() }),
    cancelInscription: async (id) => ({ id, estado: 'cancelado' }),
    countActiveInscriptions: async () => 0,
    countAllInscriptions: async () => 0,
    expireWaitlistOffers: async () => [],
    promoteWaitlistInscription: async (id) => ({
      id,
      idUsuario: 20,
      estado: 'notificado',
      fechaExpiracionOferta: new Date(Date.now() + 15 * 60000).toISOString()
    }),
    acceptWaitlistOffer: async () => null,
    listByClass: async () => [],
    findUltimaCancelacionTardia: async () => null,
    ...(overrides.inscriptionRepo || {})
  };

  const membershipRepo = {
    hasActiveMembership: async (idUsuario) => idUsuario === 10,
    findNextWaitlist: async () => null,
    markIneligibleWaitlistEntries: async () => [],
    ...(overrides.membershipRepo || {})
  };

  const persistedNotifications = [];
  const notificationRepo = {
    createWaitlistPromotion: async (evento, client) => {
      persistedNotifications.push({ evento, client });
    },
    ...(overrides.notificationRepo || {})
  };

  const notifiedEvents = [];
  const waitlistSubject = createWaitlistSubject(
    notificationRepo,
    overrides.waitlistObservers || [
      {
        async update(evento) {
          notifiedEvents.push(evento);
        }
      }
    ]
  );

  const now = overrides.now || makeFixedNow('2026-11-06T00:00:00.000Z');

  return {
    service: createInscriptionService({
      activityRepo,
      inscriptionRepo,
      membershipRepo,
      notificationRepo,
      waitlistSubject,
      now
    }),
    activityRepo,
    inscriptionRepo,
    membershipRepo,
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

test('Reserva: con membresía activa confirma el cupo correctamente', async () => {
  const { service, notifiedEvents } = createMockDependencies({
    membershipRepo: {
      hasActiveMembership: async (uid) => uid === 10
    },
    inscriptionRepo: {
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
    membershipRepo: {
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
    membershipRepo: {
      hasActiveMembership: async () => true
    },
    inscriptionRepo: {
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
    membershipRepo: {
      hasActiveMembership: async () => true
    },
    inscriptionRepo: {
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
    membershipRepo: {
      hasActiveMembership: async () => true
    },
    inscriptionRepo: {
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
    membershipRepo: {
      hasActiveMembership: async () => true
    },
    inscriptionRepo: {
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
    membershipRepo: {
      hasActiveMembership: async () => true,
      findNextWaitlist: async () => ({ id: 77, idUsuario: 33 }),
      markIneligibleWaitlistEntries: async () => []
    },
    inscriptionRepo: {
      findActiveByUserAndClass: async () => ({ id: 45, estado: 'confirmado' }),
      cancelInscription: async (id) => ({ id, estado: 'cancelado' }),
      countConfirmed: async () => 4, // tras cancelar, queda en 4 de 5
      promoteWaitlistInscription: async (id) => { promotedId = id; return { id, idUsuario: 33, estado: 'notificado' } }
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
    membershipRepo: {
      hasActiveMembership: async () => true,
      findNextWaitlist: async () => ({ id: 77, idUsuario: 33 }),
      markIneligibleWaitlistEntries: async () => []
    },
    inscriptionRepo: {
      findActiveByUserAndClass: async () => ({ id: 45, estado: 'confirmado' }),
      cancelInscription: async (id) => ({ id, estado: 'cancelado' }),
      countConfirmed: async () => 4,
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

test('un fallo en un observer secundario no revierte la cancelación ni la oferta', async () => {
  const errors = [];
  const originalError = console.error;
  console.error = (...args) => errors.push(args);

  try {
    const { service, persistedNotifications, notifiedEvents, waitlistSubject } = createMockDependencies({
      membershipRepo: {
        hasActiveMembership: async () => true,
        findNextWaitlist: async () => ({ id: 77, idUsuario: 33 }),
        markIneligibleWaitlistEntries: async () => []
      },
      inscriptionRepo: {
        findActiveByUserAndClass: async () => ({ id: 45, estado: 'confirmado' }),
        cancelInscription: async (id) => ({ id, estado: 'cancelado' }),
        countConfirmed: async () => 4,
        promoteWaitlistInscription: async (id) => ({ id, idUsuario: 33, estado: 'notificado' })
      }
    });
    waitlistSubject.subscribe({
      async update() {
        throw new Error('Fallo del observer secundario.');
      }
    });

    const result = await service.cancelClassReservation(1, 10);

    assert.equal(result.cancelada.estado, 'cancelado');
    assert.equal(result.oferta.idUsuario, 33);
    assert.equal(persistedNotifications.length, 1);
    assert.equal(notifiedEvents.length, 1);
    assert.equal(errors.length, 1);
    assert.match(errors[0][0], /Error notificando Object/);
  } finally {
    console.error = originalError;
  }
});

test('Cancelación: reserva confirmada con menos de 2 horas se cancela como tardía', async () => {
  let canceladaConEstado = null;
  const ahora = makeFixedNow('2026-11-06T09:30:00.000Z'); // 30 minutos antes del inicio (10:00)
  const { service } = createMockDependencies({
    now: ahora,
    membershipRepo: {
      hasActiveMembership: async () => true
    },
    inscriptionRepo: {
      findActiveByUserAndClass: async () => ({ id: 45, estado: 'confirmado' }),
      cancelInscription: async (id, { estado, fechaCancelacion }) => {
        canceladaConEstado = { estado, fechaCancelacion };
        return { id, estado, fecha_cancelacion: fechaCancelacion };
      }
    }
  });

  const res = await service.cancelClassReservation(1, 10);
  assert.equal(res.cancelada.estado, 'cancelado_tarde');
  assert.equal(canceladaConEstado.estado, 'cancelado_tarde');
  assert.ok(canceladaConEstado.fechaCancelacion);
});

test('Cancelación: socio en lista de espera puede cancelar con menos de 2 horas antes de la clase', async () => {
  const { service, notifiedEvents } = createMockDependencies({
    now: makeFixedNow('2026-11-06T09:15:00.000Z'), // 45 minutos antes del inicio
    membershipRepo: {
      hasActiveMembership: async () => true
    },
    inscriptionRepo: {
      findActiveByUserAndClass: async () => ({ id: 62, estado: 'en espera' }),
      cancelInscription: async (id) => ({ id, estado: 'cancelado' })
    }
  });

  const res = await service.cancelClassReservation(1, 10);
  assert.equal(res.cancelada.id, 62);
  assert.equal(res.cancelada.estado, 'cancelado');
  assert.equal(notifiedEvents.length, 0);
});

test('Cancelación: oferta notificada cancelada con menos de 2 horas se libera y ofrece al siguiente', async () => {
  const { service, notifiedEvents } = createMockDependencies({
    now: makeFixedNow('2026-11-06T09:00:00.000Z'), // 1 hora antes del inicio
    membershipRepo: {
      hasActiveMembership: async () => true,
      findNextWaitlist: async () => ({ id: 88, idUsuario: 44 }),
      markIneligibleWaitlistEntries: async () => []
    },
    inscriptionRepo: {
      findActiveByUserAndClass: async () => ({ id: 70, estado: 'notificado' }),
      cancelInscription: async (id) => ({ id, estado: 'cancelado' }),
      countConfirmed: async () => 4,
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
    membershipRepo: {
      hasActiveMembership: async () => true
    },
    inscriptionRepo: {
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

test('Aceptación de oferta: requiere usuario autenticado y una clase existente', async () => {
  const { service } = createMockDependencies({
    activityRepo: {
      lockActivityById: async () => null
    }
  });

  await assert.rejects(
    service.acceptWaitlistOfferForUser(1, null),
    (error) => error instanceof BusinessError && error.status === 401
  );
  await assert.rejects(
    service.acceptWaitlistOfferForUser(1, 10),
    (error) => error instanceof BusinessError && error.status === 404
  );
});

test('Aceptación de oferta: rechaza oferta vencida o inexistente', async () => {
  const { service } = createMockDependencies({
    membershipRepo: {
      hasActiveMembership: async () => true
    },
    inscriptionRepo: {
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
    membershipRepo: {
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
    membershipRepo: {
      hasActiveMembership: async () => true,
      findNextWaitlist: async () => {
        const candidate = waitlistCandidates.shift();
        if (candidate) currentConfirmed += 1;
        return candidate || null;
      },
      markIneligibleWaitlistEntries: async () => []
    },
    inscriptionRepo: {
      countConfirmed: async () => currentConfirmed,
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

test('el vencimiento de ofertas ignora clases que ya no existen', async () => {
  let transaccionIniciada = false;
  const { service } = createMockDependencies({
    activityRepo: {
      findClassesWithExpiredOffers: async () => [404],
      lockActivityById: async () => null
    },
    inscriptionRepo: {
      withTransaction: async (work) => {
        transaccionIniciada = true;
        return work({});
      },
      expireWaitlistOffers: async () => {
        assert.fail('No debe procesar ofertas si la clase no existe');
      }
    }
  });

  await service.processExpiredWaitlistOffers();
  assert.equal(transaccionIniciada, true);
});

test('Reserva: bloqueada por cancelación tardía vigente', async () => {
  const ahora = makeFixedNow('2026-11-06T08:00:00.000Z');
  const fechaCancelacionTardia = new Date(ahora() - 2 * 60 * 60 * 1000).toISOString();
  const { service } = createMockDependencies({
    now: ahora,
    membershipRepo: {
      hasActiveMembership: async () => true
    },
    inscriptionRepo: {
      findActiveByUserAndClass: async () => null,
      countConfirmed: async () => 2,
      findUltimaCancelacionTardia: async () => ({ fecha_cancelacion: fechaCancelacionTardia })
    }
  });

  await assert.rejects(
    async () => service.reserveClass(1, 10),
    (err) => err instanceof BusinessError && err.status === 409
  );
});

test('Lista de espera: bloqueada por cancelación tardía vigente', async () => {
  const ahora = makeFixedNow('2026-11-06T08:00:00.000Z');
  const fechaCancelacionTardia = new Date(ahora() - 1 * 60 * 60 * 1000).toISOString();
  const { service } = createMockDependencies({
    now: ahora,
    membershipRepo: {
      hasActiveMembership: async () => true
    },
    inscriptionRepo: {
      findActiveByUserAndClass: async () => null,
      countConfirmed: async () => 5,
      findUltimaCancelacionTardia: async () => ({ fecha_cancelacion: fechaCancelacionTardia })
    }
  });

  await assert.rejects(
    async () => service.joinWaitlist(1, 10),
    (err) => err instanceof BusinessError && err.status === 409
  );
});

test('Aceptación de oferta: bloqueada por cancelación tardía vigente', async () => {
  const ahora = makeFixedNow('2026-11-06T08:00:00.000Z');
  const fechaCancelacionTardia = new Date(ahora() - 1 * 60 * 60 * 1000).toISOString();
  const { service } = createMockDependencies({
    now: ahora,
    membershipRepo: {
      hasActiveMembership: async () => true
    },
    inscriptionRepo: {
      findUltimaCancelacionTardia: async () => ({ fecha_cancelacion: fechaCancelacionTardia })
    }
  });

  await assert.rejects(
    async () => service.acceptWaitlistOfferForUser(1, 10),
    (err) => err instanceof BusinessError && err.status === 409
  );
});

test('Reserva: no bloqueada cuando la cancelación tardía venció', async () => {
  const ahora = makeFixedNow('2026-11-06T08:00:00.000Z');
  const fechaCancelacionTardia = new Date(ahora() - 100 * 60 * 60 * 1000).toISOString();
  const { service } = createMockDependencies({
    now: ahora,
    membershipRepo: {
      hasActiveMembership: async () => true
    },
    inscriptionRepo: {
      findActiveByUserAndClass: async () => null,
      countConfirmed: async () => 2,
      insertInscription: async (data) => ({ id: 50, ...data }),
      findUltimaCancelacionTardia: async () => ({ fecha_cancelacion: fechaCancelacionTardia })
    }
  });

  const res = await service.reserveClass(1, 10);
  assert.equal(res.estado, 'confirmado');
});
