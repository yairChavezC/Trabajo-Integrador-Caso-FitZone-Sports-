import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { BusinessError } from './errors.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

const databaseIdentity = (connectionString) => {
  const url = new URL(connectionString);
  const protocol = url.protocol === 'postgresql:' ? 'postgres:' : url.protocol;
  const port = url.port || '5432';
  return `${protocol}//${url.hostname}:${port}${url.pathname}`;
};

const invokeController = async (controller, req) => {
  const response = { statusCode: 200, body: null };
  const res = {
    status(code) {
      response.statusCode = code;
      return this;
    },
    json(body) {
      response.body = body;
      return this;
    },
    location() {
      return this;
    }
  };

  await controller(req, res);
  return response;
};

test('Integración PostgreSQL - Módulo 3 Clases Grupales', {
  skip: !testDatabaseUrl && 'Definí TEST_DATABASE_URL para ejecutar la prueba de integración.'
}, async (t) => {
  const applicationDatabaseUrl = process.env.DATABASE_URL;
  assert.notEqual(
    databaseIdentity(testDatabaseUrl),
    applicationDatabaseUrl ? databaseIdentity(applicationDatabaseUrl) : null,
    'TEST_DATABASE_URL no puede apuntar a la base configurada para la aplicación.'
  );

  process.env.DATABASE_URL = testDatabaseUrl;
  const [{ default: pool }, activityService, inscriptionService] = await Promise.all([
    import('../../config/db.js'),
    import('./services/activityService.js'),
    import('./services/inscriptionService.js')
  ]);
  const activityController = await import('./controllers/activityController.js');

  // Generador de IDs únicos para datos de prueba aislados
  const testRunId = `${String(Date.now()).slice(-5)}${Math.floor(Math.random() * 10)}`;
  const testDnis = [
    `99${testRunId}1`,
    `99${testRunId}2`,
    `99${testRunId}3`,
    `99${testRunId}4`
  ];
  const userIds = [];
  let testClassId = null;
  const testClassIds = [];
  const testSiteIds = [];
  let endpointServer;

  try {
    const [{ rows: roles }, { rows: sedes }, { rows: planes }] = await Promise.all([
      pool.query("SELECT id, tipo FROM public.rol WHERE tipo IN ('socio', 'gerente', 'recepcionista')"),
      pool.query('SELECT id FROM public.sede ORDER BY id LIMIT 1'),
      pool.query('SELECT id FROM public.plan ORDER BY id LIMIT 1')
    ]);
    const idRolSocio = roles.find(({ tipo }) => tipo === 'socio')?.id;
    const idRolGerente = roles.find(({ tipo }) => tipo === 'gerente')?.id;
    const idRolRecepcionista = roles.find(({ tipo }) => tipo === 'recepcionista')?.id;
    if (!idRolSocio || !idRolGerente || !idRolRecepcionista || !sedes[0] || !planes[0]) {
      throw new Error('La base de pruebas debe tener roles de socio, gerente y recepcionista, una sede y un plan.');
    }

    const idSede = sedes[0].id;
    const idPlan = planes[0].id;
    const { rows: otraSedeRows } = await pool.query(
      `INSERT INTO public.sede (id, nombre, provincia, ciudad, cupo, activa)
       SELECT COALESCE(MAX(id), 0) + 1, $1, 'Entre Ríos', 'Concordia', 50, TRUE
       FROM public.sede
       RETURNING id`,
      [`Sede externa test ${testRunId}`]
    );
    const idOtraSede = otraSedeRows[0].id;
    testSiteIds.push(idOtraSede);

    for (let i = 0; i < testDnis.length; i++) {
      const dni = testDnis[i];
      const { rows: uRows } = await pool.query(
        `INSERT INTO public.usuario (dni, nombre, contacto, password, id_rol, activo)
         VALUES ($1, $2, $3, 'password_test_123', $4, TRUE)
         RETURNING id`,
        [dni, `Socio Test ${i + 1}`, `test_${dni}@fitzone.test`, idRolSocio]
      );
      const uid = uRows[0].id;
      userIds.push(uid);

      await pool.query(
        `INSERT INTO public.suscripcion (id_usuario, id_plan, fecha_inicio, fecha_fin, estado, fecha_proximo_vencimiento)
         VALUES ($1, $2, CURRENT_DATE - 5, CURRENT_DATE + 30, 'activa', CURRENT_DATE + 30)`,
        [uid, idPlan]
      );
    }

    const { rows: recepcionistaRows } = await pool.query(
      `INSERT INTO public.usuario (dni, nombre, contacto, password, id_rol, activo)
       VALUES ($1, 'Recepcionista Test', $2, 'password_test_123', $3, TRUE)
       RETURNING id`,
      [`98${testRunId}1`, `recepcionista_${testRunId}@fitzone.test`, idRolRecepcionista]
    );
    const idRecepcionista = recepcionistaRows[0].id;
    userIds.push(idRecepcionista);
    await pool.query(
      'INSERT INTO public.usuario_sede (id_usuario, id_sede) VALUES ($1, $2)',
      [idRecepcionista, idSede]
    );

    const { rows: gerenteRows } = await pool.query(
      `INSERT INTO public.usuario (dni, nombre, contacto, password, id_rol, activo)
       VALUES ($1, 'Gerente Test', $2, 'password_test_123', $3, TRUE)
       RETURNING id`,
      [`98${testRunId}2`, `gerente_${testRunId}@fitzone.test`, idRolGerente]
    );
    const idGerente = gerenteRows[0].id;
    userIds.push(idGerente);

    // Crear clase grupal de prueba con cupo = 1 que inicia mañana a las 10:00 (dentro de ventana 48h y > 2h)
    const fechaInicio = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const fechaFin = new Date(fechaInicio.getTime() + 60 * 60 * 1000);

    const { rows: cRows } = await pool.query(
      `INSERT INTO public.clase_grupal (id_sede, nombre, profesor, cupo, fecha_inicio, fecha_fin)
       VALUES ($1, $2, 'Profesor Test', 1, $3, $4)
       RETURNING id, cupo, fecha_inicio AS "fechaInicio"`,
      [idSede, `Clase Test Integ ${testRunId}`, fechaInicio, fechaFin]
    );
    testClassId = cRows[0].id;
    testClassIds.push(testClassId);

    const { rows: otraClaseRows } = await pool.query(
      `INSERT INTO public.clase_grupal (id_sede, nombre, profesor, cupo, fecha_inicio, fecha_fin)
       VALUES ($1, $2, 'Profesor Otra Sede', 1, $3, $4)
       RETURNING id`,
      [
        idOtraSede,
        `Clase otra sede ${testRunId}`,
        new Date(Date.now() + 48 * 60 * 60 * 1000),
        new Date(Date.now() + 49 * 60 * 60 * 1000)
      ]
    );
    const idClaseOtraSede = otraClaseRows[0].id;
    testClassIds.push(idClaseOtraSede);
    const { rows: inscripcionesOtraSedeRows } = await pool.query(
      `INSERT INTO public.inscripciones_clase_grupal (id_clase_grupal, id_usuario, estado)
       VALUES ($1, $2, 'confirmado')
       RETURNING id`,
      [idClaseOtraSede, userIds[0]]
    );
    const idInscripcionOtraSede = inscripcionesOtraSedeRows[0].id;

    const [{ default: express }, { default: activityRoutes }] = await Promise.all([
      import('express'),
      import('./routes/activityRoutes.js')
    ]);
    const endpointApp = express();
    endpointApp.use(express.json());
    endpointApp.use((req, _res, next) => {
      req.usuario = {
        id: Number(req.header('x-test-user-id')),
        rol: Number(req.header('x-test-role-id'))
      };
      next();
    });
    endpointApp.use('/clases', activityRoutes);
    endpointServer = endpointApp.listen(0, '127.0.0.1');
    await new Promise((resolve, reject) => {
      endpointServer.once('listening', resolve);
      endpointServer.once('error', reject);
    });
    const endpointBase = `http://127.0.0.1:${endpointServer.address().port}/clases`;
    const requestEndpoint = async (path, { idUsuario, idRol, method = 'GET', body } = {}) => {
      const response = await fetch(`${endpointBase}${path}`, {
        method,
        headers: {
          'x-test-user-id': String(idUsuario),
          'x-test-role-id': String(idRol),
          ...(body ? { 'content-type': 'application/json' } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {})
      });
      return {
        status: response.status,
        body: await response.json()
      };
    };

    await t.test('Endpoints: la consulta de clases respeta el alcance por rol y sede', async () => {
      const recepcionistaResponse = await requestEndpoint(`?idSede=${idOtraSede}`, {
        idUsuario: idRecepcionista,
        idRol: idRolRecepcionista
      });
      assert.equal(recepcionistaResponse.status, 200);
      assert.ok(recepcionistaResponse.body.some(({ id }) => Number(id) === Number(testClassId)));
      assert.equal(
        recepcionistaResponse.body.some(({ id }) => Number(id) === Number(idClaseOtraSede)),
        false,
        'El recepcionista no debe recibir clases de otra sede aunque solicite ese filtro.'
      );
      assert.ok(
        recepcionistaResponse.body.every(({ idSede: idSedeClase }) => Number(idSedeClase) === Number(idSede))
      );

      const gerenteResponse = await requestEndpoint(`?idSede=${idOtraSede}`, {
        idUsuario: idGerente,
        idRol: idRolGerente
      });
      assert.equal(gerenteResponse.status, 200);
      assert.ok(gerenteResponse.body.some(({ id }) => Number(id) === Number(idClaseOtraSede)));
      const gerenteInscripciones = await requestEndpoint(
        `/${idClaseOtraSede}/inscripciones`,
        { idUsuario: idGerente, idRol: idRolGerente }
      );
      assert.equal(gerenteInscripciones.status, 200);
      assert.ok(
        gerenteInscripciones.body.some(({ id }) => Number(id) === Number(idInscripcionOtraSede))
      );

      const socioResponse = await requestEndpoint(`?idSede=${idOtraSede}`, {
        idUsuario: userIds[0],
        idRol: idRolSocio
      });
      assert.equal(socioResponse.status, 200);
      assert.ok(socioResponse.body.some(({ id }) => Number(id) === Number(idClaseOtraSede)));
    });

    await t.test('Endpoints: recepcionista no puede consultar inscripciones ni modificar o eliminar clases ajenas', async () => {
      const requestAsRecepcionista = { idUsuario: idRecepcionista, idRol: idRolRecepcionista };
      const propia = await requestEndpoint(`/${testClassId}/inscripciones`, requestAsRecepcionista);
      assert.equal(propia.status, 200, 'Debe poder consultar inscripciones de su sede.');

      const inscripcionesAjenas = await requestEndpoint(
        `/${idClaseOtraSede}/inscripciones`,
        requestAsRecepcionista
      );
      assert.equal(inscripcionesAjenas.status, 403);

      const detalleAjeno = await requestEndpoint(`/${idClaseOtraSede}`, requestAsRecepcionista);
      assert.equal(detalleAjeno.status, 403);

      const modificacionAjena = await requestEndpoint(`/${idClaseOtraSede}`, {
        ...requestAsRecepcionista,
        method: 'PUT',
        body: { nombre: 'Nombre alterado desde otra sede' }
      });
      assert.equal(modificacionAjena.status, 403);

      const eliminacionAjena = await requestEndpoint(`/${idClaseOtraSede}`, {
        ...requestAsRecepcionista,
        method: 'DELETE'
      });
      assert.equal(eliminacionAjena.status, 403);

      const { rows } = await pool.query(
        'SELECT nombre, id_sede FROM public.clase_grupal WHERE id = $1',
        [idClaseOtraSede]
      );
      assert.equal(rows[0].nombre, `Clase otra sede ${testRunId}`);
      assert.equal(Number(rows[0].id_sede), Number(idOtraSede));
    });

    await t.test('Crear clase con una sede inexistente devuelve HTTP 400', async () => {
      const fechaInicioInvalida = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const response = await invokeController(activityController.createActivity, {
        body: {
          idSede: 987654321,
          nombre: 'Clase con sede inválida',
          profesor: 'Profesor Test',
          cupo: 5,
          fechaInicio: fechaInicioInvalida.toISOString(),
          fechaFin: new Date(fechaInicioInvalida.getTime() + 60 * 60 * 1000).toISOString()
        }
      });

      assert.equal(response.statusCode, 400);
      assert.equal(response.body.message, 'La sede seleccionada no existe.');
    });

    await t.test('Actualizar clase con una sede inexistente devuelve HTTP 400', async () => {
      const response = await invokeController(activityController.updateActivity, {
        params: { id: String(testClassId) },
        body: { idSede: 987654321 }
      });

      assert.equal(response.statusCode, 400);
      assert.equal(response.body.message, 'La sede seleccionada no existe.');

      const { rows } = await pool.query(
        'SELECT id_sede FROM public.clase_grupal WHERE id = $1',
        [testClassId]
      );
      assert.equal(Number(rows[0].id_sede), Number(idSede));
    });

    // -------------------------------------------------------------
    // Escenario 1: Reserva exitosa en PostgreSQL
    // -------------------------------------------------------------
    await t.test('1. Reserva con membresía activa persiste estado "confirmado"', async () => {
      const socio1 = userIds[0];
      const inscripcion = await inscriptionService.reserveClass(testClassId, socio1);
      assert.ok(inscripcion.id, 'Debe generar un id');
      assert.equal(inscripcion.estado, 'confirmado');
      assert.equal(inscripcion.idClase, testClassId);
      assert.equal(inscripcion.idUsuario, socio1);

      // Verificar directamente en la base de datos
      const { rows } = await pool.query(
        `SELECT estado FROM public.inscripciones_clase_grupal WHERE id = $1`,
        [inscripcion.id]
      );
      assert.equal(rows[0].estado, 'confirmado');
    });

    // -------------------------------------------------------------
    // Escenario 2: Evitar reserva duplicada activa
    // -------------------------------------------------------------
    await t.test('2. Intento de reserva duplicada es rechazado con 409', async () => {
      const socio1 = userIds[0];
      await assert.rejects(
        async () => inscriptionService.reserveClass(testClassId, socio1),
        (err) => err instanceof BusinessError && err.status === 409
      );
    });

    // -------------------------------------------------------------
    // Escenario 3: Reservas concurrentes por el último cupo
    // -------------------------------------------------------------
    await t.test('3. Operaciones concurrentes: dos socios compitiendo por un cupo disponible', async () => {
      // Crear una clase adicional con cupo = 1
      const fInicio = new Date(Date.now() + 20 * 60 * 60 * 1000);
      const fFin = new Date(fInicio.getTime() + 60 * 60 * 1000);
      const { rows: clRows } = await pool.query(
        `INSERT INTO public.clase_grupal (id_sede, nombre, profesor, cupo, fecha_inicio, fecha_fin)
         VALUES ($1, $2, 'Profe Concurrente', 1, $3, $4)
         RETURNING id`,
        [idSede, `Concurrencia Test ${testRunId}`, fInicio, fFin]
      );
      const concClaseId = clRows[0].id;
      testClassIds.push(concClaseId);

      try {
        const socioA = userIds[1];
        const socioB = userIds[2];

        // Disparo concurrente
        const [resA, resB] = await Promise.allSettled([
          inscriptionService.reserveClass(concClaseId, socioA),
          inscriptionService.reserveClass(concClaseId, socioB)
        ]);

        const exitos = [resA, resB].filter((r) => r.status === 'fulfilled');
        const rechazados = [resA, resB].filter((r) => r.status === 'rejected');

        assert.equal(exitos.length, 1, 'Exactamente una reserva debe ganar el cupo');
        assert.equal(rechazados.length, 1, 'La otra reserva debe ser rechazada');
        assert.equal(rechazados[0].reason.status, 409, 'El error debe ser 409 de capacidad completa');

        // Verificar conteo en BD: solo 1 reserva confirmada
        const { rows } = await pool.query(
          `SELECT COUNT(*)::int AS total FROM public.inscripciones_clase_grupal
           WHERE id_clase_grupal = $1 AND estado = 'confirmado'`,
          [concClaseId]
        );
        assert.equal(rows[0].total, 1);
      } finally {
        await pool.query('DELETE FROM public.inscripciones_clase_grupal WHERE id_clase_grupal = $1', [concClaseId]);
        await pool.query('DELETE FROM public.clase_grupal WHERE id = $1', [concClaseId]);
      }
    });

    // -------------------------------------------------------------
    // Escenario 4: Flujo completo de Lista de Espera, Observer y Ofertas
    // -------------------------------------------------------------
    await t.test('4. Lista de espera, promoción por observer, vencimiento y confirmación de oferta', async () => {
      const socio1 = userIds[0]; // Ya tiene el cupo confirmado
      const socio2 = userIds[1]; // Entrará a lista de espera
      const socio3 = userIds[2]; // Entrará a lista de espera segundo

      // Socio 2 se une a lista de espera
      const esperaSocio2 = await inscriptionService.joinWaitlist(testClassId, socio2);
      assert.equal(esperaSocio2.estado, 'en espera');

      // Socio 3 se une a lista de espera
      const esperaSocio3 = await inscriptionService.joinWaitlist(testClassId, socio3);
      assert.equal(esperaSocio3.estado, 'en espera');

      // Socio 1 cancela su reserva con más de 2 horas
      const cancelacion = await inscriptionService.cancelClassReservation(testClassId, socio1);
      assert.equal(cancelacion.cancelada.estado, 'cancelado');
      assert.ok(cancelacion.oferta, 'Debe generarse una oferta');
      assert.equal(cancelacion.oferta.idUsuario, socio2);

      // Verificar que socio 2 pasó a 'notificado' con fecha de expiración
      const { rows: rowsSocio2 } = await pool.query(
        `SELECT estado, fecha_expiracion_oferta FROM public.inscripciones_clase_grupal WHERE id = $1`,
        [esperaSocio2.id]
      );
      assert.equal(rowsSocio2[0].estado, 'notificado');
      assert.ok(rowsSocio2[0].fecha_expiracion_oferta !== null);

      // Verificar que el observer persistió la notificación en notificaciones_clase_grupal
      const { rows: notifs } = await pool.query(
        `SELECT id, tipo, mensaje, id_usuario FROM public.notificaciones_clase_grupal
         WHERE id_clase_grupal = $1 AND id_usuario = $2`,
        [testClassId, socio2]
      );
      assert.equal(notifs.length, 1);
      assert.equal(notifs[0].tipo, 'cupo_liberado');

      const idNotificacion = notifs[0].id;
      const notificacionesSocio = await invokeController(activityController.getClassNotifications, {
        usuario: { id: socio2 }
      });
      assert.equal(notificacionesSocio.statusCode, 200);
      const notificacionSocio = notificacionesSocio.body.find(
        ({ id }) => Number(id) === Number(idNotificacion)
      );
      assert.ok(notificacionSocio);
      assert.equal(notificacionSocio.estadoInscripcion, 'notificado');
      assert.equal(notificacionSocio.ofertaVencida, false);

      const notificacionesOtroSocio = await invokeController(
        activityController.getClassNotifications,
        { usuario: { id: socio3 } }
      );
      assert.equal(notificacionesOtroSocio.statusCode, 200);
      assert.equal(
        notificacionesOtroSocio.body.some(({ id }) => Number(id) === Number(idNotificacion)),
        false
      );

      const lecturaAjena = await invokeController(
        activityController.markClassNotificationAsRead,
        { usuario: { id: socio3 }, params: { id: String(idNotificacion) } }
      );
      assert.equal(lecturaAjena.statusCode, 404);

      const lecturaPropia = await invokeController(
        activityController.markClassNotificationAsRead,
        { usuario: { id: socio2 }, params: { id: String(idNotificacion) } }
      );
      assert.equal(lecturaPropia.statusCode, 200);
      assert.ok(lecturaPropia.body.leidaAt);

      const recargaNotificaciones = await invokeController(
        activityController.getClassNotifications,
        { usuario: { id: socio2 } }
      );
      const notificacionRecargada = recargaNotificaciones.body.find(
        ({ id }) => Number(id) === Number(idNotificacion)
      );
      assert.ok(notificacionRecargada, 'La notificación leída debe persistir al recargar.');
      assert.ok(notificacionRecargada.leidaAt);

      // Simular vencimiento de oferta de socio 2 (adelantar fecha_expiracion_oferta al pasado)
      await pool.query(
        `UPDATE public.inscripciones_clase_grupal
         SET fecha_expiracion_oferta = NOW() - INTERVAL '5 minutes'
         WHERE id = $1`,
        [esperaSocio2.id]
      );

      // Ejecutar el procesamiento de ofertas expiradas
      await inscriptionService.processExpiredWaitlistOffers();

      // Socio 2 debe haber pasado a 'expirado'
      const { rows: rowsExp } = await pool.query(
        `SELECT estado FROM public.inscripciones_clase_grupal WHERE id = $1`,
        [esperaSocio2.id]
      );
      assert.equal(rowsExp[0].estado, 'expirado');

      const notificacionesTrasVencimiento = await invokeController(
        activityController.getClassNotifications,
        { usuario: { id: socio2 } }
      );
      const notificacionVencida = notificacionesTrasVencimiento.body.find(
        ({ id }) => Number(id) === Number(idNotificacion)
      );
      assert.ok(notificacionVencida, 'La notificación vencida debe conservarse como historial.');
      assert.equal(notificacionVencida.estadoInscripcion, 'expirado');
      assert.equal(notificacionVencida.ofertaVencida, true);

      const intentoOfertaVencida = await invokeController(activityController.acceptWaitlistOffer, {
        usuario: { id: socio2 },
        params: { id: String(testClassId) }
      });
      assert.equal(intentoOfertaVencida.statusCode, 409);

      // Socio 3 debe haber sido promovido a 'notificado'
      const { rows: rowsSocio3 } = await pool.query(
        `SELECT estado FROM public.inscripciones_clase_grupal WHERE id = $1`,
        [esperaSocio3.id]
      );
      assert.equal(rowsSocio3[0].estado, 'notificado');

      // Socio 3 acepta la oferta vigente
      const confirmadaSocio3 = await inscriptionService.acceptWaitlistOfferForUser(testClassId, socio3);
      assert.equal(confirmadaSocio3.estado, 'confirmado');

      const { rows: rowsFinal } = await pool.query(
        `SELECT estado FROM public.inscripciones_clase_grupal WHERE id = $1`,
        [esperaSocio3.id]
      );
      assert.equal(rowsFinal[0].estado, 'confirmado');
    });

    // -------------------------------------------------------------
    // Escenario 5: Pérdida de membresía mientras está en lista de espera
    // -------------------------------------------------------------
    await t.test('5. Socio en lista de espera que pierde su membresía es marcado como no_elegible', async () => {
      // Socio 4 se anota en lista de espera (la clase ya tiene 1 confirmado: socio 3)
      const socio4 = userIds[3];
      const esperaSocio4 = await inscriptionService.joinWaitlist(testClassId, socio4);
      assert.equal(esperaSocio4.estado, 'en espera');

      // Vencemos la suscripción de socio 4 en la base de datos
      await pool.query(
        `UPDATE public.suscripcion
         SET estado = 'inactiva', fecha_fin = CURRENT_DATE - 1
         WHERE id_usuario = $1`,
        [socio4]
      );

      // Socio 3 cancela su lugar
      const socio3 = userIds[2];
      await inscriptionService.cancelClassReservation(testClassId, socio3);

      // Al liberarse cupos, la lista de espera evalúa elegibilidad:
      // Socio 4 debe haber sido marcado como 'no_elegible'
      const { rows: rowsInelig } = await pool.query(
        `SELECT estado FROM public.inscripciones_clase_grupal WHERE id = $1`,
        [esperaSocio4.id]
      );
      assert.equal(rowsInelig[0].estado, 'no_elegible');
    });

    await t.test('6. No elimina una clase con inscripciones en lista de espera', async () => {
      const fechaInicioEspera = new Date(Date.now() + 18 * 60 * 60 * 1000);
      const fechaFinEspera = new Date(fechaInicioEspera.getTime() + 60 * 60 * 1000);
      const { rows: claseRows } = await pool.query(
        `INSERT INTO public.clase_grupal (id_sede, nombre, profesor, cupo, fecha_inicio, fecha_fin)
         VALUES ($1, $2, 'Profesor Historial', 1, $3, $4)
         RETURNING id`,
        [idSede, `Clase con espera ${testRunId}`, fechaInicioEspera, fechaFinEspera]
      );
      const claseConEsperaId = claseRows[0].id;
      testClassIds.push(claseConEsperaId);

      const { rows: inscripcionRows } = await pool.query(
        `INSERT INTO public.inscripciones_clase_grupal (id_clase_grupal, id_usuario, estado)
         VALUES ($1, $2, 'en espera')
         RETURNING id`,
        [claseConEsperaId, userIds[1]]
      );

      await assert.rejects(
        async () => activityService.deleteActivity(claseConEsperaId),
        (error) =>
          error instanceof BusinessError &&
          error.status === 409 &&
          error.message.includes('1 inscripción asociada')
      );

      const { rows: preservedRows } = await pool.query(
        `SELECT
           (SELECT COUNT(*) FROM public.clase_grupal WHERE id = $1)::int AS clases,
           (SELECT COUNT(*) FROM public.inscripciones_clase_grupal WHERE id = $2)::int AS inscripciones`,
        [claseConEsperaId, inscripcionRows[0].id]
      );
      assert.deepEqual(preservedRows[0], { clases: 1, inscripciones: 1 });
    });

    // -------------------------------------------------------------
    // Escenario 7: Cancelación tardía y posterior bloqueo de reserva
    // -------------------------------------------------------------
    await t.test('7. Cancelar tarde bloquea nuevas reservas durante N horas', async () => {
      const socio1 = userIds[0];

      // Clase que inicia en 1 hora: cancelar ahora es tardío (antes del inicio, < 2 h)
      const fInicioCorto = new Date(Date.now() + 60 * 60 * 1000);
      const fFinCorto = new Date(fInicioCorto.getTime() + 60 * 60 * 1000);
      const { rows: cRowsCorto } = await pool.query(
        `INSERT INTO public.clase_grupal (id_sede, nombre, profesor, cupo, fecha_inicio, fecha_fin)
         VALUES ($1, $2, 'Profesor Corto', 1, $3, $4)
         RETURNING id`,
        [idSede, `Clase Corto ${testRunId}`, fInicioCorto, fFinCorto]
      );
      const idClaseCorto = cRowsCorto[0].id;
      testClassIds.push(idClaseCorto);

      // Reserva la clase corta
      const inscripcion = await inscriptionService.reserveClass(idClaseCorto, socio1);
      assert.equal(inscripcion.estado, 'confirmado');

      // Cancela con menos de 2 h antes del inicio -> cancelado_tarde
      const cancelacion = await inscriptionService.cancelClassReservation(idClaseCorto, socio1);
      assert.equal(cancelacion.cancelada.estado, 'cancelado_tarde');
      assert.ok(cancelacion.cancelada.fechaCancelacion);

      // Intenta reservar otra clase: debe estar bloqueado por la penalidad
      const fInicioCorto2 = new Date(Date.now() + 60 * 60 * 1000);
      const fFinCorto2 = new Date(fInicioCorto2.getTime() + 60 * 60 * 1000);
      const { rows: cRowsCorto2 } = await pool.query(
        `INSERT INTO public.clase_grupal (id_sede, nombre, profesor, cupo, fecha_inicio, fecha_fin)
         VALUES ($1, $2, 'Profesor Corto 2', 1, $3, $4)
         RETURNING id`,
        [idSede, `Clase Corto 2 ${testRunId}`, fInicioCorto2, fFinCorto2]
      );
      const idClaseCorto2 = cRowsCorto2[0].id;
      testClassIds.push(idClaseCorto2);

      await assert.rejects(
        async () => inscriptionService.reserveClass(idClaseCorto2, socio1),
        (error) => error instanceof BusinessError && error.status === 409
      );
    });

  } finally {
    try {
      if (endpointServer) {
        await new Promise((resolve, reject) => {
          endpointServer.close((error) => error ? reject(error) : resolve());
        });
      }
      await pool.query(
        `DELETE FROM public.notificaciones_clase_grupal
         WHERE id_clase_grupal = ANY($1::bigint[]) OR id_usuario = ANY($2::bigint[])`,
        [testClassIds, userIds]
      );
      await pool.query(
        `DELETE FROM public.inscripciones_clase_grupal
         WHERE id_clase_grupal = ANY($1::bigint[]) OR id_usuario = ANY($2::bigint[])`,
        [testClassIds, userIds]
      );
      if (testClassIds.length > 0) {
        await pool.query('DELETE FROM public.clase_grupal WHERE id = ANY($1::bigint[])', [testClassIds]);
      }
      if (testSiteIds.length > 0) {
        await pool.query('DELETE FROM public.sede WHERE id = ANY($1::bigint[])', [testSiteIds]);
      }
      if (userIds.length > 0) {
        await pool.query('DELETE FROM public.suscripcion WHERE id_usuario = ANY($1::bigint[])', [userIds]);
        await pool.query('DELETE FROM public.usuario WHERE id = ANY($1::bigint[])', [userIds]);
      }

      const { rows } = await pool.query(
        `
          SELECT
            (SELECT COUNT(*) FROM public.clase_grupal WHERE id = ANY($1::bigint[])) AS clases,
            (SELECT COUNT(*) FROM public.inscripciones_clase_grupal
             WHERE id_clase_grupal = ANY($1::bigint[]) OR id_usuario = ANY($2::bigint[])) AS inscripciones,
            (SELECT COUNT(*) FROM public.notificaciones_clase_grupal
             WHERE id_clase_grupal = ANY($1::bigint[]) OR id_usuario = ANY($2::bigint[])) AS notificaciones,
            (SELECT COUNT(*) FROM public.suscripcion WHERE id_usuario = ANY($2::bigint[])) AS suscripciones,
            (SELECT COUNT(*) FROM public.usuario WHERE id = ANY($2::bigint[])) AS usuarios
        `,
        [testClassIds, userIds]
      );
      assert.deepEqual(
        Object.values(rows[0]).map(Number),
        [0, 0, 0, 0, 0],
        'La limpieza de los datos de integración debe quedar verificada.'
      );
    } finally {
      await pool.end();
    }
  }
});
