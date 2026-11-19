import pool from '../../config/db.js';
import paymentService from '../payments/services/paymentService.js';

import { createPlansRepository } from './repositories/plans.repository.js';
import { createSubscriptionsRepository } from './repositories/subscriptions.repository.js';

import { createPlansService } from './services/plans.service.js';
import { createSubscriptionsService } from './services/subscriptions.service.js';

import { createPlansController } from './controllers/plans.controller.js';
import { createSubscriptionsController } from './controllers/subscriptions.controller.js';

import { createPlansRouter } from './routes/plans.routes.js';
import { createSubscriptionsRouter } from './routes/subscriptions.routes.js';

// 1. Instanciar Repositorios
const plansRepo = createPlansRepository(pool);
const subsRepo = createSubscriptionsRepository(pool);

// 2. Instanciar Servicios
const plansService = createPlansService(plansRepo);
const subsService = createSubscriptionsService({
  plansRepository: plansRepo,
  subscriptionsRepository: subsRepo,
  paymentService,
  pool,
});

// 3. Instanciar Controladores
const plansController = createPlansController(plansService);
const subsController = createSubscriptionsController(subsService);

// 4. Instanciar Rutas
const plansRouter = createPlansRouter(plansController);
const subscriptionsRouter = createSubscriptionsRouter(subsController);

export { plansRouter, subscriptionsRouter };