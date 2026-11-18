import { describe, it, expect, vi } from 'vitest';
import { createPlansService } from '../services/plans.service.js';

describe('Plans Service', () => {
  it('debería lanzar un error si el precio del plan no es válido', async () => {
    // Mock del repositorio
    const mockRepo = {
      create: vi.fn(),
    };

    const plansService = createPlansService(mockRepo);

    const planInvalido = {
      nombre: 'Plan Mensual',
      precio: -100, // Precio inválido
      intervalo: 'mensual',
    };

    await expect(plansService.createPlan(planInvalido)).rejects.toThrow(
      'El precio debe ser un número mayor a 0'
    );
    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it('debería crear un plan exitosamente cuando los datos son correctos', async () => {
    const mockPlanCreado = { id: 1, nombre: 'Plan Anual', precio: 1000, intervalo: 'anual', duracion_dias: 365, activo: true };
    
    const mockRepo = {
      create: vi.fn().mockResolvedValue(mockPlanCreado),
    };

    const plansService = createPlansService(mockRepo);

    const resultado = await plansService.createPlan({
      nombre: 'Plan Anual',
      precio: 1000,
      intervalo: 'anual',
    });

    expect(resultado).toEqual(mockPlanCreado);
    expect(mockRepo.create).toHaveBeenCalledTimes(1);
  });
});