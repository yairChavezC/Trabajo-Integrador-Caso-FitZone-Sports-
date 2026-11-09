import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../../config/db.js';
import * as inscriptionRepository from './inscriptionRepository.js';

test('inscriptionRepository usa transacciones y consulta sus operaciones', async (t) => {
  const llamadas = [];
  const client = {
    query: async (sql, values) => {
      llamadas.push({ sql, values });
      if (sql.includes('COUNT(*)')) return { rows: [{ total: 0 }] };
      if (sql.includes('SELECT EXISTS')) return { rows: [{ elegible: true }] };
      return { rows: [] };
    },
    release: () => llamadas.push({ sql: 'RELEASE' })
  };
  t.mock.method(pool, 'connect', async () => client);
  t.mock.method(pool, 'query', client.query);

  await inscriptionRepository.withTransaction(async (transactionClient) => {
    assert.equal(transactionClient, client);
    await transactionClient.query('SELECT 1');
  });
  assert.equal(await inscriptionRepository.countConfirmed(3), 0);
  assert.equal(await inscriptionRepository.countActiveInscriptions(3), 0);
  await inscriptionRepository.findActiveByUserAndClass(3, 5);
  await inscriptionRepository.insertInscription({ idClase: 3, idUsuario: 5, estado: 'confirmado' });
  await inscriptionRepository.cancelInscription(9);
  await inscriptionRepository.findNextWaitlist(3);
  await inscriptionRepository.promoteWaitlistInscription(9, 15);
  assert.equal(await inscriptionRepository.hasActiveMembership(5), true);
  await inscriptionRepository.expireWaitlistOffers(3);
  await inscriptionRepository.markIneligibleWaitlistEntries(3);
  await inscriptionRepository.acceptWaitlistOffer(3, 5);
  await inscriptionRepository.listByClass(3);

  assert.ok(llamadas.some(({ sql }) => sql === 'BEGIN'));
  assert.ok(llamadas.some(({ sql }) => sql === 'COMMIT'));
  assert.ok(llamadas.some(({ sql }) => sql === 'RELEASE'));
  assert.ok(llamadas.some(({ sql }) => sql.includes("estado IN ('confirmado', 'en espera', 'notificado')")));
  const classListQuery = llamadas.find(({ sql }) =>
    sql.includes('u.nombre AS "nombreUsuario"')
  );
  assert.ok(classListQuery);
  assert.doesNotMatch(classListQuery.sql, /u\.dni/);
  assert.doesNotMatch(classListQuery.sql, /u\.contacto/);
});
