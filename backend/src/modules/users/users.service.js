import repository from './users.repository.js';

// ids de la tabla "rol" en Supabase que se pueden asignar al dar de alta
const ROL_CLIENTE_EXTERNO = 2;
const ROL_SOCIO = 3;
const ROLES_PERMITIDOS_EN_ALTA = [ROL_CLIENTE_EXTERNO, ROL_SOCIO];

// El manejador de errores del backend lee statusCode, así que se mandan los dos campos
function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  error.statusCode = status;
  return error;
}

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
    throw httpError('Usuario no encontrado', 404);
  }
  return { ...user, enMora: calcularMora(user) };
}

async function createUser(data) {
  if (!data.nombre || !data.dni || !data.contacto || !data.password) {
    throw httpError('Nombre, DNI, contacto y contraseña son obligatorios', 400);
  }

  const idRol = Number(data.idRol);
  if (!ROLES_PERMITIDOS_EN_ALTA.includes(idRol)) {
    throw httpError('El perfil debe ser Socio o Cliente externo', 400);
  }

  try {
    return await repository.create({ ...data, idRol });
  } catch (err) {
    if (err.code === '23505') {
      throw httpError('Ya existe un usuario con ese DNI o contacto', 409);
    }
    throw err;
  }
}

export default { getAllUsers, getUserById, createUser };