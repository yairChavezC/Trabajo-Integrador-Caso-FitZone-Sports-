import { Router } from 'express';
import paymentController from '../controllers/paymentController.js';

const router = Router();

// Endpoint para procesar el pago (orquestador)
router.post('/nuevo', paymentController.createPayment);
router.post('/pay', paymentController.createPayment); // Compatibilidad con el frontend actual

// Endpoint para consultar el estado del pago por id de reserva
router.get('/por-reserva/:reserva_id', paymentController.getByReserva);

export default router;