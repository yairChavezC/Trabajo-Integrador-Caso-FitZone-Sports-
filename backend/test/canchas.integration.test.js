import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';

import { createCanchaService } from '../src/modules/canchas/services/canchaService.js';
import { createCanchaController } from '../src/modules/canchas/controllers/canchaController.js';
import { createCanchasRouter } from '../src/modules/canchas/routes/canchasRoutes.js';

import { createReservaCanchaService } from '../src/modules/canchas/services/reservaCanchaService.js';
import { createReservaCanchaController } from '../src/modules/canchas/controllers/reservaCanchaController.js';
import { createReservaCanchaRouter } from '../src/modules/canchas/routes/reservaCanchaRoutes.js';

const JWT_TEST_SECRET = 'fitzone_integration_secret_2026';
process.env.JWT_SECRET = JWT_TEST_SECRET;

// Importamos authMiddleware luego de fijar JWT_SECRET en el entorno
const { verificarToken } = await import('../src/core/middlewares/authMiddleware.js');

let server;
let baseUrl;
let tokenValido;

// Estado mutable controlado por test para simular respuestas de infraestructura
let estadoInfraestructura = {};

before(async () => {
  tokenValido = jwt.sign(
    { id: 7, dni: '40123456', rol: 3 },
    JWT_TEST_SECRET,
    { expiresIn: '15m' }
  );

  // Stubs de repositorios y saga de pago en el borde del sistema
  const canchaRepoStub = {
    findCanchasConConfigPorSede: async () => estadoInfraestructura.canchas || [],
    findReservasPorSedeYFecha: async () => estadoInfraestructura.reservas || []
  };

  const reservaRepoStub = {
    insertReservaConBloqueoPesimista: async (datos) => {
      if (estadoInfraestructura.simularColision) {
        const pgErr = new Error('exclusion constraint violation');
        pgErr.code = '23P01';
        throw pgErr;
      }
      return { id: 500, estado: 'pendiente', ...datos };
    },
    findReservaById: async (id) => ({ id, estado: 'pendiente' }),
    updateEstadoReserva: async (id, estado) => ({ id, estado }),
    findReservasByUsuario: async (idUsuario) =>
      estadoInfraestructura.misReservas || [
        {
          id: 500,
          idCancha: 1,
          nombreCancha: 'Cancha Pádel 1',
          idUsuario,
          estado: 'confirmada'
        }
      ]
  };

  const procesarReservaConPagoStub = async (payload) => {
    // Ejecuta primero la validación y creación de reserva del servicio real
    const reserva = await reservaCanchaService.crearReservaPendiente(payload);

    if (estadoInfraestructura.pagoRechazado) {
      await reservaCanchaService.actualizarEstadoReserva(reserva.id, 'cancelada');
      return {
        success: false,
        message: 'Fondos insuficientes en tarjeta',
        reservaId: reserva.id
      };
    }

    const confirmada = await reservaCanchaService.actualizarEstadoReserva(reserva.id, 'confirmada');
    return {
      success: true,
      reserva: confirmada
    };
  };

  // Ensamblaje real de Servicios -> Controladores -> Routers -> App Express
  const canchaService = createCanchaService(canchaRepoStub);
  const canchaController = createCanchaController(canchaService);
  const canchasRouter = createCanchasRouter(canchaController);

  const reservaCanchaService = createReservaCanchaService(reservaRepoStub);
  const reservaCanchaController = createReservaCanchaController({
    reservaCanchaService,
    procesarReservaConPago: procesarReservaConPagoStub
  });
  const reservaCanchaRouter = createReservaCanchaRouter(reservaCanchaController);

  const app = express();
  app.use(express.json());
  app.use(verificarToken);
  app.use('/api/canchas', canchasRouter);
  app.use('/api/reservas-canchas', reservaCanchaRouter);

  // Middleware de manejo de errores centralizado
  app.use((err, req, res, _next) => {
    res.status(err.status || 500).json({
      success: false,
      message: err.message
    });
  });

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

// --- PRUEBAS DE INTEGRACIÓN HTTP ---

test('Integración Auth Middleware: rechaza con 401 peticiones sin token Bearer', async () => {
  const res = await fetch(`${baseUrl}/api/canchas/disponibilidad?idSede=1&fecha=2026-11-20`);
  assert.equal(res.status, 401);
});

test('Integración GET /api/canchas/disponibilidad: devuelve 400 si faltan query params obligatorios', async () => {
  const res = await fetch(`${baseUrl}/api/canchas/disponibilidad?idSede=1`, {
    headers: { Authorization: `Bearer ${tokenValido}` }
  });
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.equal(body.success, false);
});

test('Integración GET /api/canchas/disponibilidad: integra Router -> Controller -> Service -> Domain (Strategy)', async () => {
  estadoInfraestructura = {
    canchas: [
      {
        id: 1,
        nombre: 'Cancha Pádel 1',
        tipo: 'PAD',
        precio_base: 18000,
        precio_hora_pico: 22000,
        hora_apertura: '18:00',
        hora_cierre: '20:00',
        duracion_slot: 60,
        inicio_hora_pico: '19:00',
        fin_hora_pico: '20:00'
      }
    ],
    reservas: [{ id_cancha: 1, hora_inicio: '18:00', hora_fin: '19:00', estado: 'confirmada' }]
  };

  const res = await fetch(`${baseUrl}/api/canchas/disponibilidad?idSede=1&fecha=2026-11-20`, {
    headers: { Authorization: `Bearer ${tokenValido}` }
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.length, 1);
  assert.equal(body.data[0].slots[0].estado, 'confirmada');
  assert.equal(body.data[0].slots[1].estado, 'libre');
  assert.equal(body.data[0].slots[1].precio, 22000);
  assert.equal(body.data[0].slots[1].precioSocio, 18700);
});

test('Integración POST /api/reservas-canchas/checkout: retorna 201 cuando la reserva y el pago se aprueban', async () => {
  estadoInfraestructura = { simularColision: false, pagoRechazado: false };

  const res = await fetch(`${baseUrl}/api/reservas-canchas/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenValido}`
    },
    body: JSON.stringify({
      idCancha: 1,
      fechaInicio: '2026-11-20T19:00:00',
      fechaFin: '2026-11-20T20:00:00',
      monto: 18700,
      metodoPago: 'TARJETA'
    })
  });
  const body = await res.json();

  assert.equal(res.status, 201);
  assert.equal(body.success, true);
  assert.equal(body.data.reserva.estado, 'confirmada');
});

test('Integración POST /api/reservas-canchas/checkout: retorna 402 y compensa a cancelada si la pasarela rechaza', async () => {
  estadoInfraestructura = { simularColision: false, pagoRechazado: true };

  const res = await fetch(`${baseUrl}/api/reservas-canchas/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenValido}`
    },
    body: JSON.stringify({
      idCancha: 1,
      fechaInicio: '2026-11-20T19:00:00',
      fechaFin: '2026-11-20T20:00:00',
      monto: 18700
    })
  });
  const body = await res.json();

  assert.equal(res.status, 402);
  assert.equal(body.success, false);
});

test('Integración RN-02 POST /api/reservas-canchas/checkout: retorna 409 cuando el horario ya está reservado', async () => {
  estadoInfraestructura = { simularColision: true, pagoRechazado: false };

  const res = await fetch(`${baseUrl}/api/reservas-canchas/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenValido}`
    },
    body: JSON.stringify({
      idCancha: 1,
      fechaInicio: '2026-11-20T19:00:00',
      fechaFin: '2026-11-20T20:00:00',
      monto: 18700
    })
  });
  const body = await res.json();

  assert.equal(res.status, 409);
  assert.equal(body.success, false);
  assert.match(body.message, /ya se encuentra ocupado/i);
});

test('Integración GET /api/reservas-canchas/mis-reservas: extrae idUsuario del JWT y devuelve historial', async () => {
  estadoInfraestructura = {};

  const res = await fetch(`${baseUrl}/api/reservas-canchas/mis-reservas`, {
    headers: { Authorization: `Bearer ${tokenValido}` }
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data[0].idUsuario, 7);
});