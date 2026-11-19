import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';

import { createReservaCanchaService } from '../src/modules/canchas/services/reservaCanchaService.js';
import { createReservaCanchaController } from '../src/modules/canchas/controllers/reservaCanchaController.js';
import { createReservaCanchaRouter } from '../src/modules/canchas/routes/reservaCanchaRoutes.js';

const JWT_TEST_SECRET = 'fitzone_concurrency_secret_2026';
process.env.JWT_SECRET = JWT_TEST_SECRET;

const { verificarToken } = await import('../src/core/middlewares/authMiddleware.js');

/**
 * Simula el comportamiento transaccional real de PostgreSQL con bloqueo pesimista
 * (SELECT ... FOR UPDATE) y constraint de exclusión sobre (id_cancha, rango horario).
 */
const crearRepositorioTransaccionalSimulado = () => {
  const reservasPersistidas = [];
  let colaBloqueo = Promise.resolve();

  const insertReservaConBloqueoPesimista = (datos) => {
    // Serializa el acceso a la sección crítica igual que FOR UPDATE en PostgreSQL
    const operacion = colaBloqueo.then(async () => {
      // Simula latencia de red/disco dentro de la transacción
      await new Promise((resolve) => setTimeout(resolve, 15));

      const nuevoInicio = new Date(datos.fechaInicio).getTime();
      const nuevoFin = new Date(datos.fechaFin).getTime();

      const existeSolapamiento = reservasPersistidas.some((r) => {
        if (r.idCancha !== datos.idCancha || r.estado === 'cancelada') return false;
        const rInicio = new Date(r.fechaInicio).getTime();
        const rFin = new Date(r.fechaFin).getTime();
        return nuevoInicio < rFin && nuevoFin > rInicio;
      });

      if (existeSolapamiento) {
        const conflictErr = new Error('El horario seleccionado ya se encuentra ocupado o reservado.');
        conflictErr.status = 409;
        throw conflictErr;
      }

      const nuevaReserva = {
        id: reservasPersistidas.length + 1,
        estado: 'pendiente',
        ...datos
      };
      reservasPersistidas.push(nuevaReserva);
      return nuevaReserva;
    });

    colaBloqueo = operacion.catch(() => {});
    return operacion;
  };

  const findReservaById = async (id) =>
    reservasPersistidas.find((r) => r.id === id) || null;

  const updateEstadoReserva = async (id, nuevoEstado) => {
    const reserva = reservasPersistidas.find((r) => r.id === id);
    if (reserva) reserva.estado = nuevoEstado;
    return reserva;
  };

  return {
    insertReservaConBloqueoPesimista,
    findReservaById,
    updateEstadoReserva,
    obtenerEstadoInterno: () => [...reservasPersistidas]
  };
};

// --- PRUEBA 1: CONCURRENCIA DIRECTA EN SERVICIO (RN-02) ---

test('Concurrencia RN-02 (Service): 2 reservas simultáneas en el mismo horario confirman exactamente 1 y rechazan 1 con 409', async () => {
  const repo = crearRepositorioTransaccionalSimulado();
  const service = createReservaCanchaService(repo);

  const solicitudSocioA = service.crearReservaPendiente({
    idCancha: 1,
    idUsuario: 10,
    fechaInicio: '2026-11-21T19:00:00',
    fechaFin: '2026-11-21T20:00:00',
    monto: 18700
  });

  const solicitudSocioB = service.crearReservaPendiente({
    idCancha: 1,
    idUsuario: 25,
    fechaInicio: '2026-11-21T19:00:00',
    fechaFin: '2026-11-21T20:00:00',
    monto: 22000
  });

  const resultados = await Promise.allSettled([solicitudSocioA, solicitudSocioB]);

  const exitosas = resultados.filter((r) => r.status === 'fulfilled');
  const rechazadas = resultados.filter((r) => r.status === 'rejected');

  assert.equal(exitosas.length, 1, 'Debe confirmarse exactamente una reserva');
  assert.equal(rechazadas.length, 1, 'La segunda solicitud concurrente debe ser rechazada');
  assert.equal(rechazadas[0].reason.status, 409);
  assert.equal(repo.obtenerEstadoInterno().length, 1, 'No debe existir sobreventa en persistencia');
});

