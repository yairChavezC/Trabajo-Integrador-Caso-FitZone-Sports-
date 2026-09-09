import { Router } from 'express';
import { getGrilla } from '../controllers/canchaController.js';

const router = Router();

// GET /api/canchas/grilla?idSede=1&fecha=2026-09-07
router.get('/grilla', getGrilla);

export default router;