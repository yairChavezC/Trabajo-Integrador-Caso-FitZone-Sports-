import jwt from 'jsonwebtoken';
import pool  from '../../config/db.js';
import { createAuthRepository } from './authRepository.js';
import { createAuthService } from './authService.js';
import { createAuthController } from './authController.js';
import { createAuthRouter } from './authRoutes.js';

const authRepository = createAuthRepository(pool);
const authService = createAuthService({
  authRepo: authRepository,
  jwtLib: jwt,
  jwtSecret: process.env.JWT_SECRET
});
const authController = createAuthController(authService);
const authRouter = createAuthRouter(authController);

export { authService };
export default authRouter;