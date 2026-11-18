function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  error.statusCode = status;
  return error;
}

export function createUsersService({ usersRepository }) {
  async function getUserById(id) {
    const numero = Number(id);
    if (!Number.isInteger(numero) || numero <= 0) {
      throw httpError('El id de usuario debe ser un número entero positivo', 400);
    }

    const usuario = await usersRepository.findById(numero);
    if (!usuario) {
      throw httpError('Usuario no encontrado', 404);
    }
    return usuario;
  }

  async function createUser(data) {
    if (!data.dni || !data.nombre) {
      throw httpError('El DNI y el nombre son obligatorios', 400);
    }

    const existente = await usersRepository.findByDni(data.dni);
    if (existente) {
      throw httpError('Ya existe un usuario registrado con ese DNI', 400);
    }

    return usersRepository.create(data);
  }

  return { getUserById, createUser };
}