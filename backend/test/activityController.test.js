import test from 'node:test';
import assert from 'node:assert/strict';
import {
  updateActivity,
  deleteActivity,
  postReservation,
  getActivityById,
  markClassNotificationAsRead,
  postWaitlist,
  acceptWaitlistOffer,
  deleteReservation,
  getClassInscriptions
} from '../src/modules/activities/controllers/activityController.js';

const invokeController = async (controller, req) => {
  const response = { statusCode: 200, body: null };
  const res = {
    status(code) {
      response.statusCode = code;
      return this;
    },
    json(body) {
      response.body = body;
      return this;
    },
    location() {
      return this;
    }
  };
  await controller(req, res);
  return response;
};

test('Controlador - ramas de validación de IDs en handlers', async () => {
  const resUpdateIdInv = await invokeController(updateActivity, {
    usuario: { id: 1, rol: 'gerente' },
    params: { id: 'abc' },
    body: { profesor: 'Test' }
  });
  assert.equal(resUpdateIdInv.statusCode, 400);
  assert.equal(resUpdateIdInv.body.message, 'El ID de la clase es inválido.');

  const resDeleteIdInv = await invokeController(deleteActivity, {
    usuario: { id: 1, rol: 'gerente' },
    params: { id: 'xyz' }
  });
  assert.equal(resDeleteIdInv.statusCode, 400);
  assert.equal(resDeleteIdInv.body.message, 'El ID de la clase es inválido.');

  const resDeleteNotFound = await invokeController(deleteActivity, {
    usuario: { id: 1, rol: 'gerente' },
    params: { id: '999999' }
  });
  assert.equal(resDeleteNotFound.statusCode, 404);
  assert.equal(resDeleteNotFound.body.message, 'Clase no encontrada.');

  const resResIdInv = await invokeController(postReservation, {
    usuario: { id: 1 },
    params: { id: '0' }
  });
  assert.equal(resResIdInv.statusCode, 400);
  assert.equal(resResIdInv.body.message, 'El ID de la clase es inválido.');

  const resGetByIdInv = await invokeController(getActivityById, {
    params: { id: 'invalid' }
  });
  assert.equal(resGetByIdInv.statusCode, 400);

  const resNotifInv = await invokeController(markClassNotificationAsRead, {
    usuario: { id: 1 },
    params: { id: 'bad' }
  });
  assert.equal(resNotifInv.statusCode, 400);

  const resWaitInv = await invokeController(postWaitlist, {
    usuario: { id: 1 },
    params: { id: '-5' }
  });
  assert.equal(resWaitInv.statusCode, 400);

  const resAcceptInv = await invokeController(acceptWaitlistOffer, {
    usuario: { id: 1 },
    params: { id: 'abc' }
  });
  assert.equal(resAcceptInv.statusCode, 400);

  const resCancelInv = await invokeController(deleteReservation, {
    usuario: { id: 1 },
    params: { id: '0' }
  });
  assert.equal(resCancelInv.statusCode, 400);

  const resInsInv = await invokeController(getClassInscriptions, {
    params: { id: 'NaN' }
  });
  assert.equal(resInsInv.statusCode, 400);
});