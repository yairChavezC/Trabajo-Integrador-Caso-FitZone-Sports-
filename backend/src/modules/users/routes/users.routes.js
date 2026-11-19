import { Router } from 'express';
import { requireRole } from '../../memberships/requireRole.js';

const ROL_RECEPCIONISTA = 1;
const ROL_GERENTE = 4;
const soloPersonal = requireRole(ROL_RECEPCIONISTA, ROL_GERENTE);

// Socio / cliente externo: solo pueden ver sus propios datos
function propioOPersonal(req, res, next) {
  const rol = Number(req.usuario?.rol);
  const esPersonal = rol === ROL_RECEPCIONISTA || rol === ROL_GERENTE;
  if (esPersonal || String(req.usuario?.id) === String(req.params.id)) return next();

  const error = new Error('No tenés permiso para ver los datos de otro usuario');
  error.status = 403;
  error.statusCode = 403;
  return next(error);
}

export function createUsersRouter(controller) {
  const router = Router();

  router.get('/', soloPersonal, controller.getUsers);
  router.get('/:id', propioOPersonal, controller.getUser);
  router.post('/', soloPersonal, controller.createUser);
  router.patch('/:id', soloPersonal, controller.updateUser);
  router.get('/:id/pagos', propioOPersonal, controller.getPagos);

  return router;
}