import test from 'node:test';
import assert from 'node:assert/strict';
import { obtenerEstrategiaDePrecio } from '../src/modules/memberships/domain/pricingStrategies.js';

test('Strategy: cada tipo de plan aplica su política de precio', () => {
  const precio = (tipo) => obtenerEstrategiaDePrecio(tipo).calcular(1000);
  assert.equal(precio('REGULAR'), 1000);
  assert.equal(precio('VIP'), 1100);          // 10% de recargo
  assert.equal(precio('STUDENT'), 800);       // 20% de descuento
  assert.equal(precio('PROMO_ANUAL'), 700);   // 30% de descuento
  assert.equal(precio('vip'), 1100);          // insensible a mayúsculas
});

test('Strategy: un tipo desconocido lanza error y no cobra', () => {
  assert.throws(() => obtenerEstrategiaDePrecio('INEXISTENTE'), /no soportado/);
});