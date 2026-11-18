import test from 'node:test';
import assert from 'node:assert/strict';
import { AccessService } from '../../../../src/modules/accesses/services/accessService.js';

// Stub de Reloj Fijo (Unidad V - Diapositiva 14: evita acoplamiento a Date.now() real)
const RELOJ_FIJO_MS = 1763228400000; // 2025-11-15T17:40:00.000Z
const crearRelojFijo = () => () => RELOJ_FIJO_MS;

// Fábrica de Stubs aislando cada test (Principio FIRST: Independent & Repeatable)
const crearServicioConStubs = (overridesRepo = {}) => {
  const stubRepo = {
    findUserByQR: async () => ({
      id: 10,
      nombre: 'Luis Advíncula',
      id_rol: 3,
      estado_suscripcion: 'activa'
    }),
    findUserByDni: async () => null,
    createUserPublic: async (datos) => ({
      id: 55,
      ...datos
    }),
    checkAccesoActivoGlobal: async () => false,
    getCupoSede: async () => 80,
    getAforoPorSede: async () => 25,
    getUltimosMovimientosPorSede: async () => [],
    createAccess: async ({ idSede, idUserId, fechaEntrada }) => ({
      id: 99,
      id_sede: idSede,
      id_usuario: idUserId,
      fecha_entrada: fechaEntrada || new Date(RELOJ_FIJO_MS)
    }),
    registrarSalida: async (idUserId, idSede, fechaSalida) => ({
      id: 99,
      id_sede: idSede,
      id_usuario: idUserId,
      fecha_salida: fechaSalida || new Date(RELOJ_FIJO_MS)
    }),
    ...overridesRepo
  };

  return {
    service: new AccessService(stubRepo, crearRelojFijo()),
    stubRepo
  };
};

// --- PRUEBAS DE VALORES LÍMITE (Boundary Value Analysis - RF-04) ---
const casosBordeQR = [
  { descripcion: 'recién emitido (0 ms)', offsetMs: 0, esperado: true },
  { descripcion: 'en el límite exacto de vigencia (65.000 ms)', offsetMs: 65000, esperado: true },
  { descripcion: 'un milisegundo después del límite (65.001 ms)', offsetMs: 65001, esperado: false },
  { descripcion: 'dentro de la tolerancia de desfase de reloj (-10.000 ms)', offsetMs: -10000, esperado: true },
  { descripcion: 'fuera de la tolerancia de desfase de reloj (-10.001 ms)', offsetMs: -10001, esperado: false }
];

for (const caso of casosBordeQR) {
  test(`RF-04 (Caso Borde): valida QR ${caso.descripcion} -> valido=${caso.esperado}`, () => {
    const { service } = crearServicioConStubs();
    const timestampQR = RELOJ_FIJO_MS - caso.offsetMs;
    const qr = `FITZONE-10-${timestampQR}`;

    const res = service.validarFormatoYVigenciaQR(qr);
    assert.equal(res.valido, caso.esperado);
  });
}

test('RF-04: rechaza un código QR con prefijo o estructura inválida', () => {
  const { service } = crearServicioConStubs();
  const res = service.validarFormatoYVigenciaQR('CODIGO-INVALIDO-123');

  assert.equal(res.valido, false);
  assert.match(res.mensaje, /Formato de código QR no reconocido/i);
});

test('RF-02: deniega el ingreso si el socio posee una membresía vencida o inactiva', async () => {
  const { service } = crearServicioConStubs({
    findUserByQR: async () => ({
      id: 10,
      nombre: 'Socio Vencido',
      estado_suscripcion: 'vencida'
    })
  });

  const qr = `FITZONE-10-${RELOJ_FIJO_MS}`;
  const res = await service.procesarIngreso(qr, 1);

  assert.equal(res.autorizado, false);
  assert.match(res.mensaje, /membresía activa/i);
});

test('RN-01: deniega el ingreso si el socio ya registra un acceso activo sin salida en alguna sede', async () => {
  const { service } = crearServicioConStubs({
    checkAccesoActivoGlobal: async () => true
  });

  const qr = `FITZONE-10-${RELOJ_FIJO_MS}`;
  const res = await service.procesarIngreso(qr, 1);

  assert.equal(res.autorizado, false);
  assert.match(res.mensaje, /RN-01/i);
});

test('RF-05: deniega el ingreso cuando la sucursal alcanzó su cupo máximo real configurado', async () => {
  const { service } = crearServicioConStubs({
    getCupoSede: async () => 50,
    getAforoPorSede: async () => 50
  });

  const qr = `FITZONE-10-${RELOJ_FIJO_MS}`;
  const res = await service.procesarIngreso(qr, 1);

  assert.equal(res.autorizado, false);
  assert.match(res.mensaje, /capacidad máxima de aforo/i);
});

test('RF-05: autoriza el ingreso, actualiza el aforo y devuelve el cupo máximo de la sede', async () => {
  let aforoSimulado = 45;
  const { service } = crearServicioConStubs({
    getCupoSede: async () => 80,
    getAforoPorSede: async () => aforoSimulado,
    createAccess: async () => {
      aforoSimulado += 1;
      return { id: 99, fecha_entrada: new Date(RELOJ_FIJO_MS) };
    }
  });

  const qr = `FITZONE-10-${RELOJ_FIJO_MS}`;
  const res = await service.procesarIngreso(qr, 1);

  assert.equal(res.autorizado, true);
  assert.equal(res.tipoAccion, 'ingreso');
  assert.equal(res.aforoActual, 46);
  assert.equal(res.aforoMaximo, 80);
});

