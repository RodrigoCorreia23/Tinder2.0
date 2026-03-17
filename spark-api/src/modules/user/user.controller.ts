import { Request, Response, NextFunction } from 'express';
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
    const { selfieUrl } = req.body;
    if (!selfieUrl) {
      return res.status(400).json({ error: 'selfieUrl is required' });
    }
    const result = await userService.requestVerification(req.userId!, selfieUrl);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function generateShareLink(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await userService.generateShareLink(req.userId!);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getSharedProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.params;
    const profile = await userService.getSharedProfile(token);
    res.json(profile);
  } catch (err) {
    next(err);
  }
}

export async function getSharedProfileHtml(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.params;
    const profile = await userService.getSharedProfile(token);

    const photosHtml = profile.photos
      .map(
        (p) =>
          `<img src="${p.url}" alt="Photo" style="width:200px;height:260px;object-fit:cover;border-radius:12px;" />`
      )
      .join('');

    const interestsHtml = profile.interests
      .map(
        (i) =>
          `<span style="display:inline-block;background:#FFE6E6;color:#FF6B6B;padding:6px 14px;border-radius:16px;margin:4px;font-size:14px;">${i.name}</span>`
      )
      .join('');

    const verifiedBadge = profile.isVerified
      ? '<span style="color:#4FC3F7;font-size:18px;margin-left:6px;">&#10004; Verified</span>'
      : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${profile.firstName}'s Spark Profile</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F5F5F5; color: #2C3E50; }
    .container { max-width: 480px; margin: 0 auto; padding: 24px 16px; }
    .header { text-align: center; margin-bottom: 24px; }
    .logo { font-size: 28px; font-weight: bold; color: #FF6B6B; margin-bottom: 8px; }
    .name { font-size: 24px; font-weight: bold; margin-bottom: 4px; }
    .bio { color: #7F8C8D; font-size: 14px; margin-top: 8px; line-height: 1.5; }
    .photos { display: flex; gap: 8px; overflow-x: auto; padding: 16px 0; }
    .section { background: #fff; border-radius: 16px; padding: 16px; margin-bottom: 16px; }
    .section-title { font-size: 16px; font-weight: bold; margin-bottom: 12px; }
    .interests { display: flex; flex-wrap: wrap; gap: 4px; }
    .cta { display: block; text-align: center; background: #FF6B6B; color: #fff; padding: 16px; border-radius: 24px; text-decoration: none; font-weight: bold; font-size: 16px; margin-top: 24px; }
    .cta:hover { background: #E55A5A; }
    .badges { display: flex; gap: 12px; justify-content: center; margin-top: 16px; }
    .badges img { height: 40px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Spark</div>
    </div>
    <div class="section">
      <div class="name">${profile.firstName}, ${profile.age} ${verifiedBadge}</div>
      ${profile.bio ? `<div class="bio">${profile.bio}</div>` : ''}
    </div>
    <div class="section">
      <div class="section-title">Photos</div>
      <div class="photos">${photosHtml}</div>
    </div>
    ${
      profile.interests.length > 0
        ? `<div class="section">
      <div class="section-title">Interests</div>
      <div class="interests">${interestsHtml}</div>
    </div>`
        : ''
    }
    <a class="cta" href="https://spark-dating.app/download">Open in Spark</a>
    <div class="badges">
      <a href="https://apps.apple.com"><img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="App Store" /></a>
      <a href="https://play.google.com"><img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Google Play" /></a>
    </div>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
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

export async function activateBoost(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await userService.activateBoost(req.userId!);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function enableTravelMode(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { latitude, longitude, city } = req.body;
    if (latitude == null || longitude == null || !city) {
      return res.status(400).json({ error: 'latitude, longitude, and city are required' });
    }
    const result = await userService.enableTravelMode(req.userId!, latitude, longitude, city);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function disableTravelMode(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await userService.disableTravelMode(req.userId!);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
