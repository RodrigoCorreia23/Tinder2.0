import { Router } from 'express';
import * as blockController from './block.controller';

const router = Router();

router.post('/report', blockController.reportUser);
router.post('/:userId', blockController.blockUser);
router.delete('/:userId', blockController.unblockUser);

export default router;
