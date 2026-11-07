import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../config/db.js';
import * as activityService from './services/activityService.js';
import { BusinessError } from './errors.js';

test('Integración Real con PostgreSQL/Supabase - Módulo 3 Clases Grupales', async (t) => {
  // Generador de IDs únicos para datos de prueba aislados
  const testRunId = Date.now().toString().slice(-6);
  const testDnis = [
    `99${testRunId}1`,
    `99${testRunId}2`,
    `99${testRunId}3`,
    `99${testRunId}4`
  ];
  const userIds = [];
  let testClassId = null;

  // Setup: Crear usuarios socios de prueba con suscripciones activas
  try {
    for (let i = 0; i < testDnis.length; i++) {
      const dni = testDnis[i];
      const { rows: uRows } = await pool.query(
        `INSERT INTO public.usuario (dni, nombre, contacto, password, id_rol, activo)
         VALUES ($1, $2, $3, 'password_test_123', 3, TRUE)
         RETURNING id`,
        [dni, `Socio Test ${i + 1}`, `test_${dni}@fitzone.test`]
      );
      const uid = uRows[0].id;
      userIds.push(uid);

      await pool.query(
        `INSERT INTO public.suscripcion (id_usuario, id_plan, fecha_inicio, fecha_fin, estado, fecha_proximo_vencimiento)
         VALUES ($1, 1, CURRENT_DATE - 5, CURRENT_DATE + 30, 'activa', CURRENT_DATE + 30)`,
        [uid]
      );
    }

    // Crear clase grupal de prueba con cupo = 1 que inicia mañana a las 10:00 (dentro de ventana 48h y > 2h)
    const fechaInicio = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const fechaFin = new Date(fechaInicio.getTime() + 60 * 60 * 1000);

    const { rows: cRows } = await pool.query(
      `INSERT INTO public.clase_grupal (id_sede, nombre, profesor, cupo, fecha_inicio, fecha_fin)
       VALUES (1, $1, 'Profesor Test', 1, $2, $3)
       RETURNING id, cupo, fecha_inicio AS "fechaInicio"`,
      [`Clase Test Integ ${testRunId}`, fechaInicio, fechaFin]
    );
    testClassId = cRows[0].id;

    // -------------------------------------------------------------
    // Escenario 1: Reserva exitosa en PostgreSQL
    // -------------------------------------------------------------
    await t.test('1. Reserva con membresía activa persiste estado "confirmado"', async () => {
      const socio1 = userIds[0];
      const inscripcion = await activityService.reserveClass(testClassId, socio1);
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
        async () => activityService.reserveClass(testClassId, socio1),
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
         VALUES (1, $1, 'Profe Concurrente', 1, $2, $3)
         RETURNING id`,
        [`Concurrencia Test ${testRunId}`, fInicio, fFin]
      );
      const concClaseId = clRows[0].id;

      try {
        const socioA = userIds[1];
        const socioB = userIds[2];

        // Disparo concurrente
        const [resA, resB] = await Promise.allSettled([
          activityService.reserveClass(concClaseId, socioA),
          activityService.reserveClass(concClaseId, socioB)
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
      const esperaSocio2 = await activityService.joinWaitlist(testClassId, socio2);
      assert.equal(esperaSocio2.estado, 'en espera');

      // Socio 3 se une a lista de espera
      const esperaSocio3 = await activityService.joinWaitlist(testClassId, socio3);
      assert.equal(esperaSocio3.estado, 'en espera');

      // Socio 1 cancela su reserva con más de 2 horas
      const cancelacion = await activityService.cancelClassReservation(testClassId, socio1);
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
        `SELECT tipo, mensaje, id_usuario FROM public.notificaciones_clase_grupal
         WHERE id_clase_grupal = $1 AND id_usuario = $2`,
        [testClassId, socio2]
      );
      assert.equal(notifs.length, 1);
      assert.equal(notifs[0].tipo, 'cupo_liberado');

      // Simular vencimiento de oferta de socio 2 (adelantar fecha_expiracion_oferta al pasado)
      await pool.query(
        `UPDATE public.inscripciones_clase_grupal
         SET fecha_expiracion_oferta = NOW() - INTERVAL '5 minutes'
         WHERE id = $1`,
        [esperaSocio2.id]
      );

      // Ejecutar el procesamiento de ofertas expiradas
      await activityService.processExpiredWaitlistOffers();

      // Socio 2 debe haber pasado a 'expirado'
      const { rows: rowsExp } = await pool.query(
        `SELECT estado FROM public.inscripciones_clase_grupal WHERE id = $1`,
        [esperaSocio2.id]
      );
      assert.equal(rowsExp[0].estado, 'expirado');

      // Socio 3 debe haber sido promovido a 'notificado'
      const { rows: rowsSocio3 } = await pool.query(
        `SELECT estado FROM public.inscripciones_clase_grupal WHERE id = $1`,
        [esperaSocio3.id]
      );
      assert.equal(rowsSocio3[0].estado, 'notificado');

      // Socio 3 acepta la oferta vigente
      const confirmadaSocio3 = await activityService.acceptWaitlistOfferForUser(testClassId, socio3);
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
      const esperaSocio4 = await activityService.joinWaitlist(testClassId, socio4);
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
      await activityService.cancelClassReservation(testClassId, socio3);

      // Al liberarse cupos, la lista de espera evalúa elegibilidad:
      // Socio 4 debe haber sido marcado como 'no_elegible'
      const { rows: rowsInelig } = await pool.query(
        `SELECT estado FROM public.inscripciones_clase_grupal WHERE id = $1`,
        [esperaSocio4.id]
      );
      assert.equal(rowsInelig[0].estado, 'no_elegible');
    });

  } finally {
    // Teardown: Eliminar datos de prueba en orden
    if (testClassId) {
      await pool.query('DELETE FROM public.notificaciones_clase_grupal WHERE id_clase_grupal = $1', [testClassId]);
      await pool.query('DELETE FROM public.inscripciones_clase_grupal WHERE id_clase_grupal = $1', [testClassId]);
      await pool.query('DELETE FROM public.clase_grupal WHERE id = $1', [testClassId]);
    }
    for (const uid of userIds) {
      await pool.query('DELETE FROM public.suscripcion WHERE id_usuario = $1', [uid]);
      await pool.query('DELETE FROM public.usuario WHERE id = $1', [uid]);
    }
    // No cerrar pool aquí para no interferir con otros tests si corren en el mismo proceso
  }
});