test('Concurrencia RN-02 (Ráfaga): 5 usuarios compitiendo por el mismo turno producen 1 reserva y 4 conflictos 409', async () => {
  const repo = crearRepositorioTransaccionalSimulado();
  const service = createReservaCanchaService(repo);

  const peticiones = [1, 2, 3, 4, 5].map((idUsuario) =>
    service.crearReservaPendiente({
      idCancha: 2,
      idUsuario,
      fechaInicio: '2026-11-21T20:00:00',
      fechaFin: '2026-11-21T21:00:00',
      monto: 18700
    })
  );

  const resultados = await Promise.allSettled(peticiones);

  const exitosas = resultados.filter((r) => r.status === 'fulfilled');
  const rechazadas = resultados.filter((r) => r.status === 'rejected');

  assert.equal(exitosas.length, 1);
  assert.equal(rechazadas.length, 4);
  for (const r of rechazadas) {
    assert.equal(r.reason.status, 409);
  }
  assert.equal(repo.obtenerEstadoInterno().length, 1);
});

// --- PRUEBA 2: CONCURRENCIA HTTP END-TO-END SOBRE CHECKOUT (RN-02) ---

let server;
let baseUrl;
let tokenUsuarioA;
let tokenUsuarioB;
let repoHttp;

before(async () => {
  tokenUsuarioA = jwt.sign({ id: 10, dni: '30111222', rol: 3 }, JWT_TEST_SECRET, { expiresIn: '15m' });
  tokenUsuarioB = jwt.sign({ id: 25, dni: '35999888', rol: 2 }, JWT_TEST_SECRET, { expiresIn: '15m' });

  repoHttp = crearRepositorioTransaccionalSimulado();
  const reservaCanchaService = createReservaCanchaService(repoHttp);

  const procesarReservaConPagoSimulado = async (payload) => {
    const reserva = await reservaCanchaService.crearReservaPendiente(payload);
    const confirmada = await reservaCanchaService.actualizarEstadoReserva(reserva.id, 'confirmada');
    return { success: true, reserva: confirmada };
  };

  const controller = createReservaCanchaController({
    reservaCanchaService,
    procesarReservaConPago: procesarReservaConPagoSimulado
  });
  const router = createReservaCanchaRouter(controller);

  const app = express();
  app.use(express.json());
  app.use(verificarToken);
  app.use('/api/reservas-canchas', router);
  app.use((err, req, res, _next) => {
    res.status(err.status || 500).json({ success: false, message: err.message });
  });

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('Concurrencia HTTP RN-02: dos POST /api/reservas-canchas/checkout simultáneos retornan uno 201 y otro 409', async () => {
  const payload = {
    idCancha: 3,
    fechaInicio: '2026-11-22T18:00:00',
    fechaFin: '2026-11-22T19:00:00',
    monto: 22000,
    metodoPago: 'TARJETA'
  };

  const req1 = fetch(`${baseUrl}/api/reservas-canchas/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenUsuarioA}` },
    body: JSON.stringify(payload)
  });

  const req2 = fetch(`${baseUrl}/api/reservas-canchas/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenUsuarioB}` },
    body: JSON.stringify(payload)
  });

  const respuestas = await Promise.all([req1, req2]);
  const statuses = respuestas.map((r) => r.status).sort((a, b) => a - b);

  assert.deepEqual(statuses, [201, 409]);

  const persistidas = repoHttp.obtenerEstadoInterno();
  assert.equal(persistidas.length, 1);
  assert.equal(persistidas[0].estado, 'confirmada');
});