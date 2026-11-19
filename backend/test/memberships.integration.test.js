import test from 'node:test';
import assert from 'node:assert';
import express from 'express';
import { createPlansController } from '../src/modules/memberships/controllers/plans.controller.js';
import { createPlansRouter } from '../src/modules/memberships/routes/plans.routes.js';

test('Integración HTTP - Plans Router devuelve 200 y lista de planes', async () => {
  // Mock corregido con el nombre de método que espera el controlador: getPlans
  const mockPlansService = {
    getPlans: async () => [
      { id: 1, nombre: 'Básico', precio: 5000, intervalo: 'mensual', activo: true },
    ],
  };

  const controller = createPlansController(mockPlansService);
  const router = createPlansRouter(controller);

  const app = express();
  app.use(express.json());
  app.use('/api/plans', router);

  const server = app.listen(0);
  const port = server.address().port;

  try {
    const response = await fetch(`http://localhost:${port}/api/plans`);
    const body = await response.json();

    assert.strictEqual(response.status, 200);
    assert.strictEqual(Array.isArray(body), true);
    assert.strictEqual(body[0].nombre, 'Básico');
  } finally {
    server.close();
  }
});