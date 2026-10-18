import express from 'express';
import {
  getActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
  postReservation,
  postWaitlist,
  deleteReservation,
  getClassInscriptions,
  getNotifications,
  readNotification
} from '../controllers/activityController.js';

const router = express.Router();

const requireAdministrator = (req, res, next) => {
  if (Number(req.usuario?.rol) !== 1) {
    return res.status(403).json({ message: 'Se requiere rol de administrador.' });
  }
  return next();
};

router.get('/', getActivities);
router.get('/notificaciones', getNotifications);
router.put('/notificaciones/:notificationId/leida', readNotification);
router.post('/', requireAdministrator, createActivity);
router.get('/:id/inscripciones', requireAdministrator, getClassInscriptions);
router.post('/:id/reservas', postReservation);
router.delete('/:id/reservas', deleteReservation);
router.post('/:id/lista-espera', postWaitlist);
router.get('/:id', getActivityById);
router.put('/:id', requireAdministrator, updateActivity);
router.delete('/:id', requireAdministrator, deleteActivity);

export default router;