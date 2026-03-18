import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware';
import * as paymentController from './payment.controller';

const router = Router();

// Authenticated: create checkout session
router.post('/checkout', authenticate, paymentController.createCheckout);

// Public: success/cancel redirect pages
router.get('/success', paymentController.successPage);
router.get('/cancel', paymentController.cancelPage);

export default router;
