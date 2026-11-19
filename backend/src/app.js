import { createRequire } from 'module';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import corsmiddleware from './core/middlewares/cors.js';
import apiRouter from './appRouter.js';
import notFoundHandler from './core/errors/notFoundHandler.js';
import errorHandler from './core/errors/errorHandler.js';

const require = createRequire(import.meta.url);
const swaggerDocument = require('../swagger.json');

const app = express();

// 1. Middlewares globales
app.use(corsmiddleware);
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Documentación OpenAPI / Swagger
app.use(
  '/api-docs',
  helmet({ contentSecurityPolicy: false }),
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument)
);

// 3. Rutas de la API
app.use('/api', apiRouter);

// 4. Manejo de rutas inexistentes (404) y errores (500)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;