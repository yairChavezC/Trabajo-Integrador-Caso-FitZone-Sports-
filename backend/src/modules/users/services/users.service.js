// ids de la tabla "rol" en Supabase que se pueden asignar al dar de alta
const ROL_CLIENTE_EXTERNO = 2;
const ROL_SOCIO = 3;
const ROLES_PERMITIDOS_EN_ALTA = [ROL_CLIENTE_EXTERNO, ROL_SOCIO];

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

export function createUsersService({ usersRepository }) {
  async function getAllUsers(filtros = {}) {
    const users = await usersRepository.findAll(filtros);
    return users.map((user) => ({ ...user, enMora: calcularMora(user) }));
  }

  async function getUserById(id) {
    const numero = Number(id);
    if (!Number.isInteger(numero) || numero <= 0) {
      throw httpError('El id de usuario debe ser un número entero positivo', 400);
    }

    const usuario = await usersRepository.findById(numero);
    if (!usuario) {
      throw httpError('Usuario no encontrado', 404);
    }
    return { ...usuario, enMora: calcularMora(usuario) };
  }

  async function createUser(data) {
    if (!data.nombre || !data.dni || !data.contacto || !data.password) {
      throw httpError('Nombre, DNI, contacto y contraseña son obligatorios', 400);
    }

    const idRol = Number(data.idRol);
    if (!ROLES_PERMITIDOS_EN_ALTA.includes(idRol)) {
      throw httpError('El perfil debe ser Socio o Cliente externo', 400);
    }

    const existente = await usersRepository.findByDni(data.dni);
    if (existente) {
      throw httpError('Ya existe un usuario registrado con ese DNI', 409);
    }

    return usersRepository.create({ ...data, idRol });
  }

  async function getPagosByUsuario(id) {
    await getUserById(id); // valida que el usuario exista antes de buscar sus pagos
    return usersRepository.findPagosByUsuario(id);
  }

  return { getAllUsers, getUserById, createUser, getPagosByUsuario };
}