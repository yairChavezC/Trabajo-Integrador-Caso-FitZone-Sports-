import test from 'node:test';
import assert from 'node:assert';
import { createUsersService } from '../src/modules/users/services/users.service.js';

test('Users Service - Rechazar creación si faltan datos obligatorios', async () => {
  const userService = createUsersService({ usersRepository: {} });
  await assert.rejects(
    () => userService.createUser({ dni: '', nombre: '' }),
    { message: 'Nombre, DNI, contacto y contraseña son obligatorios', status: 400 }
  );
});

test('Users Service - Crear usuario exitosamente cuando los datos son válidos', async () => {
  const esperado = { id: 1, dni: '12345678', nombre: 'Carlos' };
  const userService = createUsersService({
    usersRepository: { findByDni: async () => null, create: async () => esperado },
  });
  const resultado = await userService.createUser({
    dni: '12345678', nombre: 'Carlos', contacto: 'c@mail.com', password: '123456', idRol: 3,
  });
  assert.deepStrictEqual(resultado, esperado);
});