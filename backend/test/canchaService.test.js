import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanchaService } from '../src/modules/canchas/services/canchaService.js';

test('canchaService: arma grilla por sede y filtra reservas correspondientes a cada cancha', async () => {
  let diaRecibido = null;

  const stubRepo = {
    findCanchasConConfigPorSede: async (idSede, diaSemana) => {
      diaRecibido = diaSemana;
      return [
        {
          id: 1,
          nombre: 'Cancha 1',
          precio_base: 18000,
          hora_apertura: '18:00',
          hora_cierre: '20:00',
          duracion_slot: 60
        },
        {
          id: 2,
          nombre: 'Cancha 2',
          precio_base: 18000,
          hora_apertura: '18:00',
          hora_cierre: '20:00',
          duracion_slot: 60
        }
      ];
    },
    findReservasPorSedeYFecha: async () => [
      { id_cancha: 1, hora_inicio: '18:00', hora_fin: '19:00', estado: 'confirmada' }
    ]
  };

  const service = createCanchaService(stubRepo);
  const resultado = await service.obtenerGrillaCanchas(1, '2026-11-20'); // Viernes -> getDay() === 5

  assert.equal(diaRecibido, 5);
  assert.equal(resultado.length, 2);
  assert.equal(resultado[0].slots[0].estado, 'confirmada');
  assert.equal(resultado[0].slots[1].estado, 'libre');
  assert.equal(resultado[1].slots[0].estado, 'libre');
});