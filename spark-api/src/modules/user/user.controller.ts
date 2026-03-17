import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../shared/types';
import * as userService from './user.service';

export async function getMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await userService.getProfile(req.userId!);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function getUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await userService.getPublicProfile(req.params.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await userService.updateProfile(req.userId!, req.body);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function updateLocation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { latitude, longitude } = req.body;
    await userService.updateLocation(req.userId!, latitude, longitude);
    res.json({ message: 'Location updated' });
  } catch (err) {
    next(err);
  }
}

export async function updateInterests(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const interests = await userService.updateInterests(req.userId!, req.body.interestIds);
    res.json(interests.map((ui) => ui.interest));
  } catch (err) {
    next(err);
  }
}

export async function addPhoto(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // For MVP, accept URL directly. In production, use S3 presigned upload
    const { url } = req.body;
    const photo = await userService.addPhoto(req.userId!, url);
    res.status(201).json(photo);
  } catch (err) {
    next(err);
  }
}

export async function deletePhoto(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await userService.deletePhoto(req.userId!, req.params.photoId);
    res.json({ message: 'Photo deleted' });
  } catch (err) {
    next(err);
  }
}

export async function reorderPhotos(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await userService.reorderPhotos(req.userId!, req.body.photoIds);
    res.json({ message: 'Photos reordered' });
  } catch (err) {
    next(err);
  }
}

export async function getReputation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const reputation = await userService.getReputation(req.userId!);
    res.json(reputation);
  } catch (err) {
    next(err);
  }
}

export async function getInterests(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const interests = await userService.getAllInterests();
    res.json(interests);
  } catch (err) {
    next(err);
  }
}

export async function updatePushToken(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await userService.updatePushToken(req.userId!, req.body.token);
    res.json({ message: 'Push token updated' });
  } catch (err) {
    next(err);
  }
}

export async function deleteAccount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await userService.deleteAccount(req.userId!);
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    next(err);
  }
}

export async function requestVerification(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await userService.requestVerification(req.userId!);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function activatePremium(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { durationDays } = req.body;
    const result = await userService.activatePremium(req.userId!, durationDays);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
