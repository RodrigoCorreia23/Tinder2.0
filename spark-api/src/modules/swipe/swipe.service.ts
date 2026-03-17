import prisma from '../../config/database';
import { AppError } from '../../shared/middleware/errorHandler';
import { getIO, isUserOnline } from '../../socket';
import { getBlockedIds } from '../block/block.service';
import { sendPushToUser } from '../../shared/utils/pushNotifications';

const MAX_ENERGY = 25;
const MATCH_EXPIRY_HOURS = 48;
const FREE_SUPER_LIKE_LIMIT = 1;
const PREMIUM_SUPER_LIKE_LIMIT = 5;

export async function getDiscoverProfiles(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      gender: true,
      lookingFor: true,
      ageMin: true,
      ageMax: true,
      latitude: true,
      longitude: true,
      maxDistanceKm: true,
      reputationScore: true,
      isTravelMode: true,
      travelLatitude: true,
      travelLongitude: true,
    },
  });

  if (!user) throw new AppError('User not found', 404);

  // Use travel coordinates if travel mode is active
  const effectiveLat = user.isTravelMode && user.travelLatitude != null
    ? user.travelLatitude
    : user.latitude;
  const effectiveLng = user.isTravelMode && user.travelLongitude != null
    ? user.travelLongitude
    : user.longitude;

  // Get IDs of users already swiped
  const swipedIds = await prisma.swipe.findMany({
    where: { swiperId: userId },
    select: { swipedId: true },
  });

  // Get blocked user IDs (both directions)
  const blockedIds = await getBlockedIds(userId);

  const excludeIds = [userId, ...swipedIds.map((s) => s.swipedId), ...blockedIds];

  // Calculate age range dates
  const now = new Date();
  const maxBirthDate = new Date(now.getFullYear() - user.ageMin, now.getMonth(), now.getDate());
  const minBirthDate = new Date(now.getFullYear() - user.ageMax - 1, now.getMonth(), now.getDate());

  // Find candidates matching preferences
  const candidates = await prisma.user.findMany({
    where: {
      id: { notIn: excludeIds },
      isActive: true,
      gender: { in: user.lookingFor },
      lookingFor: { hasSome: [user.gender] },
      dateOfBirth: {
        gte: minBirthDate,
        lte: maxBirthDate,
      },
    },
    select: {
      id: true,
      firstName: true,
      dateOfBirth: true,
      gender: true,
      bio: true,
      reputationScore: true,
      isVerified: true,
      latitude: true,
      longitude: true,
      boostedUntil: true,
      photos: { orderBy: { position: 'asc' } },
      interests: { include: { interest: true } },
    },
    orderBy: { reputationScore: 'desc' },
    take: 50,
  });

  // Enrich with age and distance, filter by distance
  const enriched = candidates
    .map((c) => {
      const age = Math.floor(
        (Date.now() - c.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      );

      let distance: number | null = null;
      if (effectiveLat && effectiveLng && c.latitude && c.longitude) {
        distance = haversineKm(effectiveLat, effectiveLng, c.latitude, c.longitude);
      }

      const isBoosted = c.boostedUntil ? c.boostedUntil > now : false;

      return {
        id: c.id,
        firstName: c.firstName,
        age,
        gender: c.gender,
        bio: c.bio,
        reputationScore: c.reputationScore,
        isVerified: c.isVerified,
        distance: distance ? Math.round(distance) : null,
        photos: c.photos,
        interests: c.interests.map((ui) => ui.interest),
        isBoosted,
      };
    })
    .filter((c) => c.distance === null || c.distance <= user.maxDistanceKm);

  // Sort: boosted users first, then by reputation
  return enriched.sort((a, b) => {
    if (a.isBoosted && !b.isBoosted) return -1;
    if (!a.isBoosted && b.isBoosted) return 1;
    return b.reputationScore - a.reputationScore;
  });
}

