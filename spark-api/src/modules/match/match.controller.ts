import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/types';
import * as matchService from './match.service';

export async function getMatches(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const matches = await matchService.getMatches(req.userId!);
    res.json(matches);
  } catch (err) {
    next(err);
  }
}

export async function getMatch(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const match = await matchService.getMatch(req.params.matchId, req.userId!);
    res.json(match);
  } catch (err) {
    next(err);
  }
}

export async function unmatch(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await matchService.unmatch(req.params.matchId, req.userId!);
    res.json({ message: 'Unmatched successfully' });
  } catch (err) {
    next(err);
  }
}

export async function getCompatibility(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await matchService.getCompatibility(req.params.matchId, req.userId!);
    res.json(data);
  } catch (err) {
    next(err);
  }
}
