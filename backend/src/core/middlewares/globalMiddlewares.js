// src/core/middlewares/index.js
const express = require('express');
const corsmiddleware = require('./cors');
const errorHanddler = require('./errorHandler');
const helmet = require('helmet');


const initGlobalMiddlewares = (app) => {

  app.use(corsmiddleware);

  app.use(helmet());
  
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
};

module.exports = initGlobalMiddlewares;