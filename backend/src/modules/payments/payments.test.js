import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { ESTADOS_PAGO, Pago } from './domain/Pago.js';
import {
  MercadoPagoAdapter,
  ModoAdapter,
  PasarelaFactory
} from './gateways/PasarelaPago.js';
import {
  DuplicatePaymentError,
  InvalidPaymentTransitionError,
  SensitiveCardDataError,
  UnsupportedGatewayError
} from './errors.js';
import { InMemoryPagoRepository } from './repositories/inMemoryPaymentRepository.js';
import { createPaymentService } from './services/paymentService.js';
import { generarComprobantePdf } from './services/comprobantePdfService.js';

describe('Módulo de Pagos (M5) - Dominio, Patrones y Concurrencia', () => {
  let repository;
  let service;

  beforeEach(() => {
    repository = new InMemoryPagoRepository();
    service = createPaymentService({
      repository,
      pasarelaFactory: PasarelaFactory.conPasarelasEstandar()
    });
  });

  it('State: permite aprobar o rechazar un pago PENDIENTE, pero impide transiciones inválidas', () => {
    const pago = new Pago({ userId: 1, monto: 5000, metodoPago: 'MERCADOPAGO' });
    assert.equal(pago.estado, ESTADOS_PAGO.PENDIENTE);

    pago.rechazar('Fondos insuficientes');
    assert.equal(pago.estado, ESTADOS_PAGO.RECHAZADO);

    assert.throws(() => pago.aprobar('tx_123'), InvalidPaymentTransitionError);
  });

  it('Adapter + Factory: instancia MercadoPago y MODO correctamente y rechaza pasarelas inexistentes', async () => {
    const factory = PasarelaFactory.conPasarelasEstandar();
    const mp = factory.crear('MERCADOPAGO');
    const modo = factory.crear('MODO');

    assert.ok(mp instanceof MercadoPagoAdapter);
    assert.ok(modo instanceof ModoAdapter);

    const resMp = await mp.cobrar({ monto: 8000, token: 'tok_mp_ok' });
    assert.equal(resMp.estado, ESTADOS_PAGO.APROBADO);
    assert.match(resMp.transaccionExternaId, /^mp_ok_/);

    assert.throws(() => factory.crear('CRIPTO_INEXISTENTE'), UnsupportedGatewayError);
  });

  it('Seguridad (RNF-02 / ADR-010): rechaza intentos de enviar números de tarjeta crudos o CVV', async () => {
    await assert.rejects(
      () =>
        service.processPayment({
          userId: 1,
          monto: 6500,
          cardNumber: '4532015112830366',
          cvv: '123'
        }),
      SensitiveCardDataError
    );

    await assert.rejects(
      () =>
        service.processPayment({
          userId: 1,
          monto: 6500,
          cardToken: '4532-0151-1283-0366'
        }),
      SensitiveCardDataError
    );
  });

  it('Idempotencia: reintentar con la misma idempotencyKey cobra en la pasarela una única vez', async () => {
    let llamadasPasarela = 0;
    const factorySpy = new PasarelaFactory().registrar('SPY_GW', () => ({
      nombre: () => 'SPY_GW',
      cobrar: async () => {
        llamadasPasarela++;
        return {
          estado: ESTADOS_PAGO.APROBADO,
          transaccionExternaId: 'tx_unica_001',
          mensaje: 'OK'
        };
      }
    }));

    const serviceConSpy = createPaymentService({
      repository,
      pasarelaFactory: factorySpy
    });

    const payload = {
      userId: 7,
      monto: 12000,
      metodoPago: 'SPY_GW',
      idempotencyKey: 'idem-key-abc-999'
    };

    const r1 = await serviceConSpy.processPayment(payload);
    const r2 = await serviceConSpy.processPayment(payload);

    assert.equal(llamadasPasarela, 1);
    assert.equal(r1.payment.id, r2.payment.id);
    assert.equal(r2.payment.transaccion_externa_id, 'tx_unica_001');
  });

  it('Concurrencia: 10 peticiones simultáneas sobre la misma reserva aprueban exactamente 1 pago', async () => {
    const intentos = Array.from({ length: 10 }, (_, idx) =>
      service.processPayment({
        userId: idx + 1,
        reservaId: 55,
        monto: 9500,
        metodoPago: 'MERCADOPAGO'
      })
    );

    const resultados = await Promise.allSettled(intentos);
    const aprobados = resultados.filter((r) => r.status === 'fulfilled');
    const rechazadosPorDuplicado = resultados.filter(
      (r) => r.status === 'rejected' && r.reason instanceof DuplicatePaymentError
    );

    assert.equal(aprobados.length, 1);
    assert.equal(rechazadosPorDuplicado.length, 9);
  });

  it('RF-14 + Builder: genera un comprobante PDF válido con cabecera %PDF-1.4', async () => {
    const res = await service.processPayment({
      userId: 4,
      reservaId: 88,
      monto: 15000,
      metodoPago: 'MERCADOPAGO',
      concepto: 'Cancha Paddle 1 - 20:00 hs'
    });

    const { buffer, metadata } = generarComprobantePdf(res.payment);
    assert.equal(metadata.numeroComprobante, 'FZ-000001');
    assert.equal(buffer.subarray(0, 8).toString('utf8'), '%PDF-1.4');
  });
});