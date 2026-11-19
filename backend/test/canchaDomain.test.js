import test from 'node:test';
import assert from 'node:assert/strict';
import {
  tarifaEstandarStrategy,
  tarifaSocioStrategy,
  tarifaSocioEnMoraStrategy,
  seleccionarEstrategiaTarifa,
  parsearMinutos,
  formatearHora,
  construirGrillaCancha
} from '../src/modules/canchas/domain/canchaDomain.js';

// --- PRUEBAS DEL PATRÓN STRATEGY DE TARIFAS (RN-03) ---

test('RN-03 (Strategy): tarifaEstandarStrategy aplica precioBase fuera de hora pico', () => {
  const precio = tarifaEstandarStrategy({
    precioBase: 18000,
    precioHoraPico: 22000,
    esPico: false
  });
  assert.equal(precio, 18000);
});

test('RN-03 (Strategy): tarifaEstandarStrategy aplica precioHoraPico en franja pico', () => {
  const precio = tarifaEstandarStrategy({
    precioBase: 18000,
    precioHoraPico: 22000,
    esPico: true
  });
  assert.equal(precio, 22000);
});

test('RN-03 (Strategy): tarifaSocioStrategy aplica 15% de descuento sobre tarifa base y hora pico', () => {
  const precioNormal = tarifaSocioStrategy({
    precioBase: 20000,
    precioHoraPico: 24000,
    esPico: false
  });
  const precioPico = tarifaSocioStrategy({
    precioBase: 20000,
    precioHoraPico: 24000,
    esPico: true
  });

  assert.equal(precioNormal, 17000);
  assert.equal(precioPico, 20400);
});

test('RN-03 (Strategy): tarifaSocioEnMoraStrategy quita el beneficio y cobra como externo', () => {
  const precioMora = tarifaSocioEnMoraStrategy({
    precioBase: 20000,
    precioHoraPico: 24000,
    esPico: true
  });
  assert.equal(precioMora, 24000);
});

test('RN-03 (Selector): selecciona la estrategia adecuada según condición comercial', () => {
  assert.equal(seleccionarEstrategiaTarifa({ esSocio: false }), tarifaEstandarStrategy);
  assert.equal(
    seleccionarEstrategiaTarifa({ esSocio: true, enMora: false }),
    tarifaSocioStrategy
  );
  assert.equal(
    seleccionarEstrategiaTarifa({ esSocio: true, enMora: true }),
    tarifaSocioEnMoraStrategy
  );
});

// --- PRUEBAS DE UTILIDADES HORARIAS Y GRILLA ---

test('Utilidades horarias: parsearMinutos y formatearHora convierten correctamente', () => {
  assert.equal(parsearMinutos('00:00'), 0);
  assert.equal(parsearMinutos('18:30'), 1110);
  assert.equal(parsearMinutos(''), 0);

  assert.equal(formatearHora(0), '00:00');
  assert.equal(formatearHora(1110), '18:30');
});

test('Grilla Cancha: genera slots, detecta hora pico, precios y solapamientos de reservas', () => {
  const canchaMock = {
    id: 1,
    nombre: 'Cancha Pádel 1',
    tipo: 'PAD',
    precio_base: 18000,
    precio_hora_pico: 22000,
    hora_apertura: '17:00',
    hora_cierre: '20:00',
    duracion_slot: 60,
    inicio_hora_pico: '18:00',
    fin_hora_pico: '20:00'
  };

  const reservasMock = [
    { hora_inicio: '18:00', hora_fin: '19:00', estado: 'confirmada' },
    { hora_inicio: '19:00', hora_fin: '20:00', estado: 'pendiente' }
  ];

  const grilla = construirGrillaCancha(canchaMock, reservasMock);

  assert.equal(grilla.id, 1);
  assert.equal(grilla.slots.length, 3);

  // Slot 17:00-18:00: libre y fuera de hora pico
  assert.deepEqual(grilla.slots[0], {
    inicio: '17:00',
    fin: '18:00',
    esPico: false,
    precio: 18000,
    precioSocio: 15300,
    estado: 'libre'
  });

  // Slot 18:00-19:00: confirmada y hora pico
  assert.equal(grilla.slots[1].esPico, true);
  assert.equal(grilla.slots[1].precio, 22000);
  assert.equal(grilla.slots[1].precioSocio, 18700);
  assert.equal(grilla.slots[1].estado, 'confirmada');

  // Slot 19:00-20:00: pendiente
  assert.equal(grilla.slots[2].estado, 'pendiente');
});