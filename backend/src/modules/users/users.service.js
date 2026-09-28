import repository from './users.repository.js';

function calcularMora(user) {
  if (!user.fecha_proximo_vencimiento) return false; // sin suscripción, no aplica mora
  return new Date(user.fecha_proximo_vencimiento) < new Date();
}

async function getAllUsers() {
  const users = await repository.findAll();
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
  if (!data.nombre || !data.dni) {
    const error = new Error('Nombre y DNI son obligatorios');
    error.status = 400;
    throw error;
  }
  return repository.create(data);
}

export default { getAllUsers, getUserById, createUser };