import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validarTransicionReserva,
  validarInvariantesNuevaReserva
} from '../src/modules/canchas/domain/reservaCanchaDomain.js';

// --- PRUEBAS DEL PATRÓN STATE ---

test('State: permite transiciones válidas (pendiente->confirmada, pendiente->cancelada, confirmada->cancelada)', () => {
  assert.doesNotThrow(() => validarTransicionReserva('pendiente', 'confirmada'));
  assert.doesNotThrow(() => validarTransicionReserva('pendiente', 'cancelada'));
  assert.doesNotThrow(() => validarTransicionReserva('confirmada', 'cancelada'));
  assert.doesNotThrow(() => validarTransicionReserva('confirmada', 'confirmada'));
});

test('State: bloquea reactivar una reserva desde el estado terminal cancelada', () => {
  assert.throws(
    () => validarTransicionReserva('cancelada', 'confirmada'),
    (err) => err.domainCode === 'TRANSICION_INVALIDA'
  );
  assert.throws(
    () => validarTransicionReserva('cancelada', 'pendiente'),
    (err) => err.domainCode === 'TRANSICION_INVALIDA'
  );
});

test('State: bloquea retroceder una reserva confirmada a pendiente', () => {
  assert.throws(
    () => validarTransicionReserva('confirmada', 'pendiente'),
    (err) => err.domainCode === 'TRANSICION_INVALIDA'
  );
});

test('State: lanza ESTADO_DESCONOCIDO ante un estado inexistente', () => {
  assert.throws(
    () => validarTransicionReserva('expirada', 'cancelada'),
    (err) => err.domainCode === 'ESTADO_DESCONOCIDO'
  );
});

// --- PRUEBAS DE INVARIANTES DE NUEVA RESERVA ---

test('Invariantes Reserva: acepta intervalo horario válido y monto positivo', () => {
  assert.doesNotThrow(() =>
    validarInvariantesNuevaReserva({
      fechaInicio: '2026-11-20T18:00:00',
      fechaFin: '2026-11-20T19:00:00',
      monto: 18700
    })
  );
});

test('Invariantes Reserva: rechaza fechas con formato inválido', () => {
  assert.throws(
    () =>
      validarInvariantesNuevaReserva({
        fechaInicio: 'fecha-invalida',
        fechaFin: '2026-11-20T19:00:00',
        monto: 18700
      }),
    (err) => err.domainCode === 'FECHA_INVALIDA'
  );
});

test('Invariantes Reserva: rechaza cuando fechaInicio es igual o posterior a fechaFin', () => {
  assert.throws(
    () =>
      validarInvariantesNuevaReserva({
        fechaInicio: '2026-11-20T19:00:00',
        fechaFin: '2026-11-20T18:00:00',
        monto: 18700
      }),
    (err) => err.domainCode === 'INTERVALO_INVALIDO'
  );
});

test('Invariantes Reserva: rechaza montos negativos', () => {
  assert.throws(
    () =>
      validarInvariantesNuevaReserva({
        fechaInicio: '2026-11-20T18:00:00',
        fechaFin: '2026-11-20T19:00:00',
        monto: -500
      }),
    (err) => err.domainCode === 'MONTO_INVALIDO'
  );
});