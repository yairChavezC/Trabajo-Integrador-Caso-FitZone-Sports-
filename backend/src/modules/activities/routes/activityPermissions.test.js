import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import activityRouter from './activityRoutes.js';

// Simulador de request y respuesta para probar autorización de rutas
const createMockReqRes = (usuario, method = 'GET', path = '/', body = {}, params = {}) => {
  const req = {
    method,
    path,
    usuario,
    body,
    params
  };

  let statusCode = 200;
  let responseData = null;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
    getStatusCode: () => statusCode,
    getResponseData: () => responseData
  };

  return { req, res };
};

test('Permisos Módulo 3: Cliente externo es bloqueado de la agenda de clases', async () => {
  const app = express();
  app.use(express.json());
  // Simular middleware de auth que inyecta usuario con rol de cliente_externo (id_rol = 2)
  app.use((req, res, next) => {
    req.usuario = { id: 9, rol: 2 }; // cliente_externo
    next();
  });
  app.use('/api/v1/clases', activityRouter);

  // Intentar obtener clases con cliente externo
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/clases`);
    assert.equal(response.status, 403);
    const body = await response.json();
    assert.match(body.message, /disponible para socios y personal de FitZone/);
  } finally {
    server.close();
  }
});

test('Permisos Módulo 3: Socio no puede crear ni eliminar clases', async () => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.usuario = { id: 10, rol: 3 }; // socio
    next();
  });
  app.use('/api/v1/clases', activityRouter);

  const server = app.listen(0);
  const port = server.address().port;

  try {
    const postRes = await fetch(`http://127.0.0.1:${port}/api/v1/clases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Clase Fake' })
    });
    assert.equal(postRes.status, 403);

    const delRes = await fetch(`http://127.0.0.1:${port}/api/v1/clases/1`, {
      method: 'DELETE'
    });
    assert.equal(delRes.status, 403);
  } finally {
    server.close();
  }
});

test('Permisos Módulo 3: Gerente/Admin tiene acceso habilitado para gestión', async () => {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.usuario = { id: 1, rol: 4 }; // gerente / admin
    next();
  });
  app.use('/api/v1/clases', activityRouter);

  const server = app.listen(0);
  const port = server.address().port;

  try {
    // Al listar inscripciones de una clase inexistente, supera el middleware de rol y llega al servicio (404)
    const resInsc = await fetch(`http://127.0.0.1:${port}/api/v1/clases/99999/inscripciones`);
    assert.notEqual(resInsc.status, 403, 'No debe ser rechazado por 403');
    assert.equal(resInsc.status, 404);
  } finally {
    server.close();
  }
});
