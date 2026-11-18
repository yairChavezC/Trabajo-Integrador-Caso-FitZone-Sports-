import test from 'node:test';
import assert from 'node:assert/strict';
import { createReservaCanchaService } from '../src/modules/canchas/services/reservaCanchaService.js';

const crearServicioConStubs = (overridesRepo = {}) => {
  const stubRepo = {
    insertReservaConBloqueoPesimista: async (datos) => ({
      id: 101,
      estado: 'pendiente',
      ...datos
    }),
    findReservaById: async (id) => ({
      id,
      estado: 'pendiente'
    }),
    updateEstadoReserva: async (id, estado) => ({
      id,
      estado
    }),
    findReservasByUsuario: async () => [],
    ...overridesRepo
  };

  return {
    service: createReservaCanchaService(stubRepo),
    stubRepo
  };
};

test('RN-02 (Service): crea reserva pendiente cuando el horario está libre y los datos son válidos', async () => {
  const { service } = crearServicioConStubs();

  const res = await service.crearReservaPendiente({
    idCancha: 1,
    idUsuario: 7,
    fechaInicio: '2026-11-20T18:00:00',
    fechaFin: '2026-11-20T19:00:00',
    monto: 18700
  });

  assert.equal(res.id, 101);
  assert.equal(res.estado, 'pendiente');
});

test('RN-02 (Service): traduce error de exclusión/solapamiento PostgreSQL (23P01) a conflicto HTTP 409', async () => {
  const { service } = crearServicioConStubs({
    insertReservaConBloqueoPesimista: async () => {
      const pgError = new Error('conflicting key value violates exclusion constraint');
      pgError.code = '23P01';
      throw pgError;
    }
  });

  await assert.rejects(
    async () => {
      await service.crearReservaPendiente({
        idCancha: 1,
        idUsuario: 7,
        fechaInicio: '2026-11-20T18:00:00',
        fechaFin: '2026-11-20T19:00:00',
        monto: 18700
      });
    },
    (err) => {
      assert.equal(err.status, 409);
      assert.match(err.message, /ya se encuentra ocupado/i);
      return true;
    }
  );
});

test('Service Reserva: rechaza con HTTP 400 antes de tocar BD si el intervalo horario es inválido', async () => {
  let llamadoRepo = false;
  const { service } = crearServicioConStubs({
    insertReservaConBloqueoPesimista: async () => {
      llamadoRepo = true;
    }
  });

  await assert.rejects(
    async () => {
      await service.crearReservaPendiente({
        idCancha: 1,
        idUsuario: 7,
        fechaInicio: '2026-11-20T20:00:00',
        fechaFin: '2026-11-20T19:00:00',
        monto: 18700
      });
    },
    (err) => err.status === 400
  );

  assert.equal(llamadoRepo, false);
});

test('Service State: actualiza estado válido y rechaza con 409 transición ilegal desde cancelada', async () => {
  const { service: serviceOk } = crearServicioConStubs({
    findReservaById: async () => ({ id: 10, estado: 'pendiente' })
  });
  const actualizada = await serviceOk.actualizarEstadoReserva(10, 'confirmada');
  assert.equal(actualizada.estado, 'confirmada');

  const { service: serviceCancelada } = crearServicioConStubs({
    findReservaById: async () => ({ id: 10, estado: 'cancelada' })
  });
  await assert.rejects(
    async () => {
      await serviceCancelada.actualizarEstadoReserva(10, 'confirmada');
    },
    (err) => err.status === 409
  );
});

test('Service Reserva: devuelve 404 si se intenta actualizar una reserva inexistente', async () => {
  const { service } = crearServicioConStubs({
    findReservaById: async () => null
  });

  await assert.rejects(
    async () => {
      await service.actualizarEstadoReserva(999, 'confirmada');
    },
    (err) => err.status === 404
  );
});