import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRequireAgendaManager,
  createRequireRoles
} from './activityRoutes.js';
import {
  createGetActivitiesController,
  createGetActivityByIdController
} from '../controllers/activityController.js';

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

const runMiddleware = async (middleware, usuario, method = 'GET', path = '/', body = {}, params = {}) => {
  const { req, res } = createMockReqRes(usuario, method, path, body, params);
  let continued = false;
  let forwardedError;

  await middleware(req, res, (error) => {
    if (error) forwardedError = error;
    else continued = true;
  });

  assert.equal(forwardedError, undefined);
  return { req, res, continued };
};

const runController = async (controller, req) => {
  const response = { statusCode: 200, body: null };
  const res = {
    status(code) {
      response.statusCode = code;
      return this;
    },
    json(body) {
      response.body = body;
      return this;
    }
  };
  await controller(req, res);
  return response;
};

test('Permisos Módulo 3: cliente externo no puede acceder a la agenda', async () => {
  const requireClassAccess = createRequireRoles(async () => 'cliente_externo')(
    ['socio', 'recepcionista', 'gerente'],
    'La agenda de clases está disponible para socios y personal de FitZone.'
  );
  const { res, continued } = await runMiddleware(requireClassAccess, { id: 9, rol: 2 });

  assert.equal(res.getStatusCode(), 403);
  assert.match(res.getResponseData().message, /disponible para socios y personal de FitZone/);
  assert.equal(continued, false);
});

test('Permisos Módulo 3: socio puede consultar la agenda, pero no gestionar clases', async () => {
  const resolveRole = async () => 'socio';
  const requireClassAccess = createRequireRoles(resolveRole)(
    ['socio', 'recepcionista', 'gerente'],
    'La agenda de clases está disponible para socios y personal de FitZone.'
  );
  const requireAgendaManager = createRequireAgendaManager({ getCurrentUserRole: resolveRole });

  const agendaResult = await runMiddleware(requireClassAccess, { id: 10, rol: 3 });
  assert.equal(agendaResult.continued, true);

  for (const method of ['POST', 'PUT', 'DELETE']) {
    const result = await runMiddleware(
      requireAgendaManager,
      { id: 10, rol: 3 },
      method,
      method === 'POST' ? '/' : '/1',
      { idSede: 1 },
      { id: '1' }
    );
    assert.equal(result.res.getStatusCode(), 403, `${method} debe ser rechazado`);
    assert.equal(result.continued, false);
  }
});

test('Permisos Módulo 3: solo socios pueden consultar o marcar notificaciones', async () => {
  for (const tipo of ['gerente', 'recepcionista', 'cliente_externo']) {
    const requireSocio = createRequireRoles(async () => tipo)(
      ['socio'],
      'Solo los socios pueden acceder a sus notificaciones.'
    );
    const { res, continued } = await runMiddleware(
      requireSocio,
      { id: 20, rol: 5 },
      'GET',
      '/notificaciones'
    );
    assert.equal(res.getStatusCode(), 403, `${tipo} no debe consultar notificaciones`);
    assert.equal(continued, false);
  }

  const requireSocio = createRequireRoles(async () => 'socio')(
    ['socio'],
    'Solo los socios pueden acceder a sus notificaciones.'
  );
  const { continued } = await runMiddleware(
    requireSocio,
    { id: 20, rol: 3 },
    'PUT',
    '/notificaciones/17/leida'
  );
  assert.equal(continued, true);
});

test('Permisos Módulo 3: gerente puede gestionar clases', async () => {
  const requireAgendaManager = createRequireAgendaManager({
    getCurrentUserRole: async () => 'gerente'
  });
  const { continued, res } = await runMiddleware(
    requireAgendaManager,
    { id: 1, rol: 4 },
    'POST',
    '/',
    { idSede: 1 }
  );

  assert.equal(res.getStatusCode(), 200);
  assert.equal(continued, true);
});

test('Permisos Módulo 3: recepcionista puede gestionar clases de su sede', async () => {
  const requireAgendaManager = createRequireAgendaManager({
    getCurrentUserRole: async () => 'recepcionista',
    getAssignedSiteForUser: async () => 1,
    getActivityById: async () => ({ id: 12, idSede: 1 })
  });
  const { continued } = await runMiddleware(
    requireAgendaManager,
    { id: 20, rol: 5 },
    'PUT',
    '/12',
    { idSede: 1 },
    { id: '12' }
  );

  assert.equal(continued, true);
});

test('Permisos Módulo 3: recepcionista no puede mover una clase a otra sede', async () => {
  const requireAgendaManager = createRequireAgendaManager({
    getCurrentUserRole: async () => 'recepcionista',
    getAssignedSiteForUser: async () => 1,
    getActivityById: async () => ({ id: 12, idSede: 1 })
  });
  const { res, continued } = await runMiddleware(
    requireAgendaManager,
    { id: 20, rol: 5 },
    'PUT',
    '/12',
    { idSede: 2 },
    { id: '12' }
  );

  assert.equal(res.getStatusCode(), 403);
  assert.equal(continued, false);
});

test('Permisos Módulo 3: recepción solo lista la sede asignada aunque solicite otra', async () => {
  let sedeConsultada;
  const controller = createGetActivitiesController({
    getCurrentUserRole: async () => 'recepcionista',
    getAssignedSiteForUser: async () => 1,
    getAllActivities: async (_idUsuario, idSede) => {
      sedeConsultada = idSede;
      return [{ id: 12, idSede }];
    }
  });
  const response = await runController(controller, {
    usuario: { id: 20, rol: 5 },
    query: { idSede: '2' }
  });

  assert.equal(response.statusCode, 200);
  assert.equal(sedeConsultada, 1);
  assert.deepEqual(response.body, [{ id: 12, idSede: 1 }]);
});

test('Permisos Módulo 3: recepción no puede consultar el detalle de otra sede', async () => {
  const controller = createGetActivityByIdController({
    getCurrentUserRole: async () => 'recepcionista',
    getAssignedSiteForUser: async () => 1,
    getActivityById: async () => ({ id: 12, idSede: 2 })
  });
  const response = await runController(controller, {
    usuario: { id: 20, rol: 5 },
    params: { id: '12' }
  });

  assert.equal(response.statusCode, 403);
  assert.equal(response.body.message, 'La clase no pertenece a tu sede asignada.');
});

test('Permisos Módulo 3: recepción no puede crear, modificar ni eliminar clases de otra sede', async () => {
  const requireAgendaManager = createRequireAgendaManager({
    getCurrentUserRole: async () => 'recepcionista',
    getAssignedSiteForUser: async () => 1,
    getActivityById: async () => ({ id: 12, idSede: 2 })
  });
  const requests = [
    { method: 'POST', path: '/', body: { idSede: 2 } },
    { method: 'PUT', path: '/12', body: { idSede: 2 }, params: { id: '12' } },
    { method: 'DELETE', path: '/12', params: { id: '12' } }
  ];

  for (const request of requests) {
    const { res, continued } = await runMiddleware(
      requireAgendaManager,
      { id: 20, rol: 5 },
      request.method,
      request.path,
      request.body,
      request.params
    );
    assert.equal(res.getStatusCode(), 403, `${request.method} debe ser rechazado`);
    assert.equal(continued, false);
  }
});
