import { Router } from 'express';
import * as swipeController from './swipe.controller';
import { authenticate } from '../auth/auth.middleware';
import { validateRequest } from '../../shared/middleware/validateRequest';
import { createSwipeSchema } from './swipe.validation';

const router = Router();

router.use(authenticate);

router.get('/discover', swipeController.discover);
router.post('/', validateRequest(createSwipeSchema), swipeController.createSwipe);
router.get('/energy', swipeController.getEnergy);
router.get('/likes', swipeController.getReceivedLikes);
router.get('/super-like-status', swipeController.getSuperLikeStatus);

export default router;
