import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/types';
import * as swipeService from './swipe.service';

export async function discover(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const profiles = await swipeService.getDiscoverProfiles(req.userId!);
    res.json(profiles);
  } catch (err) {
    next(err);
  }
}

export async function createSwipe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { targetUserId, direction } = req.body;
    const result = await swipeService.createSwipe(req.userId!, targetUserId, direction);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getEnergy(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const energy = await swipeService.getEnergy(req.userId!);
    res.json(energy);
  } catch (err) {
    next(err);
  }
}

export async function getReceivedLikes(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const likes = await swipeService.getReceivedLikes(req.userId!);
    res.json(likes);
  } catch (err) {
    next(err);
  }
}
