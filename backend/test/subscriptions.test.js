import { describe, it, expect, vi } from 'vitest';
import { createSubscriptionsService } from '../services/subscriptions.service.js';

describe('Subscriptions Service - Renovar Membresía', () => {
  it('debería rechazar la renovación si el pago es rechazado', async () => {
    // 1. Arrange (Mocks de dependencias inyectadas)
    const plansRepository = {
      findById: vi.fn().mockResolvedValue({ id: 1, nombre: 'Gold', precio: 500, activo: true, duracion_dias: 30 })
    };

    const subscriptionsRepository = {
      findByUsuario: vi.fn().mockResolvedValue(null)
    };

    const paymentService = {
      processPayment: vi.fn().mockResolvedValue({ success: false, message: 'Fondos insuficientes', payment: { id: 99 } })
    };

    const pool = { query: vi.fn() };

    const service = createSubscriptionsService({
      plansRepository,
      subscriptionsRepository,
      paymentService,
      pool
    });

    // 2. Act
    const resultado = await service.renovarMembresia({ idUsuario: 10, idPlan: 1 });

    // 3. Assert
    expect(resultado.pagoAprobado).toBe(false);
    expect(resultado.mensaje).toBe('Fondos insuficientes');
    expect(pool.query).not.toHaveBeenCalled(); // Si el pago falla, no debe tocar la DB para actualizar suscripciones
  });

  it('debería procesar el pago y actualizar la suscripción si todo es correcto', async () => {
    const plansRepository = {
      findById: vi.fn().mockResolvedValue({ id: 1, nombre: 'Gold', precio: 500, activo: true, duracion_dias: 30 })
    };

    const subscriptionsRepository = {
      findByUsuario: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ id: 5, id_usuario: 10, id_plan: 1, estado: 'activa' })
    };

    const paymentService = {
      processPayment: vi.fn().mockResolvedValue({ success: true, message: 'Pago aprobado', payment: { id: 123 } })
    };

    const pool = {
      query: vi.fn().mockResolvedValue({ rowCount: 1 }) // Simula el UPDATE en la tabla pagos
    };

    const service = createSubscriptionsService({
      plansRepository,
      subscriptionsRepository,
      paymentService,
      pool
    });

    const resultado = await service.renovarMembresia({ idUsuario: 10, idPlan: 1 });

    expect(resultado.pagoAprobado).toBe(true);
    expect(resultado.suscripcion).toBeDefined();
    expect(subscriptionsRepository.upsert).toHaveBeenCalledTimes(1);
    expect(pool.query).toHaveBeenCalledTimes(1); // Verifica que se asoció el pago a la suscripción
  });
});