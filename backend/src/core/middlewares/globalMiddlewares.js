import express from 'express';
import helmet from 'helmet';
import corsmiddleware from './cors.js';

const initGlobalMiddlewares = (app) => {
  app.use(corsmiddleware);
  app.use(helmet());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
};

export default initGlobalMiddlewares;