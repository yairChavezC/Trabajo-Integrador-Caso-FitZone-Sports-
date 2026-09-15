import { Router } from 'express';
import paymentController from '../controllers/paymentController.js';

const router = Router();

// Ruta POST para procesar un pago: POST /api/payments/pay
router.post('/pay', paymentController.createPayment);

export default router;