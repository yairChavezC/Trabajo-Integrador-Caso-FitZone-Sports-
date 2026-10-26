import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validarVentanaReserva,
  validarVentanaListaEspera,
  validarVentanaCancelacion,
  validarCapacidadParaReserva,
  validarCapacidadParaListaEspera,
  validarReduccionDeCupo
} from './classPolicy.js';

const AHORA = new Date('2026-10-18T12:00:00Z').getTime();
const horasDesdeAhora = (horas) => new Date(AHORA + horas * 60 * 60 * 1000);

test('la reserva se habilita dentro de las 48 horas previas al inicio', () => {
  assert.throws(() => validarVentanaReserva(horasDesdeAhora(48.01), AHORA), { status: 409 });
  assert.doesNotThrow(() => validarVentanaReserva(horasDesdeAhora(48), AHORA));
  assert.doesNotThrow(() => validarVentanaReserva(horasDesdeAhora(47.99), AHORA));
  assert.doesNotThrow(() => validarVentanaReserva(horasDesdeAhora(24), AHORA));
  assert.doesNotThrow(() => validarVentanaReserva(horasDesdeAhora(0.01), AHORA));
  assert.throws(() => validarVentanaReserva(horasDesdeAhora(0), AHORA), { status: 409 });
  assert.throws(
    () => validarVentanaReserva(horasDesdeAhora(-1), AHORA),
    { status: 409 }
  );
});

test('la lista de espera permanece abierta hasta el inicio de la clase', () => {
  assert.doesNotThrow(() => validarVentanaListaEspera(horasDesdeAhora(72), AHORA));
  assert.doesNotThrow(() => validarVentanaListaEspera(horasDesdeAhora(1), AHORA));
  assert.throws(() => validarVentanaListaEspera(horasDesdeAhora(0), AHORA), { status: 409 });
  assert.throws(() => validarVentanaListaEspera(horasDesdeAhora(-1), AHORA), { status: 409 });
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
  assert.throws(() => validarVentanaListaEspera('fecha inválida', AHORA), { status: 400 });
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
