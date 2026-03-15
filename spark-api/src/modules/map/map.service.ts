import prisma from '../../config/database';
import { AppError } from '../../shared/middleware/errorHandler';
import { randomizeCoordinates } from '../../shared/utils/geo';

const PROXIMITY_RADIUS_METERS = 200;

export async function getNearbyUsers(userId: string, lat: number, lng: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { gender: true, lookingFor: true },
  });

  if (!user) throw new AppError('User not found', 404);

  // Find users within 200m radius matching preferences
  // Using Haversine approximation since we're not using PostGIS extension directly
  const latDelta = PROXIMITY_RADIUS_METERS / 111320; // ~meters per degree latitude
  const lngDelta = PROXIMITY_RADIUS_METERS / (111320 * Math.cos((lat * Math.PI) / 180));

  const nearbyUsers = await prisma.user.findMany({
    where: {
      id: { not: userId },
      isActive: true,
      gender: { in: user.lookingFor },
      lookingFor: { hasSome: [user.gender] },
      latitude: {
        gte: lat - latDelta,
        lte: lat + latDelta,
      },
      longitude: {
        gte: lng - lngDelta,
        lte: lng + lngDelta,
      },
    },
    select: {
      id: true,
      firstName: true,
      dateOfBirth: true,
      bio: true,
      reputationScore: true,
      latitude: true,
      longitude: true,
      photos: { orderBy: { position: 'asc' } },
      interests: { include: { interest: true } },
    },
  });

  // Randomize locations for privacy and calculate exact distance
  return nearbyUsers
    .filter((u) => {
      if (!u.latitude || !u.longitude) return false;
      const dist = haversineMeters(lat, lng, u.latitude, u.longitude);
      return dist <= PROXIMITY_RADIUS_METERS;
    })
    .map((u) => {
      const randomized = randomizeCoordinates(u.latitude!, u.longitude!, 50);
      const age = Math.floor(
        (Date.now() - u.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      );

      return {
        id: u.id,
        firstName: u.firstName,
        age,
        bio: u.bio,
        reputationScore: u.reputationScore,
        photo: u.photos[0] || null,
        photos: u.photos,
        interests: u.interests.map((ui) => ui.interest).slice(0, 3),
        location: randomized, // Never real location
      };
    });
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
