import { Router } from 'express';
import { getSedes } from '../controllers/sedeController.js';

const router = Router();

// GET /api/sedes
router.get('/', getSedes);

export default router;