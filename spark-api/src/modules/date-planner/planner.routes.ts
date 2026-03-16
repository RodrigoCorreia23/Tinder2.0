import { Router } from 'express';
import * as plannerController from './planner.controller';
import { authenticate } from '../auth/auth.middleware';

const router = Router();

router.use(authenticate);

// Availability
router.post('/matches/:matchId/availability', plannerController.setAvailability);
router.get('/matches/:matchId/availability', plannerController.getAvailability);

// Date plans
router.post('/matches/:matchId/date-plan', plannerController.generatePlan);
router.get('/matches/:matchId/date-plans', plannerController.getPlans);
router.put('/:planId/respond', plannerController.respondToPlan);

export default router;