export async function createSwipe(
  userId: string,
  targetUserId: string,
  direction: 'like' | 'pass',
  isSuperLike?: boolean
) {
  // Fetch user with premium and super like fields
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      energyRemaining: true,
      energyResetAt: true,
      isPremium: true,
      premiumUntil: true,
      superLikesUsedToday: true,
      superLikeResetAt: true,
    },
  });

  if (!user) throw new AppError('User not found', 404);

  // Determine if user has active premium
  const now = new Date();
  const hasActivePremium = user.isPremium && user.premiumUntil && user.premiumUntil > now;

  // Premium users skip energy check (unlimited swipes)
  if (!hasActivePremium) {
    if (user.energyRemaining <= 0) {
      throw new AppError('No energy remaining. Come back later!', 429);
    }
  }

  // Check for duplicate swipe
  const existing = await prisma.swipe.findUnique({
    where: { swiperId_swipedId: { swiperId: userId, swipedId: targetUserId } },
  });
  if (existing) {
    throw new AppError('Already swiped on this user', 409);
  }

  // Super Like validation
  if (isSuperLike && direction === 'like') {
    let currentSuperLikesUsed = user.superLikesUsedToday;

    // Reset counter if superLikeResetAt is in the past
    if (user.superLikeResetAt && user.superLikeResetAt < now) {
      currentSuperLikesUsed = 0;
    }

    const limit = hasActivePremium ? PREMIUM_SUPER_LIKE_LIMIT : FREE_SUPER_LIKE_LIMIT;
    if (currentSuperLikesUsed >= limit) {
      throw new AppError('No super likes remaining today', 429);
    }
  }

  // Build user update data
  const updateData: any = {};

  // Only deduct energy for non-premium users
  if (!hasActivePremium) {
    updateData.energyRemaining = { decrement: 1 };

    // Start 24h timer on first swipe if not already running
    if (!user.energyResetAt) {
      updateData.energyResetAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
  }

  // Super Like updates
  if (isSuperLike && direction === 'like') {
    // Reset counter if needed
    if (user.superLikeResetAt && user.superLikeResetAt < now) {
      updateData.superLikesUsedToday = 1; // reset to 0 then increment = 1
    } else {
      updateData.superLikesUsedToday = { increment: 1 };
    }

    // Set superLikeResetAt to next midnight if not set or expired
    if (!user.superLikeResetAt || user.superLikeResetAt < now) {
      const nextMidnight = new Date(now);
      nextMidnight.setDate(nextMidnight.getDate() + 1);
      nextMidnight.setHours(0, 0, 0, 0);
      updateData.superLikeResetAt = nextMidnight;
    }
  }

  // Create swipe data
  const swipeData: any = {
    swiperId: userId,
    swipedId: targetUserId,
    direction,
  };
  if (isSuperLike && direction === 'like') {
    swipeData.isSuperLike = true;
  }

  const transactionOps: any[] = [
    prisma.swipe.create({ data: swipeData }),
  ];

  // Only update user if there are fields to update
  if (Object.keys(updateData).length > 0) {
    transactionOps.push(
      prisma.user.update({
        where: { id: userId },
        data: updateData,
      })
    );
  }

  const [swipe] = await prisma.$transaction(transactionOps);

  // Check for mutual like
  let matched = false;
  let matchId: string | undefined;

  if (direction === 'like') {
    const reciprocal = await prisma.swipe.findFirst({
      where: {
        swiperId: targetUserId,
        swipedId: userId,
        direction: 'like',
      },
    });

    if (!reciprocal) {
      // No mutual like yet — notify target that someone liked them (anonymous)
      const io = getIO();
      io.to(`user:${targetUserId}`).emit('new_like', {
        message: 'Someone liked you!',
        isSuperLike: isSuperLike || false,
      });

      // Send push notification if target is offline
      const targetOnline = await isUserOnline(targetUserId);
      if (!targetOnline) {
        sendPushToUser(
          targetUserId,
          'Someone likes you!',
          'Open Spark to find out who it could be',
          { type: 'new_like' }
        );
      }
    }

    if (reciprocal) {
      // Create match! Order user IDs consistently
      const [u1, u2] = [userId, targetUserId].sort();
      const expiresAt = new Date(Date.now() + MATCH_EXPIRY_HOURS * 60 * 60 * 1000);

      const match = await prisma.match.create({
        data: {
          user1Id: u1,
          user2Id: u2,
          expiresAt,
        },
      });

      // Create empty compatibility metrics
      await prisma.compatibilityMetrics.create({
        data: { matchId: match.id },
      });

      matched = true;
      matchId = match.id;

      // Notify both users via socket
      const io = getIO();
      io.to(`user:${userId}`).emit('new_match', { matchId: match.id, userId: targetUserId });
      io.to(`user:${targetUserId}`).emit('new_match', { matchId: match.id, userId });

      // Send push notifications to offline users for new match
      const [swiperUser, targetUser] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { firstName: true } }),
        prisma.user.findUnique({ where: { id: targetUserId }, select: { firstName: true } }),
      ]);

      const [swiperOnline, targetIsOnline] = await Promise.all([
        isUserOnline(userId),
        isUserOnline(targetUserId),
      ]);

      if (!swiperOnline) {
        sendPushToUser(
          userId,
          "It's a Spark!",
          `You matched with ${targetUser?.firstName || 'someone'}!`,
          { type: 'new_match', matchId: match.id }
        );
      }
      if (!targetIsOnline) {
        sendPushToUser(
          targetUserId,
          "It's a Spark!",
          `You matched with ${swiperUser?.firstName || 'someone'}!`,
          { type: 'new_match', matchId: match.id }
        );
      }
    }
  }

  // Get updated energy
  const updatedUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { energyRemaining: true, energyResetAt: true },
  });

  return {
    matched,
    matchId,
    energyRemaining: updatedUser?.energyRemaining ?? 0,
    energyResetAt: updatedUser?.energyResetAt,
  };
}

