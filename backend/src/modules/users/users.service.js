import repository from './users.repository.js';

function calcularMora(user) {
  if (!user.fecha_proximo_vencimiento) return false; // sin suscripción, no aplica mora
  return new Date(user.fecha_proximo_vencimiento) < new Date();
}

async function getAllUsers(filtros = {}) {
  const users = await repository.findAll(filtros);
  return users.map((user) => ({
    ...user,
    enMora: calcularMora(user),
  }));
}

async function getUserById(id) {
  const user = await repository.findById(id);
  if (!user) {
    const error = new Error('Usuario no encontrado');
    error.status = 404;
    throw error;
  }
  return { ...user, enMora: calcularMora(user) };
}

async function createUser(data) {
  if (!data.nombre || !data.dni || !data.contacto || !data.password) {
    const error = new Error('Nombre, DNI, contacto y contraseña son obligatorios');
    error.status = 400;
    throw error;
  }
  try {
    return await repository.create(data);
  } catch (err) {
    if (err.code === '23505') {
      const error = new Error('Ya existe un socio con ese DNI o contacto');
      error.status = 409;
      throw error;
    }
    throw err;
  }
}

export default { getAllUsers, getUserById, createUser };