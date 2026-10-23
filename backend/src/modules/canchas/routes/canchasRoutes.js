import { Router } from 'express';
import { getDisponibilidad } from '../controllers/canchaController.js';

const router = Router();

router.get('/disponibilidad', getDisponibilidad);

export default router;