export async function getEnergy(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { energyRemaining: true, energyResetAt: true },
  });

  if (!user) throw new AppError('User not found', 404);

  return {
    remaining: user.energyRemaining,
    max: MAX_ENERGY,
    resetAt: user.energyResetAt,
  };
}

export async function getSuperLikeStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      superLikesUsedToday: true,
      superLikeResetAt: true,
      isPremium: true,
      premiumUntil: true,
    },
  });

  if (!user) throw new AppError('User not found', 404);

  const now = new Date();
  const hasActivePremium = user.isPremium && user.premiumUntil && user.premiumUntil > now;
  const limit = hasActivePremium ? PREMIUM_SUPER_LIKE_LIMIT : FREE_SUPER_LIKE_LIMIT;

  let used = user.superLikesUsedToday;
  // If reset time has passed, counter is effectively 0
  if (user.superLikeResetAt && user.superLikeResetAt < now) {
    used = 0;
  }

  return {
    remaining: Math.max(0, limit - used),
    resetAt: user.superLikeResetAt?.toISOString() || null,
  };
}

export async function getReceivedLikes(userId: string) {
  // Check if user has active premium
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPremium: true, premiumUntil: true },
  });

  const now = new Date();
  const hasActivePremium =
    currentUser?.isPremium && currentUser?.premiumUntil && currentUser.premiumUntil > now;

  // Find users who liked me but I haven't swiped on yet
  const mySwipedIds = await prisma.swipe.findMany({
    where: { swiperId: userId },
    select: { swipedId: true },
  });
  const swipedSet = new Set(mySwipedIds.map((s) => s.swipedId));

  const receivedLikes = await prisma.swipe.findMany({
    where: {
      swipedId: userId,
      direction: 'like',
    },
    include: {
      swiper: {
        select: {
          id: true,
          firstName: true,
          dateOfBirth: true,
          gender: true,
          bio: true,
          reputationScore: true,
          photos: { orderBy: { position: 'asc' } },
          interests: { include: { interest: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Only return likes where I haven't swiped back yet, deduplicated by user
  const seen = new Set<string>();
  return receivedLikes
    .filter((like) => !swipedSet.has(like.swiperId))
    .filter((like) => {
      if (seen.has(like.swiperId)) return false;
      seen.add(like.swiperId);
      return true;
    })
    .map((like) => {
      const u = like.swiper;
      const age = Math.floor(
        (Date.now() - u.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      );

      // For non-premium users, only show first photo and blur it
      const photos = hasActivePremium ? u.photos : u.photos.slice(0, 1);

      return {
        id: u.id,
        firstName: u.firstName,
        age,
        gender: u.gender,
        bio: u.bio,
        reputationScore: u.reputationScore,
        photos,
        isBlurred: !hasActivePremium,
        isSuperLike: (like as any).isSuperLike || false,
        interests: u.interests.map((ui) => ui.interest),
        likedAt: like.createdAt,
      };
    });
}

const REWIND_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export async function rewindLastSwipe(userId: string) {
  // Check premium
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      isPremium: true,
      premiumUntil: true,
      energyRemaining: true,
    },
  });

  if (!user) throw new AppError('User not found', 404);

  const now = new Date();
  const hasActivePremium = user.isPremium && user.premiumUntil && user.premiumUntil > now;
  if (!hasActivePremium) {
    throw new AppError('Rewind is a premium feature', 403);
  }

  // Find last swipe
  const lastSwipe = await prisma.swipe.findFirst({
    where: { swiperId: userId },
    orderBy: { createdAt: 'desc' },
  });

  if (!lastSwipe) {
    throw new AppError('No swipe to rewind', 404);
  }

  // Check time window
  if (now.getTime() - lastSwipe.createdAt.getTime() > REWIND_WINDOW_MS) {
    throw new AppError('Rewind time expired (5 min limit)', 400);
  }

  const swipedUserId = lastSwipe.swipedId;

  // If this swipe created a match, delete it
  const [u1, u2] = [userId, swipedUserId].sort();
  const match = await prisma.match.findUnique({
    where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
  });

  if (match) {
    // Delete compatibility metrics and match
    await prisma.compatibilityMetrics.deleteMany({ where: { matchId: match.id } });
    await prisma.match.delete({ where: { id: match.id } });
  }

  // Delete the swipe
  await prisma.swipe.delete({ where: { id: lastSwipe.id } });

  // Restore 1 energy point (cap at MAX_ENERGY)
  const newEnergy = Math.min(MAX_ENERGY, user.energyRemaining + 1);
  await prisma.user.update({
    where: { id: userId },
    data: { energyRemaining: newEnergy },
  });

  // Fetch the swiped profile to return
  const swipedProfile = await prisma.user.findUnique({
    where: { id: swipedUserId },
    select: {
      id: true,
      firstName: true,
      dateOfBirth: true,
      gender: true,
      bio: true,
      reputationScore: true,
      isVerified: true,
      latitude: true,
      longitude: true,
      photos: { orderBy: { position: 'asc' } },
      interests: { include: { interest: true } },
    },
  });

  if (!swipedProfile) {
    throw new AppError('Swiped user not found', 404);
  }

  const age = Math.floor(
    (Date.now() - swipedProfile.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );

  return {
    profile: {
      id: swipedProfile.id,
      firstName: swipedProfile.firstName,
      age,
      gender: swipedProfile.gender,
      bio: swipedProfile.bio,
      reputationScore: swipedProfile.reputationScore,
      isVerified: swipedProfile.isVerified,
      distance: null,
      photos: swipedProfile.photos,
      interests: swipedProfile.interests.map((ui) => ui.interest),
    },
    energyRemaining: newEnergy,
  };
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
