import { Router } from 'express';
import * as authController from './auth.controller';
import { validateRequest } from '../../shared/middleware/validateRequest';
import { signupSchema, loginSchema, refreshSchema } from './auth.validation';

const router = Router();

router.post('/signup', validateRequest(signupSchema), authController.signup);
router.post('/login', validateRequest(loginSchema), authController.login);
router.post('/refresh', validateRequest(refreshSchema), authController.refresh);

export default router;
