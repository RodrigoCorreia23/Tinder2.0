import { Router } from 'express';
import * as mapController from './map.controller';
import { authenticate } from '../auth/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/nearby', mapController.getNearby);

export default router;
