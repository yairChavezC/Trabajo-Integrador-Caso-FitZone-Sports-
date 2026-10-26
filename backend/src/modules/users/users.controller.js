import service from './users.service.js';
import { toCreateUserDTO, toUserResponseDTO } from './users.dto.js';

async function getUsers(req, res, next) {
  try {
    const filtros = {};

    if (req.query.rol !== undefined) {
      const idRoles = String(req.query.rol)
        .split(',')
        .map((valor) => Number(valor.trim()));

      if (idRoles.some((idRol) => !Number.isInteger(idRol) || idRol <= 0)) {
        const error = new Error(
          'El parámetro rol debe ser uno o varios números enteros positivos separados por coma'
        );
        error.status = 400;
        error.statusCode = 400;
        throw error;
      }
      filtros.idRoles = idRoles;
    }

    const users = await service.getAllUsers(filtros);
    res.json(users.map(toUserResponseDTO));
  } catch (error) {
    next(error);
  }
}

async function getUser(req, res, next) {
  try {
    const user = await service.getUserById(req.params.id);
    res.json(toUserResponseDTO(user));
  } catch (error) {
    next(error);
  }
}

async function createUser(req, res, next) {
  try {
    const dto = toCreateUserDTO(req.body);
    const newUser = await service.createUser(dto);
    res.status(201).json(toUserResponseDTO(newUser));
  } catch (error) {
    next(error);
  }
}

export default { getUsers, getUser, createUser };