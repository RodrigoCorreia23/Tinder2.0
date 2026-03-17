import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/types';
import * as matchService from './match.service';
import { generateIceBreaker } from '../../shared/utils/ai';
import prisma from '../../config/database';

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

export async function getUnreadCount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await matchService.getUnreadCount(req.userId!);
    res.json(result);
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

export async function getIceBreakers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const match = await prisma.match.findUnique({
      where: { id: req.params.matchId },
      include: {
        user1: { select: { id: true, interests: { include: { interest: true } } } },
        user2: { select: { id: true, interests: { include: { interest: true } } } },
      },
    });

    if (!match || (match.user1Id !== req.userId && match.user2Id !== req.userId)) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const isUser1 = match.user1Id === req.userId;
    const myInterests = (isUser1 ? match.user1 : match.user2).interests.map((i) => i.interest.name);
    const theirInterests = (isUser1 ? match.user2 : match.user1).interests.map((i) => i.interest.name);
    const commonInterests = myInterests.filter((i) => theirInterests.includes(i));

    const iceBreakers = await generateIceBreaker(commonInterests, myInterests, theirInterests);
    res.json({ iceBreakers });
  } catch (err) {
    next(err);
  }
}
