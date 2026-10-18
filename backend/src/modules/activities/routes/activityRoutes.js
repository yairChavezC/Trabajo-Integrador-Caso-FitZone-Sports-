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
  postConfirmOffer,
  postRejectOffer,
  getClassInscriptions
} from '../controllers/activityController.js';

const router = express.Router();

router.get('/', getActivities);
router.post('/', createActivity);
router.get('/:id/inscripciones', getClassInscriptions);
router.post('/:id/reservas', postReservation);
router.delete('/:id/reservas', deleteReservation);
router.post('/:id/lista-espera', postWaitlist);
router.post('/:id/oferta/confirmar', postConfirmOffer);
router.post('/:id/oferta/rechazar', postRejectOffer);
router.get('/:id', getActivityById);
router.put('/:id', updateActivity);
router.delete('/:id', deleteActivity);

export default router;