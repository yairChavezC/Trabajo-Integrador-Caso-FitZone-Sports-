import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

const databaseIdentity = (connectionString) => {
  const url = new URL(connectionString);
  const protocol = url.protocol === 'postgresql:' ? 'postgres:' : url.protocol;
  const port = url.port || '5432';
  return `${protocol}//${url.hostname}:${port}${url.pathname}`;
};

test('Concurrencia - Módulo 3: no sobreventa de cupo en reservas de clases grupales', {
  skip: !testDatabaseUrl && 'Definí TEST_DATABASE_URL para ejecutar la prueba de concurrencia.'
}, async (t) => {
  if (!testDatabaseUrl) return;

  const applicationDatabaseUrl = process.env.DATABASE_URL;
  assert.notEqual(
    databaseIdentity(testDatabaseUrl),
    applicationDatabaseUrl ? databaseIdentity(applicationDatabaseUrl) : null,
    'TEST_DATABASE_URL no puede apuntar a la base configurada para la aplicación.'
  );

  process.env.DATABASE_URL = testDatabaseUrl;
 const [{ default: pool }, inscriptionService] = await Promise.all([
    import('../src/config/db.js'),
    import('../src/modules/activities/services/inscriptionService.js')
  ]);

  // Las columnas de fecha son TIMESTAMP WITHOUT TIME ZONE interpretadas como
  // hora de Buenos Aires por el repositorio. El INSERT directo debe respetar
  // esa convencion para no depender de la zona horaria del runner.
  const zonaAr = 'America/Argentina/Buenos_Aires';
  const aHoraAr = (fecha) => fecha.toLocaleString('sv-SE', { timeZone: zonaAr });

  const testRunId = `${String(Date.now()).slice(-5)}${Math.floor(Math.random() * 10)}`;
  const testDnis = [`88${testRunId}1`, `88${testRunId}2`];
  const userIds = [];
  const testClassIds = [];
  const testSiteIds = [];

  try {
    const [{ rows: roles }, { rows: sedes }, { rows: planes }] = await Promise.all([
      pool.query("SELECT id, tipo FROM public.rol WHERE tipo IN ('socio', 'gerente', 'recepcionista')"),
      pool.query('SELECT id FROM public.sede ORDER BY id LIMIT 1'),
      pool.query('SELECT id FROM public.plan ORDER BY id LIMIT 1')
    ]);
    const idRolSocio = roles.find(({ tipo }) => tipo === 'socio')?.id;
    const idPlan = planes[0]?.id;
    const idSede = sedes[0]?.id;

    if (!idRolSocio || !idPlan || !idSede) {
      throw new Error('La base de pruebas debe tener rol socio, un plan y una sede.');
    }

    for (let i = 0; i < testDnis.length; i++) {
      const dni = testDnis[i];
      const { rows: uRows } = await pool.query(
        `INSERT INTO public.usuario (dni, nombre, contacto, password, id_rol, activo)
         VALUES ($1, $2, $3, 'password_test_123', $4, TRUE)
         RETURNING id`,
        [dni, `Socio Concurrencia ${i + 1}`, `conc_${dni}@fitzone.test`, idRolSocio]
      );
      const uid = uRows[0].id;
      userIds.push(uid);

      await pool.query(
        'INSERT INTO public.suscripcion (id_usuario, id_plan, fecha_inicio, fecha_fin, estado, fecha_proximo_vencimiento) VALUES ($1, $2, CURRENT_DATE - 5, CURRENT_DATE + 30, $3, CURRENT_DATE + 30)',
        [uid, idPlan, 'activa']
      );
    }

    // Clase con cupo = 1 que inicia mañana (dentro de ventana de reserva 48h y > 2h de inicio)
    const fechaInicio = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const fechaFin = new Date(fechaInicio.getTime() + 60 * 60 * 1000);

    const { rows: cRows } = await pool.query(
      `INSERT INTO public.clase_grupal (id_sede, nombre, profesor, cupo, fecha_inicio, fecha_fin)
       VALUES ($1, $2, 'Profesor Concurrencia', 1, $3, $4)
       RETURNING id`,
      [idSede, `Clase Concurrencia ${testRunId}`, aHoraAr(fechaInicio), aHoraAr(fechaFin)]
    );
    const idClase = cRows[0].id;
    testClassIds.push(idClase);

    // Dos usuarios intentan reservar el mismo cupo (cupo=1) exactamente al mismo tiempo
    const resultados = await Promise.allSettled(
      userIds.map((idUsuario) => inscriptionService.reserveClass(idClase, idUsuario))
    );

    const confirmados = resultados.filter(
      (r) => r.status === 'fulfilled'
    ).length;
    const rechazados = resultados.filter(
      (r) => r.status === 'rejected'
    ).length;

    assert.equal(confirmados, 1, 'Exactamente una reserva debe confirmarse para un cupo de 1.');
    assert.equal(rechazados, 1, 'La segunda reserva debe ser rechazada por falta de cupo.');

    // Verificar en base de datos que solo existe una inscripción confirmada
    const { rows: inscripciones } = await pool.query(
      `SELECT estado FROM public.inscripciones_clase_grupal
       WHERE id_clase_grupal = $1 AND id_usuario = ANY($2::bigint[])
       ORDER BY id`,
      [idClase, userIds]
    );
    const estadosConfirmados = inscripciones.filter(({ estado }) => estado === 'confirmado').length;
    assert.equal(estadosConfirmados, 1, 'En base de datos debe haber exactamente una inscripción confirmada.');
  } finally {
    try {
      if (testClassIds.length > 0) {
        await pool.query(
          'DELETE FROM public.inscripciones_clase_grupal WHERE id_clase_grupal = ANY($1::bigint[])',
          [testClassIds]
        );
        await pool.query('DELETE FROM public.clase_grupal WHERE id = ANY($1::bigint[])', [testClassIds]);
      }
      if (testSiteIds.length > 0) {
        await pool.query('DELETE FROM public.sede WHERE id = ANY($1::bigint[])', [testSiteIds]);
      }
      if (userIds.length > 0) {
        await pool.query('DELETE FROM public.suscripcion WHERE id_usuario = ANY($1::bigint[])', [userIds]);
        await pool.query('DELETE FROM public.usuario WHERE id = ANY($1::bigint[])', [userIds]);
      }
    } finally {
      await pool.end();
    }
  }
});
