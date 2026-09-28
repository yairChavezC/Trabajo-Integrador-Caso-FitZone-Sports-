import service from './users.service.js';

async function getUsers(req, res, next) {
  try {
    const users = await service.getAllUsers();
    res.json(users);
  } catch (error) {
    next(error);
  }
}

async function getUser(req, res, next) {
  try {
    const user = await service.getUserById(req.params.id);
    res.json(user);
  } catch (error) {
    next(error);
  }
}

async function createUser(req, res, next) {
  try {
    const newUser = await service.createUser(req.body);
    res.status(201).json(newUser);
  } catch (error) {
    next(error);
  }
}

export default { getUsers, getUser, createUser };