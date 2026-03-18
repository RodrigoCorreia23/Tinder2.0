import prisma from '../../config/database';
import { AppError } from '../../shared/middleware/errorHandler';
import { randomizeCoordinates } from '../../shared/utils/geo';
import { getBlockedIds } from '../block/block.service';

const FREE_RADIUS_METERS = 1000;
const PREMIUM_RADIUS_METERS = 5000;

// Track online users via socket connections
const onlineUsers = new Set<string>();

export function setUserOnline(userId: string) {
  onlineUsers.add(userId);
}

export function setUserOffline(userId: string) {
  onlineUsers.delete(userId);
}

export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId);
}

interface NearbyFilters {
  minReputation?: number;
  commonInterestsOnly?: boolean;
}

export async function getNearbyUsers(
  userId: string,
  lat: number,
  lng: number,
  filters?: NearbyFilters
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      gender: true,
      lookingFor: true,
      isPremium: true,
      isTravelMode: true,
      travelLatitude: true,
      travelLongitude: true,
      interests: { select: { interestId: true } },
    },
  });

  if (!user) throw new AppError('User not found', 404);

  // Use travel coordinates if travel mode is active
  const effectiveLat = user.isTravelMode && user.travelLatitude != null
    ? user.travelLatitude
    : lat;
  const effectiveLng = user.isTravelMode && user.travelLongitude != null
    ? user.travelLongitude
    : lng;

  const radiusMeters = user.isPremium ? PREMIUM_RADIUS_METERS : FREE_RADIUS_METERS;

  // Get blocked user IDs (both directions)
  const blockedIds = await getBlockedIds(userId);

  // Find users within radius matching preferences
  const latDelta = radiusMeters / 111320;
  const lngDelta = radiusMeters / (111320 * Math.cos((effectiveLat * Math.PI) / 180));

  const nearbyUsers = await prisma.user.findMany({
    where: {
      id: { notIn: [userId, ...blockedIds] },
      isActive: true,
      gender: { in: user.lookingFor },
      lookingFor: { hasSome: [user.gender] },
      latitude: {
        gte: effectiveLat - latDelta,
        lte: effectiveLat + latDelta,
      },
      longitude: {
        gte: effectiveLng - lngDelta,
        lte: effectiveLng + lngDelta,
      },
      // Premium filter: minimum reputation
      ...(filters?.minReputation ? { reputationScore: { gte: filters.minReputation } } : {}),
    },
    select: {
      id: true,
      firstName: true,
      dateOfBirth: true,
      bio: true,
      reputationScore: true,
      latitude: true,
      longitude: true,
      lastActiveAt: true,
      photos: { orderBy: { position: 'asc' } },
      interests: { include: { interest: true } },
    },
  });

  const userInterestIds = new Set(user.interests.map((i) => i.interestId));

  // Filter to users within radius
  const filteredUsers = nearbyUsers.filter((u) => {
    if (!u.latitude || !u.longitude) return false;
    const dist = haversineMeters(effectiveLat, effectiveLng, u.latitude, u.longitude);
    return dist <= radiusMeters;
  });

  // Get swipe status for nearby users
  const nearbyUserIds = filteredUsers.map((u) => u.id);

  const swipes = nearbyUserIds.length > 0
    ? await prisma.swipe.findMany({
        where: {
          swiperId: userId,
          swipedId: { in: nearbyUserIds },
        },
        select: { swipedId: true, direction: true },
      })
    : [];

  const swipeMap = new Map(swipes.map((s) => [s.swipedId, s.direction]));

  // Get active matches with nearby users
  const matches = nearbyUserIds.length > 0
    ? await prisma.match.findMany({
        where: {
          status: 'active',
          OR: [
            { user1Id: userId, user2Id: { in: nearbyUserIds } },
            { user2Id: userId, user1Id: { in: nearbyUserIds } },
          ],
        },
        select: { id: true, user1Id: true, user2Id: true },
      })
    : [];

  const matchMap = new Map<string, string>();
  matches.forEach((m) => {
    const otherUserId = m.user1Id === userId ? m.user2Id : m.user1Id;
    matchMap.set(otherUserId, m.id);
  });

  // Randomize locations for privacy and enrich with swipe status
  return filteredUsers
    .map((u) => {
      const randomized = randomizeCoordinates(u.latitude!, u.longitude!, 50);
      const age = Math.floor(
        (Date.now() - u.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      );

      const userInterests = u.interests.map((ui) => ui.interest);
      const commonInterestsCount = u.interests.filter(
        (ui) => userInterestIds.has(ui.interestId)
      ).length;

      // Determine swipe status: matched > liked/passed > null
      let swipeStatus: 'liked' | 'passed' | 'matched' | null = null;
      let matchId: string | null = null;

      if (matchMap.has(u.id)) {
        swipeStatus = 'matched';
        matchId = matchMap.get(u.id)!;
      } else if (swipeMap.has(u.id)) {
        swipeStatus = swipeMap.get(u.id) === 'like' ? 'liked' : 'passed';
      }

      return {
        id: u.id,
        firstName: u.firstName,
        age,
        bio: u.bio,
        reputationScore: u.reputationScore,
        photo: u.photos[0] || null,
        photos: u.photos,
        interests: userInterests.slice(0, 5),
        commonInterestsCount,
        isOnline: isUserOnline(u.id),
        lastActiveAt: u.lastActiveAt,
        location: randomized, // Never real location
        swipeStatus,
        matchId,
      };
    })
    .filter((u) => {
      // Premium filter: common interests only
      if (filters?.commonInterestsOnly && u.commonInterestsCount === 0) return false;
      return true;
    })
    .sort((a, b) => {
      // Online users first, then by reputation
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return b.reputationScore - a.reputationScore;
    });
}

export function getRadiusForUser(isPremium: boolean): number {
  return isPremium ? PREMIUM_RADIUS_METERS : FREE_RADIUS_METERS;
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
