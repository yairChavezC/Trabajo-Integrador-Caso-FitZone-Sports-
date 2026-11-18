import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validarCredencialesEntrada,
  construirPayloadSesion,
  construirUsuarioAutenticadoDTO
} from '../src/modules/auth/authDomain.js';

test('Auth Domain: normaliza espacios en credenciales válidas', () => {
  const res = validarCredencialesEntrada('  40123456  ', '  secreto123  ');
  assert.deepEqual(res, {
    identificadorNormalizado: '40123456',
    contraseniaNormalizada: 'secreto123'
  });
});

test('Auth Domain: lanza AUTH_FAILED ante usuario o contraseña vacíos', () => {
  assert.throws(
    () => validarCredencialesEntrada('', '123456'),
    (err) => err.message === 'AUTH_FAILED'
  );
  assert.throws(
    () => validarCredencialesEntrada('40123456', '   '),
    (err) => err.message === 'AUTH_FAILED'
  );
});

test('Auth Domain: construye payload JWT y DTO público sin exponer password', () => {
  const usuarioBD = {
    id: 5,
    dni: '40123456',
    nombre: 'Juan Pérez',
    password: 'hash_secreto_sha256',
    id_rol: 3,
    foto: null
  };

  assert.deepEqual(construirPayloadSesion(usuarioBD), {
    id: 5,
    dni: '40123456',
    rol: 3
  });

  const dto = construirUsuarioAutenticadoDTO(usuarioBD);
  assert.deepEqual(dto, {
    id: 5,
    nombre: 'Juan Pérez',
    rol: 3,
    foto: null
  });
  assert.equal('password' in dto, false);
});