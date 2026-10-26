import test from 'node:test';
import assert from 'node:assert/strict';
import { UpdateActivityDTO } from './activity.dto.js';

const claseActual = {
  idSede: 1,
  nombre: 'Yoga',
  profesor: 'Lucía',
  cupo: 12,
  fechaInicio: '2026-11-10T10:00:00',
  fechaFin: '2026-11-10T11:00:00'
};

test('el DTO de actualización permite modificar un único campo', () => {
  const dto = new UpdateActivityDTO({ cupo: 15 });

  assert.deepEqual(dto.validate(), []);
  assert.deepEqual(dto.validate(claseActual), []);
});

test('el DTO de actualización rechaza cuerpos sin campos reconocidos', () => {
  const dto = new UpdateActivityDTO({ campoDesconocido: true });

  assert.deepEqual(dto.validate(), [
    'Debe enviar al menos un campo válido para actualizar.'
  ]);
});

test('el DTO de actualización valida las fechas contra la clase existente', () => {
  const dto = new UpdateActivityDTO({ fechaInicio: '2026-11-10T12:00:00' });

  assert.deepEqual(dto.validate(), []);
  assert.deepEqual(dto.validate(claseActual), [
    'La fecha de fin debe ser posterior a la fecha de inicio.'
  ]);
});
