import { Router } from 'express';
import * as matchController from './match.controller';
import { authenticate } from '../auth/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', matchController.getMatches);
router.get('/:matchId', matchController.getMatch);
router.delete('/:matchId', matchController.unmatch);
router.get('/:matchId/compatibility', matchController.getCompatibility);

export default router;
