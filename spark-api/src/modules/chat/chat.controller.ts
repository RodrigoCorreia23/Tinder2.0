import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/types';
import * as chatService from './chat.service';

export async function getMessages(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { matchId } = req.params;
    const cursor = req.query.cursor as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await chatService.getMessages(matchId, req.userId!, cursor, limit);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function sendMessage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { matchId } = req.params;
    const { content } = req.body;
    const message = await chatService.sendMessage(matchId, req.userId!, content);
    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { matchId } = req.params;
    await chatService.markAsRead(matchId, req.userId!);
    res.json({ message: 'Messages marked as read' });
  } catch (err) {
    next(err);
  }
}
