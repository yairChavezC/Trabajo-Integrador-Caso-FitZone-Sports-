import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validarVentanaReserva,
  validarVentanaCancelacion,
  validarCapacidadParaReserva,
  validarCapacidadParaListaEspera,
  validarReduccionDeCupo
} from './classPolicy.js';

const AHORA = new Date('2026-10-18T12:00:00Z').getTime();
const horasDesdeAhora = (horas) => new Date(AHORA + horas * 60 * 60 * 1000);

test('reserva admite exactamente 48 horas y rechaza menos', () => {
  assert.doesNotThrow(() => validarVentanaReserva(horasDesdeAhora(48), AHORA));
  assert.throws(
    () => validarVentanaReserva(horasDesdeAhora(47.99), AHORA),
    { status: 409 }
  );
});

test('cancelación admite exactamente 2 horas y rechaza menos', () => {
  assert.doesNotThrow(() => validarVentanaCancelacion(horasDesdeAhora(2), AHORA));
  assert.throws(
    () => validarVentanaCancelacion(horasDesdeAhora(1.99), AHORA),
    { status: 409 }
  );
});

test('las ventanas rechazan fechas de inicio inválidas', () => {
  assert.throws(() => validarVentanaReserva('fecha inválida', AHORA), { status: 400 });
  assert.throws(() => validarVentanaCancelacion('fecha inválida', AHORA), { status: 400 });
});

test('reserva requiere una vacante disponible', () => {
  assert.doesNotThrow(() => validarCapacidadParaReserva(20, 19));
  assert.throws(() => validarCapacidadParaReserva(20, 20), { status: 409 });
});

test('lista de espera sólo se admite con la clase completa', () => {
  assert.doesNotThrow(() => validarCapacidadParaListaEspera(20, 20));
  assert.throws(() => validarCapacidadParaListaEspera(20, 19), { status: 409 });
});

test('no permite reducir la capacidad por debajo de los confirmados', () => {
  assert.doesNotThrow(() => validarReduccionDeCupo(20, 20));
  assert.throws(() => validarReduccionDeCupo(19, 20), { status: 409 });
});
