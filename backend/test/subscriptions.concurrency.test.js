import test from 'node:test';
import assert from 'node:assert';
import { createSubscriptionsService } from '../src/modules/memberships/services/subscriptions.service.js';

test('Concurrencia - 5 renovaciones simultáneas para el mismo usuario procesan una sola operación activa', async () => {
  let enProceso = false;
  let cobrosRealizados = 0;

  const plansRepository = {
    findById: async () => ({ id: 1, nombre: 'Gold', precio: 500, activo: true, duracion_dias: 30 }),
  };

  const subscriptionsRepository = {
    findByUsuario: async () => null,
    upsert: async () => ({ id: 10, id_usuario: 1, id_plan: 1, estado: 'activa' }),
  };

  // Simulamos control de concurrencia / lock lógico en el pago
  const paymentService = {
    processPayment: async () => {
      if (enProceso) {
        return { success: false, message: 'Operación ya en curso para este usuario', payment: null };
      }
      enProceso = true;
      await new Promise((r) => setTimeout(r, 20)); // Simula latencia de red
      cobrosRealizados++;
      enProceso = false;
      return { success: true, message: 'Pago aprobado', payment: { id: 777 } };
    },
  };

  const pool = { query: async () => ({ rowCount: 1 }) };

  const service = createSubscriptionsService({
    plansRepository,
    subscriptionsRepository,
    paymentService,
    pool,
  });

  // Disparamos 5 peticiones al mismo instante
  const peticiones = Array.from({ length: 5 }, () =>
    service.renovarMembresia({ idUsuario: 1, idPlan: 1 })
  );

  const resultados = await Promise.all(peticiones);
  const aprobados = resultados.filter((r) => r.pagoAprobado);

  assert.strictEqual(cobrosRealizados, 1);
  assert.strictEqual(aprobados.length, 1);
});