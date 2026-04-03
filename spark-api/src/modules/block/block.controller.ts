import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/types';
import * as blockService from './block.service';

export async function blockUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await blockService.blockUser(req.userId!, req.params.userId);
    res.json({ message: 'User blocked successfully' });
  } catch (err) {
    next(err);
  }
}

export async function unblockUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await blockService.unblockUser(req.userId!, req.params.userId);
    res.json({ message: 'User unblocked successfully' });
  } catch (err) {
    next(err);
  }
}

export async function reportUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { reportedId, reason, details } = req.body;
    await blockService.reportUser(req.userId!, reportedId, reason, details);
    res.json({ message: 'Report submitted successfully' });
  } catch (err) {
    next(err);
  }
}
