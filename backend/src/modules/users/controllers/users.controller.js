import { toCreateUserDTO, toUserResponseDTO } from '../dtos/users.dto.js';

export function createUsersController(service) {
  async function getUser(req, res, next) {
    try {
      const usuario = await service.getUserById(req.params.id);
      res.json(toUserResponseDTO(usuario));
    } catch (error) {
      next(error);
    }
  }

  async function createUser(req, res, next) {
    try {
      const datosLimpios = toCreateUserDTO(req.body);
      const nuevoUsuario = await service.createUser(datosLimpios);
      res.status(201).json(toUserResponseDTO(nuevoUsuario));
    } catch (error) {
      next(error);
    }
  }

  return { getUser, createUser };
}