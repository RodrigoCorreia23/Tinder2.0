import { Router } from 'express';
import * as chatController from './chat.controller';
import { authenticate } from '../auth/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/:matchId/messages', chatController.getMessages);
router.post('/:matchId/messages', chatController.sendMessage);
router.put('/:matchId/messages/read', chatController.markAsRead);

export default router;
