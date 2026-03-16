import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/types';
import * as mapService from './map.service';
import prisma from '../../config/database';

export async function getNearby(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'lat and lng query params required' });
    }

    // Parse premium filters
    const minReputation = req.query.minReputation
      ? parseFloat(req.query.minReputation as string)
      : undefined;
    const commonInterestsOnly = req.query.commonInterestsOnly === 'true';

    const users = await mapService.getNearbyUsers(req.userId!, lat, lng, {
      minReputation,
      commonInterestsOnly,
    });

    // Get user's premium status for range info
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { isPremium: true },
    });

    const radius = mapService.getRadiusForUser(user?.isPremium ?? false);

    res.json({
      users,
      radius,
      isPremium: user?.isPremium ?? false,
    });
  } catch (err) {
    next(err);
  }
}
