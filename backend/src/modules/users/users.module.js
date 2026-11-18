import pool from '../../config/db.js';
import { createUsersRepository } from './repositories/users.repository.js';
import { createUsersService } from './services/users.service.js';
import { createUsersController } from './controllers/users.controller.js';
import { createUsersRouter } from './routes/users.routes.js';

// 1. Instanciar Repositorio inyectando el pool
const usersRepo = createUsersRepository(pool);

// 2. Instanciar Servicio inyectando el repositorio
const usersService = createUsersService({ usersRepository: usersRepo });

// 3. Instanciar Controlador inyectando el servicio
const usersController = createUsersController(usersService);

// 4. Instanciar Rutas inyectando el controlador
const usersRouter = createUsersRouter(usersController);

export { usersRouter };