import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/types';
import * as mapService from './map.service';

export async function getNearby(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'lat and lng query params required' });
    }

    const users = await mapService.getNearbyUsers(req.userId!, lat, lng);
    res.json(users);
  } catch (err) {
    next(err);
  }
}
