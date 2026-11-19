import test from 'node:test';
import assert from 'node:assert/strict';
import { createActivityService } from '../src/modules/activities/services/activityService.js';
import { BusinessError } from '../src/modules/activities/errors.js';

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

  const inscriptionRepo = {
    withTransaction: async (work) => work({}),
    countConfirmed: async () => 2,
    countActiveInscriptions: async () => 0,
    countAllInscriptions: async () => 0,
    deleteInactiveInscriptionsByClass: async () => 0,
    ...(overrides.inscriptionRepo || {})
  };

  const now = overrides.now || makeFixedNow('2026-11-06T00:00:00.000Z');

  return {
    service: createActivityService({ activityRepo, inscriptionRepo, now }),
    activityRepo,
    inscriptionRepo,
    now
  };
};

test('getCurrentUserRole devuelve el tipo de rol del repositorio', async () => {
  const { service } = createMockDependencies();
  assert.equal(await service.getCurrentUserRole(4), 'gerente');
});

test('crear una clase con una sede inexistente devuelve un error de negocio 400', async () => {
  const foreignKeyError = Object.assign(new Error('foreign key violation'), {
    code: '23503',
    table: 'clase_grupal',
    constraint: 'actividad_grupal_id_sede_fkey'
  });
  const { service } = createMockDependencies({
    activityRepo: {
      createActivity: async () => {
        throw foreignKeyError;
      }
    }
  });

  await assert.rejects(
    () => service.createActivity({ fechaInicio: '2026-11-06T10:00:00.000Z' }),
    (error) =>
      error instanceof BusinessError &&
      error.status === 400 &&
      error.message === 'La sede seleccionada no existe.'
  );
});

test('actualizar una clase con una sede inexistente devuelve un error de negocio 400', async () => {
  const foreignKeyError = Object.assign(new Error('foreign key violation'), {
    code: '23503',
    table: 'clase_grupal',
    constraint: 'actividad_grupal_id_sede_fkey'
  });
  const { service } = createMockDependencies({
    activityRepo: {
      updateActivity: async () => {
        throw foreignKeyError;
      }
    }
  });

  await assert.rejects(
    () => service.updateActivity(1, { idSede: 999, validate: () => [] }),
    (error) =>
      error instanceof BusinessError &&
      error.status === 400 &&
      error.message === 'La sede seleccionada no existe.'
  );
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

test('Eliminación de clase: rechaza si la actividad tiene inscripciones activas', async () => {
  const { service } = createMockDependencies({
    inscriptionRepo: {
      countActiveInscriptions: async () => 3
    }
  });

  await assert.rejects(
    async () => service.deleteActivity(1),
    (err) =>
      err instanceof BusinessError &&
      err.status === 409 &&
      err.message.includes('3 inscripciones activas')
  );
});

test('Eliminación de clase: conserva la clase si solo tiene lista de espera', async () => {
  let deleteCalled = false;
  const { service } = createMockDependencies({
    activityRepo: {
      deleteActivity: async () => {
        deleteCalled = true;
      }
    },
    inscriptionRepo: {
      countConfirmed: async () => 0,
      countActiveInscriptions: async () => 1
    }
  });

  await assert.rejects(
    async () => service.deleteActivity(1),
    (error) =>
      error instanceof BusinessError &&
      error.status === 409 &&
      error.message.includes('1 inscripción activa')
  );
  assert.equal(deleteCalled, false);
});

test('Eliminar clase bloquea, limpia historial inactivo y borra dentro de la misma transacción', async () => {
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
      countActiveInscriptions: async (_id, transactionClient) => {
        llamadas.push(['count', transactionClient]);
        return 0;
      },
      deleteInactiveInscriptionsByClass: async (_id, transactionClient) => {
        llamadas.push(['cleanup', transactionClient]);
        return 2;
      },
      withTransaction: async (work) => work(client)
    }
  });

  await service.deleteActivity(1);

  assert.deepEqual(llamadas, [
    ['lock', client],
    ['count', client],
    ['cleanup', client],
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

test('getCurrentUserRole rechaza idRol nulo', async () => {
  const { service } = createMockDependencies();

  await assert.rejects(
    service.getCurrentUserRole(null),
    (error) => error instanceof BusinessError && error.status === 401
  );
});

test('getAssignedSiteForUser rechaza idUsuario nulo', async () => {
  const { service } = createMockDependencies();

  await assert.rejects(
    service.getAssignedSiteForUser(null),
    (error) => error instanceof BusinessError && error.status === 401
  );
});

test('getAssignedSiteForUser maneja error 42P01 (tabla usuario_sede no existe)', async () => {
  const { service } = createMockDependencies({
    activityRepo: {
      findAssignedSiteByUser: async () => {
        const error = new Error('relation "usuario_sede" does not exist');
        error.code = '42P01';
        throw error;
      }
    }
  });

  await assert.rejects(
    service.getAssignedSiteForUser(1),
    (error) => error instanceof BusinessError && error.status === 503
  );
});