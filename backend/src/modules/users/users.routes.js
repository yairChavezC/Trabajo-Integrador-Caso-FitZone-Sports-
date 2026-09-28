import { Router } from 'express';
import controller from './users.controller.js';

const router = Router();

router.get('/', controller.getUsers);
router.get('/:id', controller.getUser);
router.post('/', controller.createUser);

export default router;