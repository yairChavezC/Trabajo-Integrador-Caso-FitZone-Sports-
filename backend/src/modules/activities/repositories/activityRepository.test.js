import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../../config/db.js';
import * as activityRepository from './activityRepository.js';

test('activityRepository usa sus consultas y clientes de transacción', async (t) => {
  const llamadas = [];
  t.mock.method(pool, 'query', async (sql, values) => {
    llamadas.push({ sql, values });
    if (sql.includes('COUNT(*) AS confirmados')) return { rows: [] };
    if (sql.includes('DISTINCT id_clase_grupal')) return { rows: [{ idClase: 8 }] };
    if (sql.includes('SELECT tipo')) return { rows: [{ tipo: 'socio' }] };
    if (sql.includes('SELECT id_sede AS "idSede"')) return { rows: [{ idSede: 4 }] };
    return { rows: [{ id: 8 }] };
  });

  const clientLlamadas = [];
  const client = {
    query: async (sql, values) => {
      clientLlamadas.push({ sql, values });
      return { rows: [{ id: 8 }] };
    }
  };

  await activityRepository.findAllActivities(5, 4);
  await activityRepository.findActivityById(8, 5);
  await activityRepository.findMyRegistrations(5);
  assert.equal(await activityRepository.findRoleTypeById(3), 'socio');
  assert.equal(await activityRepository.findAssignedSiteByUser(5), 4);
  assert.deepEqual(await activityRepository.findClassesWithExpiredOffers(), [8]);
  await activityRepository.lockActivityById(8, client);
  await activityRepository.createActivity({
    idSede: 4,
    nombre: 'Yoga',
    profesor: 'Ana',
    cupo: 8,
    fechaInicio: new Date(),
    fechaFin: new Date()
  });
  await activityRepository.updateActivity(8, {
    idSede: 4,
    nombre: 'Yoga',
    profesor: 'Ana',
    cupo: 8,
    fechaInicio: new Date(),
    fechaFin: new Date()
  }, client);
  await activityRepository.deleteActivity(8, client);

  assert.ok(llamadas.length >= 7);
  assert.equal(clientLlamadas.length, 3);
  assert.match(llamadas[0].sql, /c\.fecha_fin >= NOW\(\)/);
});
