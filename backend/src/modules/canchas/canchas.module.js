// backend/src/modules/canchas/canchas.module.js
import pool from '../../config/db.js';
import paymentService from '../payments/services/paymentService.js';
import { createPagoCanchaOrchestrator } from '../../core/orchestrator/pagoCanchaOrchestrator.js';

// Reglas de Dominio (Patrón Strategy y Patrón State)
import { seleccionarEstrategiaTarifa } from './domain/canchaDomain.js';
import { validarTransicionReserva } from './domain/reservaCanchaDomain.js';

// Pipeline Canchas (Grilla y Disponibilidad)
import { createCanchaRepository } from './repositories/canchaRepository.js';
import { createCanchaService } from './services/canchaService.js';
import { createCanchaController } from './controllers/canchaController.js';
import { createCanchasRouter } from './routes/canchasRoutes.js';

// Pipeline Reserva Canchas (Checkout y Mis Reservas)
import { createReservaCanchaRepository } from './repositories/reservaCanchaRepository.js';
import { createReservaCanchaService } from './services/reservaCanchaService.js';
import { createReservaCanchaController } from './controllers/reservaCanchaController.js';
import { createReservaCanchaRouter } from './routes/reservaCanchaRoutes.js';

// 1. Instanciar pipeline de Canchas (inyectando Strategy de tarifas)
const canchaRepository = createCanchaRepository(pool);
const canchaService = createCanchaService(canchaRepository, seleccionarEstrategiaTarifa);
const canchaController = createCanchaController(canchaService);
const canchasRouter = createCanchasRouter(canchaController);

// 2. Instanciar pipeline de Reservas de Cancha (inyectando State de transiciones)
const reservaCanchaRepository = createReservaCanchaRepository(pool);
const reservaCanchaService = createReservaCanchaService(
  reservaCanchaRepository,
  validarTransicionReserva
);

// 3. Instanciar Orquestador inyectando ambos servicios
const { procesarReservaConPago } = createPagoCanchaOrchestrator({
  reservaCanchaService,
  paymentService
});

// 4. Instanciar Controller y Router de Reservas
const reservaCanchaController = createReservaCanchaController({
  reservaCanchaService,
  procesarReservaConPago
});
const reservaCanchaRouter = createReservaCanchaRouter(reservaCanchaController);

export { canchaService, reservaCanchaService, reservaCanchaRouter };
export default canchasRouter;