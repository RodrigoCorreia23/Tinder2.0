import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/types';
import * as plannerService from './planner.service';

export async function generatePlan(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const plan = await plannerService.generateDatePlan(req.params.matchId, req.userId!);
    res.status(201).json(plan);
  } catch (err) {
    next(err);
  }
}

export async function respondToPlan(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { accepted } = req.body;
    const plan = await plannerService.respondToPlan(req.params.planId, req.userId!, accepted);
    res.json(plan);
  } catch (err) {
    next(err);
  }
}

export async function getPlans(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const plans = await plannerService.getDatePlans(req.params.matchId, req.userId!);
    res.json(plans);
  } catch (err) {
    next(err);
  }
}
