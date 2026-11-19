import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../src/config/db.js';
import * as notificationRepository from '../src/modules/activities/repositories/notificationRepository.js';

test('notificationRepository restringe por socio y conserva notificaciones leídas', async (t) => {
  const llamadas = [];
  const pendientes = {
    id: 17,
    tipo: 'cupo_liberado',
    mensaje: 'Se liberó un lugar.',
    idClase: 8,
    idInscripcion: 22,
    leidaAt: null,
    creadaAt: '2026-11-13T10:00:00.000Z',
    estadoInscripcion: 'notificado',
    fechaExpiracionOferta: '2026-11-13T10:15:00.000Z',
    ofertaVencida: false
  };
  const leida = { ...pendientes, leidaAt: '2026-11-13T10:05:00.000Z' };

  t.mock.method(pool, 'query', async (sql, values) => {
    llamadas.push({ sql, values });
    if (values[1] === 45) return { rows: [] };
    return { rows: [llamadas.length === 2 ? leida : pendientes] };
  });

  assert.deepEqual(await notificationRepository.findByUser(44), [pendientes]);
  assert.deepEqual(await notificationRepository.markAsRead(17, 44), leida);
  assert.equal(await notificationRepository.markAsRead(17, 45), null);

  assert.match(llamadas[0].sql, /WHERE n\.id_usuario = \$1/);
  assert.doesNotMatch(llamadas[0].sql, /leida_at IS NULL/);
  assert.match(llamadas[0].sql, /i\.estado = 'expirado'/);
  assert.match(llamadas[1].sql, /WHERE id = \$1\s+AND id_usuario = \$2/);
  assert.match(llamadas[1].sql, /COALESCE\(leida_at, NOW\(\)\)/);
  assert.deepEqual(llamadas.map(({ values }) => values), [[44], [17, 44], [17, 45]]);
});