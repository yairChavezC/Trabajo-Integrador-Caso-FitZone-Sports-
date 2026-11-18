// src/modules/canchas/canchas.module.js
import pool from '../../config/db.js'; // Revisá que la ruta relativa a db.js sea correcta
import { createCanchaRepository } from './repositories/canchaRepository.js';
import { createCanchaService } from './services/canchaService.js';
import { createCanchaController } from './controllers/canchaController.js';
import { createCanchasRouter } from './routes/canchasRoutes.js';

const canchaRepository = createCanchaRepository(pool);
const canchaService = createCanchaService(canchaRepository);
const canchaController = createCanchaController(canchaService);
const canchasRouter = createCanchasRouter(canchaController);

export { canchaService };
export default canchasRouter;