import express from 'express';
import helmet from 'helmet';
import corsmiddleware from './core/middlewares/cors.js'; // o desde './config/cors.js'
import apiRouter from './appRouter.js';
import notFoundHandler from './core/errors/notFoundHandler.js';
import errorHandler from './core/errors/errorHandler.js';

const app = express();

// 1. Middlewares globales
app.use(corsmiddleware);
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Rutas de la API
app.use('/api', apiRouter);

// 3. Manejo de rutas inexistentes (404)
app.use(notFoundHandler);

// 4. Manejador centralizado de errores (500)
app.use(errorHandler);

export default app;