import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthService } from '../src/modules/auth/authService.js';

test('Auth Service: exige JWT_SECRET al instanciarse (Fail-Fast)', () => {
  assert.throws(() => {
    createAuthService({
      authRepo: {},
      jwtLib: { sign: () => '' },
      jwtSecret: ''
    });
  }, /JWT_SECRET/);
});

test('Auth Service: emite token JWT y DTO de usuario cuando las credenciales son válidas', async () => {
  const authService = createAuthService({
    authRepo: {
      buscarUsuarioPorNombre: async () => ({
        id: 1,
        dni: '40123456',
        nombre: 'Juan Pérez',
        password: 'hash',
        id_rol: 3,
        foto: null
      }),
      verificarPassword: async () => true
    },
    jwtLib: {
      sign: (payload) => `token-simulado-${payload.id}`
    },
    jwtSecret: 'clave-test'
  });

  const res = await authService.realizarLogin('40123456', '123456');

  assert.equal(res.token, 'token-simulado-1');
  assert.equal(res.usuario.nombre, 'Juan Pérez');
  assert.equal(res.usuario.password, undefined);
});

test('Auth Service: lanza AUTH_FAILED si el usuario no existe o la contraseña no coincide', async () => {
  const serviceUsuarioInexistente = createAuthService({
    authRepo: {
      buscarUsuarioPorNombre: async () => null,
      verificarPassword: async () => false
    },
    jwtLib: { sign: () => '' },
    jwtSecret: 'clave-test'
  });

  await assert.rejects(
    async () => serviceUsuarioInexistente.realizarLogin('99999999', '123456'),
    (err) => err.message === 'AUTH_FAILED'
  );

  const servicePassIncorrecta = createAuthService({
    authRepo: {
      buscarUsuarioPorNombre: async () => ({ id: 1, password: 'hash' }),
      verificarPassword: async () => false
    },
    jwtLib: { sign: () => '' },
    jwtSecret: 'clave-test'
  });

  await assert.rejects(
    async () => servicePassIncorrecta.realizarLogin('40123456', 'mal'),
    (err) => err.message === 'AUTH_FAILED'
  );
});