test('Molinete inteligente: registra salida automáticamente si el socio ya se encontraba dentro de la sede', async () => {
  const { service } = crearServicioConStubs({
    checkAccesoActivoGlobal: async () => true,
    getAforoPorSede: async () => 19,
    getCupoSede: async () => 80
  });

  const qr = `FITZONE-10-${RELOJ_FIJO_MS}`;
  const res = await service.procesarEscaneoMolinete(qr, 1);

  assert.equal(res.autorizado, true);
  assert.equal(res.tipoAccion, 'salida');
  assert.equal(res.aforoActual, 19);
  assert.equal(res.aforoMaximo, 80);
});

test('RN-01 en Salida: rechaza la salida si el socio figura con ingreso activo en otra sucursal distinta', async () => {
  const { service } = crearServicioConStubs({
    checkAccesoActivoGlobal: async () => true,
    registrarSalida: async () => null
  });

  const qr = `FITZONE-10-${RELOJ_FIJO_MS}`;
  const res = await service.procesarEscaneoMolinete(qr, 2);

  assert.equal(res.autorizado, false);
  assert.match(res.mensaje, /otra sucursal/i);
});

test('Seguridad Ingreso Externo: bloquea el alta manual por DNI cuando pertenece a un Socio registrado (id_rol = 3)', async () => {
  const { service } = crearServicioConStubs({
    findUserByDni: async () => ({
      id: 10,
      nombre: 'Lucas Socio',
      dni: '42123456',
      id_rol: 3
    })
  });

  await assert.rejects(
    async () => {
      await service.registrarIngresoExterno({ nombre: 'Lucas Socio', dni: '42123456', sedeId: 1 });
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /pertenece al socio registrado/i);
      return true;
    }
  );
});

test('Ingreso Externo: reutiliza la cuenta existente sin duplicarla si el DNI ya está registrado como Cliente Externo (id_rol = 2)', async () => {
  let creacionesDeUsuario = 0;
  const { service } = crearServicioConStubs({
    findUserByDni: async () => ({
      id: 22,
      nombre: 'Juan Perez Externo',
      dni: '44561234',
      id_rol: 2
    }),
    createUserPublic: async () => {
      creacionesDeUsuario++;
      return { id: 99 };
    }
  });

  const res = await service.registrarIngresoExterno({
    nombre: 'Juan Perez',
    dni: '44561234',
    sedeId: 1
  });

  assert.equal(res.autorizado, true);
  assert.equal(res.yaEstabaRegistrado, true);
  assert.equal(res.usuario.id, 22);
  assert.equal(creacionesDeUsuario, 0);
});

test('RNF-01: sincroniza lote de eventos offline en orden cronológico respetando idempotencia (RN-01)', async () => {
  const operaciones = [];
  let socioAdentro = false;

  const { service } = crearServicioConStubs({
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

  const res = await service.sincronizarAccesosOffline(eventosDesordenados);

  assert.equal(res.procesados, 2);
  assert.equal(res.errores, 0);
  assert.deepEqual(operaciones, ['ingreso:7', 'salida:7']);
});


// --- PRUEBAS DE PADRÓN Y SINCRONIZACIÓN OFFLINE (RNF-01) ---

test('RNF-01: obtiene el padrón offline y devuelve la fecha de sincronización', async () => {
  const sociosMock = [
    { id: 10, nombre: 'Luis Advíncula' },
    { id: 11, nombre: 'Socio de prueba' }
  ];

  const { service } = crearServicioConStubs({
    getPadronOffline: async () => sociosMock
  });

  const res = await service.obtenerPadronOffline();

  assert.deepEqual(res.socios, sociosMock);
  assert.equal(
    res.fechaSincronizacion,
    new Date(RELOJ_FIJO_MS).toISOString()
  );
});

test('RNF-01: devuelve un padrón vacío cuando el repositorio no retorna un arreglo', async () => {
  const { service } = crearServicioConStubs({
    getPadronOffline: async () => null
  });

  const res = await service.obtenerPadronOffline();

  assert.deepEqual(res.socios, []);
  assert.equal(
    res.fechaSincronizacion,
    new Date(RELOJ_FIJO_MS).toISOString()
  );
});

test('RNF-01: contabiliza los errores cuando falla una operación durante la sincronización offline', async () => {
  const { service } = crearServicioConStubs({
    checkAccesoActivoGlobal: async () => {
      throw new Error('Error simulado de conexión');
    }
  });

  const eventos = [
    {
      idLocal: '1',
      usuarioId: 10,
      sedeId: 1,
      tipoAccion: 'ingreso',
      fechaEvento: '2026-11-10T10:00:00.000Z'
    }
  ];

  const res = await service.sincronizarAccesosOffline(eventos);

  assert.equal(res.procesados, 0);
  assert.equal(res.errores, 1);
});
