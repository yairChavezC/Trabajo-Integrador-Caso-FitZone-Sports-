import test from 'node:test';
import assert from 'node:assert';
import { createSubscriptionsService } from '../src/modules/memberships/services/subscriptions.service.js';

test('Subscriptions Service - Rechazar renovación si el pago falla', async () => {
  const plansRepository = {
    findById: async () => ({ id: 1, nombre: 'Gold', precio: 500, activo: true, duracion_dias: 30 })
  };

  const subscriptionsRepository = {
    findByUsuario: async () => null
  };

  const paymentService = {
    processPayment: async () => ({ success: false, message: 'Fondos insuficientes', payment: { id: 99 } })
  };

  let poolQueryCalled = false;
  const pool = { 
    query: async () => { poolQueryCalled = true; } 
  };

  const service = createSubscriptionsService({
    plansRepository,
    subscriptionsRepository,
    paymentService,
    pool
  });

  const resultado = await service.renovarMembresia({ idUsuario: 10, idPlan: 1 });

  assert.strictEqual(resultado.pagoAprobado, false);
  assert.strictEqual(resultado.mensaje, 'Fondos insuficientes');
  assert.strictEqual(poolQueryCalled, false);
});

test('Subscriptions Service - Procesar pago y actualizar suscripción correctamente', async () => {
  const plansRepository = {
    findById: async () => ({ id: 1, nombre: 'Gold', precio: 500, activo: true, duracion_dias: 30 })
  };

  const suscripcionEsperada = { id: 5, id_usuario: 10, id_plan: 1, estado: 'activa' };
  const subscriptionsRepository = {
    findByUsuario: async () => null,
    upsert: async () => suscripcionEsperada
  };

  const paymentService = {
    processPayment: async () => ({ success: true, message: 'Pago aprobado', payment: { id: 123 } })
  };

  let poolQueryCount = 0;
  const pool = {
    query: async () => {
      poolQueryCount++;
      return { rowCount: 1 };
    }
  };

  const service = createSubscriptionsService({
    plansRepository,
    subscriptionsRepository,
    paymentService,
    pool
  });

  const resultado = await service.renovarMembresia({ idUsuario: 10, idPlan: 1 });

  assert.strictEqual(resultado.pagoAprobado, true);
  assert.deepStrictEqual(resultado.suscripcion, suscripcionEsperada);
  assert.strictEqual(poolQueryCount, 1);
});