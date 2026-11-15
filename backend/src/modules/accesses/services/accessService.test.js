import test from 'node:test';
import assert from 'node:assert/strict';
import accessService from './accessService.js';
import accessRepository from '../repositories/accessRepository.js';

const originalRepo = { ...accessRepository };

const setupMockRepo = (overrides = {}) => {
  Object.assign(accessRepository, originalRepo, {
    findUserByQR: async () => ({
      id: 10,
      nombre: 'Luis Advíncula',
      id_rol: 3,
      estado_suscripcion: 'activa'
    }),
    checkAccesoActivoGlobal: async () => false,
    getCupoSede: async () => 80,
    getAforoPorSede: async () => 25,
    createAccess: async ({ idSede, idUserId, fechaEntrada }) => ({
      id: 99,
      id_sede: idSede,
      id_usuario: idUserId,
      fecha_entrada: fechaEntrada || new Date()
    }),
    registrarSalida: async (idUserId, idSede, fechaSalida) => ({
      id: 99,
      id_sede: idSede,
      id_usuario: idUserId,
      fecha_salida: fechaSalida || new Date()
    }),
    ...overrides
  });
};

test('RF-04: autoriza un código QR con formato válido y generado dentro de la ventana de 60 segundos', () => {
  const qrVigente = `FITZONE-10-${Date.now() - 10000}`; // 10 segundos de antigüedad
  const res = accessService.validarFormatoYVigenciaQR(qrVigente);

  assert.equal(res.valido, true);
  assert.equal(res.userId, '10');
});

test('RF-04: rechaza un código QR expirado con más de 65 segundos de antigüedad', () => {
  const qrExpirado = `FITZONE-10-${Date.now() - 70000}`; // 70 segundos de antigüedad
  const res = accessService.validarFormatoYVigenciaQR(qrExpirado);

  assert.equal(res.valido, false);
  assert.match(res.mensaje, /expirado/i);
});

test('RF-04: rechaza un código QR con prefijo o estructura inválida', () => {
  const res = accessService.validarFormatoYVigenciaQR('CODIGO-INVALIDO-123');

  assert.equal(res.valido, false);
  assert.match(res.mensaje, /Formato de código QR no reconocido/i);
});

test('RF-02: deniega el ingreso si el socio posee una membresía vencida o inactiva', async () => {
  setupMockRepo({
    findUserByQR: async () => ({
      id: 10,
      nombre: 'Socio Vencido',
      estado_suscripcion: 'vencida'
    })
  });

  const qr = `FITZONE-10-${Date.now()}`;
  const res = await accessService.procesarIngreso(qr, 1);

  assert.equal(res.autorizado, false);
  assert.match(res.mensaje, /membresía activa/i);
});

test('RN-01: deniega el ingreso si el socio ya registra un acceso activo sin salida en alguna sede', async () => {
  setupMockRepo({
    checkAccesoActivoGlobal: async () => true
  });

  const qr = `FITZONE-10-${Date.now()}`;
  const res = await accessService.procesarIngreso(qr, 1);

  assert.equal(res.autorizado, false);
  assert.match(res.mensaje, /RN-01/i);
});

test('RF-05: deniega el ingreso cuando la sucursal alcanzó su cupo máximo real configurado', async () => {
  setupMockRepo({
    getCupoSede: async () => 50,
    getAforoPorSede: async () => 50
  });

  const qr = `FITZONE-10-${Date.now()}`;
  const res = await accessService.procesarIngreso(qr, 1);

  assert.equal(res.autorizado, false);
  assert.match(res.mensaje, /capacidad máxima de aforo/i);
});

test('RF-05: autoriza el ingreso, actualiza el aforo y devuelve el cupo máximo de la sede', async () => {
  let aforoSimulado = 45;
  setupMockRepo({
    getCupoSede: async () => 80,
    getAforoPorSede: async () => aforoSimulado,
    createAccess: async () => {
      aforoSimulado += 1;
      return { id: 99, fecha_entrada: new Date() };
    }
  });

  const qr = `FITZONE-10-${Date.now()}`;
  const res = await accessService.procesarIngreso(qr, 1);

  assert.equal(res.autorizado, true);
  assert.equal(res.tipoAccion, 'ingreso');
  assert.equal(res.aforoActual, 46);
  assert.equal(res.aforoMaximo, 80);
});

test('Molinete inteligente: registra salida automáticamente si el socio ya se encontraba dentro de la sede', async () => {
  setupMockRepo({
    checkAccesoActivoGlobal: async () => true,
    getAforoPorSede: async () => 19,
    getCupoSede: async () => 80
  });

  const qr = `FITZONE-10-${Date.now()}`;
  const res = await accessService.procesarEscaneoMolinete(qr, 1);

  assert.equal(res.autorizado, true);
  assert.equal(res.tipoAccion, 'salida');
  assert.equal(res.aforoActual, 19);
  assert.equal(res.aforoMaximo, 80);
});

test('RNF-01: sincroniza lote de eventos offline en orden cronológico respetando idempotencia (RN-01)', async () => {
  const operaciones = [];
  let socioAdentro = false;

  setupMockRepo({
    checkAccesoActivoGlobal: async () => socioAdentro,
    createAccess: async ({ idUserId }) => {
      socioAdentro = true;
      operaciones.push(`ingreso:${idUserId}`);
      return { id: 1 };
    },
    registrarSalida: async (idUserId) => {
      socioAdentro = false;
      operaciones.push(`salida:${idUserId}`);
      return { id: 1 };
    }
  });

  const eventosDesordenados = [
    { idLocal: '2', usuarioId: 7, sedeId: 1, tipoAccion: 'salida', fechaEvento: '2026-11-10T11:00:00.000Z' },
    { idLocal: '1', usuarioId: 7, sedeId: 1, tipoAccion: 'ingreso', fechaEvento: '2026-11-10T10:00:00.000Z' }
  ];

  const res = await accessService.sincronizarAccesosOffline(eventosDesordenados);

  assert.equal(res.procesados, 2);
  assert.equal(res.errores, 0);
  assert.deepEqual(operaciones, ['ingreso:7', 'salida:7']);
});