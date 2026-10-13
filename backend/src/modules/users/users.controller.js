import service from './users.service.js';
import { toCreateUserDTO, toUserResponseDTO } from './users.dto.js';

async function getUsers(req, res, next) {
  try {
    const users = await service.getAllUsers();
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