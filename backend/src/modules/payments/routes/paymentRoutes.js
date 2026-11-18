import { Router } from 'express';
import paymentController from '../controllers/paymentController.js';

const router = Router();

router.post('/nuevo', paymentController.createPayment);
router.post('/pay', paymentController.createPayment);
router.get('/por-reserva/:reserva_id', paymentController.getByReserva);
router.get('/:id/comprobante', paymentController.downloadComprobantePdf);

export default router;