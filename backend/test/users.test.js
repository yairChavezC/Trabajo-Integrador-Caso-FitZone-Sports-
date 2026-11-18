import test from 'node:test';
import assert from 'node:assert';
import { createUsersService } from '../src/modules/users/services/users.service.js';

test('Users Service - Rechazar creación si falta DNI o nombre', async () => {
  const mockRepo = {};
  const userService = createUsersService({ usersRepository: mockRepo });

  await assert.rejects(
    async () => {
      await userService.createUser({ dni: '', nombre: '' });
    },
    {
      message: 'El DNI y el nombre son obligatorios',
      status: 400
    }
  );
});

test('Users Service - Crear usuario exitosamente cuando los datos son válidos', async () => {
  const usuarioCreadoEsperado = { id: 1, dni: '12345678', nombre: 'Carlos' };
  
  const mockRepo = {
    findByDni: async () => null, // No existe todavía
    create: async () => usuarioCreadoEsperado
  };

  const userService = createUsersService({ usersRepository: mockRepo });

  const resultado = await userService.createUser({
    dni: '12345678',
    nombre: 'Carlos'
  });

  assert.deepStrictEqual(resultado, usuarioCreadoEsperado);
});