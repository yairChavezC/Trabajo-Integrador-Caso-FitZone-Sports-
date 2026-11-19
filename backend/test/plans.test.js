import test from 'node:test';
import assert from 'node:assert';
import { createPlansService } from '../src/modules/memberships/services/plans.service.js';

test('Plans Service - Validar precio inválido', async () => {
  const mockRepo = {
    create: async () => {},
  };

  const plansService = createPlansService(mockRepo);

  const planInvalido = {
    nombre: 'Plan Mensual',
    precio: -100,
    intervalo: 'mensual',
  };

  await assert.rejects(
    async () => {
      await plansService.createPlan(planInvalido);
    },
    {
      message: 'El precio debe ser un número mayor a 0',
    }
  );
});

test('Plans Service - Crear plan exitosamente', async () => {
  const mockPlanCreado = { 
    id: 1, 
    nombre: 'Plan Anual', 
    precio: 1000, 
    intervalo: 'anual', 
    duracion_dias: 365, 
    activo: true 
  };
  
  const mockRepo = {
    create: async () => mockPlanCreado,
  };

  const plansService = createPlansService(mockRepo);

  const resultado = await plansService.createPlan({
    nombre: 'Plan Anual',
    precio: 1000,
    intervalo: 'anual',
  });

  assert.deepStrictEqual(resultado, mockPlanCreado);
});