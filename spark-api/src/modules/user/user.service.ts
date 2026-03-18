import crypto from 'crypto';
import prisma from '../../config/database';
import { AppError } from '../../shared/middleware/errorHandler';
import { verifySelfie } from '../../shared/utils/ai';

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      dateOfBirth: true,
      gender: true,
      bio: true,
      lookingFor: true,
      ageMin: true,
      ageMax: true,
      maxDistanceKm: true,
      reputationScore: true,
      energyRemaining: true,
      energyResetAt: true,
      latitude: true,
      longitude: true,
      isVerified: true,
      isPremium: true,
      premiumUntil: true,
      premiumTier: true,
      boostedUntil: true,
      isTravelMode: true,
      travelLatitude: true,
      travelLongitude: true,
      travelCity: true,
      createdAt: true,
      photos: {
        orderBy: { position: 'asc' },
      },
      interests: {
        include: { interest: true },
      },
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return {
    ...user,
    interests: user.interests.map((ui) => ui.interest),
  };
}

export async function getPublicProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId, isActive: true },
    select: {
      id: true,
      firstName: true,
      dateOfBirth: true,
      gender: true,
      bio: true,
      reputationScore: true,
      isVerified: true,
      photos: {
        orderBy: { position: 'asc' },
      },
      interests: {
        include: { interest: true },
      },
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return {
    ...user,
    age: Math.floor(
      (Date.now() - user.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    ),
    interests: user.interests.map((ui) => ui.interest),
  };
}

export async function updateProfile(
  userId: string,
  data: {
    firstName?: string;
    bio?: string;
    gender?: string;
    lookingFor?: string[];
    ageMin?: number;
    ageMax?: number;
    maxDistanceKm?: number;
  }
) {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      firstName: true,
      bio: true,
      gender: true,
      lookingFor: true,
      ageMin: true,
      ageMax: true,
      maxDistanceKm: true,
    },
  });
}

export async function updateLocation(
  userId: string,
  latitude: number,
  longitude: number
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      latitude,
      longitude,
      locationUpdatedAt: new Date(),
      lastActiveAt: new Date(),
    },
  });
}

export async function updateInterests(userId: string, interestIds: number[]) {
  // Remove existing interests and add new ones
  await prisma.userInterest.deleteMany({
    where: { userId },
  });

  await prisma.userInterest.createMany({
    data: interestIds.map((interestId) => ({
      userId,
      interestId,
    })),
  });

  return prisma.userInterest.findMany({
    where: { userId },
    include: { interest: true },
  });
}

export async function addPhoto(userId: string, url: string) {
  // Get current photo count
  const count = await prisma.userPhoto.count({
    where: { userId },
  });

  if (count >= 6) {
    throw new AppError('Maximum 6 photos allowed', 400);
  }

  return prisma.userPhoto.create({
    data: {
      userId,
      url,
      position: count,
    },
  });
}

export async function deletePhoto(userId: string, photoId: string) {
  const photo = await prisma.userPhoto.findFirst({
    where: { id: photoId, userId },
  });

  if (!photo) {
    throw new AppError('Photo not found', 404);
  }

  await prisma.userPhoto.delete({
    where: { id: photoId },
  });

  // Reorder remaining photos
  const remaining = await prisma.userPhoto.findMany({
    where: { userId },
    orderBy: { position: 'asc' },
  });

  for (let i = 0; i < remaining.length; i++) {
    await prisma.userPhoto.update({
      where: { id: remaining[i].id },
      data: { position: i },
    });
  }
}

export async function reorderPhotos(userId: string, photoIds: string[]) {
  for (let i = 0; i < photoIds.length; i++) {
    await prisma.userPhoto.updateMany({
      where: { id: photoIds[i], userId },
      data: { position: i },
    });
  }
}

export async function getReputation(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { reputationScore: true },
  });

  const recentEvents = await prisma.reputationEvent.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return {
    score: user?.reputationScore ?? 0,
    recentEvents,
  };
}

export async function getAllInterests() {
  return prisma.interest.findMany({
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
}

export async function updatePushToken(userId: string, token: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { expoPushToken: token },
  });
}

export async function deleteAccount(userId: string) {
  return prisma.user.delete({
    where: { id: userId },
  });
}

export async function requestVerification(userId: string, selfieUrl: string) {
  // Get user's profile photos
  const photos = await prisma.userPhoto.findMany({
    where: { userId },
    orderBy: { position: 'asc' },
    take: 2,
  });

  if (photos.length === 0) {
    throw new AppError('You need at least one profile photo to verify', 400);
  }

  const profilePhotoUrls = photos.map((p) => p.url);
  const result = await verifySelfie(selfieUrl, profilePhotoUrls);

  if (result.verified && (result.confidence === 'high' || result.confidence === 'medium')) {
    await prisma.user.update({
      where: { id: userId },
      data: { isVerified: true },
    });
  }

  return {
    verified: result.verified && (result.confidence === 'high' || result.confidence === 'medium'),
    confidence: result.confidence,
    reason: result.reason,
  };
}

export async function generateShareLink(userId: string) {
  const token = crypto.randomUUID();
  await prisma.user.update({
    where: { id: userId },
    data: { shareToken: token },
  });

  const link = `https://spark-api-yvl3.onrender.com/share/${token}`;
  return { link, token };
}

export async function getSharedProfile(shareToken: string) {
  const user = await prisma.user.findUnique({
    where: { shareToken },
    select: {
      id: true,
      firstName: true,
      dateOfBirth: true,
      gender: true,
      bio: true,
      isVerified: true,
      photos: {
        orderBy: { position: 'asc' },
      },
      interests: {
        include: { interest: true },
      },
    },
  });

  if (!user) {
    throw new AppError('Profile not found', 404);
  }

  const age = Math.floor(
    (Date.now() - user.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );

  return {
    firstName: user.firstName,
    age,
    gender: user.gender,
    bio: user.bio,
    isVerified: user.isVerified,
    photos: user.photos,
    interests: user.interests.map((ui) => ui.interest),
  };
}

export async function activatePremium(userId: string, durationDays: number) {
  const now = new Date();
  const premiumUntil = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  return prisma.user.update({
    where: { id: userId },
    data: {
      isPremium: true,
      premiumUntil,
    },
    select: {
      id: true,
      isPremium: true,
      premiumUntil: true,
    },
  });
}

const BOOST_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export async function activateBoost(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPremium: true, premiumUntil: true },
  });

  if (!user) throw new AppError('User not found', 404);

  const now = new Date();
  const hasActivePremium = user.isPremium && user.premiumUntil && user.premiumUntil > now;
  if (!hasActivePremium) {
    throw new AppError('Boost is a premium feature', 403);
  }

  const boostedUntil = new Date(now.getTime() + BOOST_DURATION_MS);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { boostedUntil },
    select: { id: true, boostedUntil: true },
  });

  return updated;
}

export async function enableTravelMode(
  userId: string,
  latitude: number,
  longitude: number,
  city: string
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPremium: true, premiumUntil: true },
  });

  if (!user) throw new AppError('User not found', 404);

  const now = new Date();
  const hasActivePremium = user.isPremium && user.premiumUntil && user.premiumUntil > now;
  if (!hasActivePremium) {
    throw new AppError('Travel Mode is a premium feature', 403);
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      isTravelMode: true,
      travelLatitude: latitude,
      travelLongitude: longitude,
      travelCity: city,
    },
    select: {
      id: true,
      isTravelMode: true,
      travelLatitude: true,
      travelLongitude: true,
      travelCity: true,
    },
  });
}

export async function activatePremiumDebug(userId: string, tier: 'premium' | 'gold') {
  const premiumUntil = new Date();
  premiumUntil.setDate(premiumUntil.getDate() + 7); // 7 days
  return prisma.user.update({
    where: { id: userId },
    data: { isPremium: true, premiumUntil, premiumTier: tier },
  });
}

export async function disableTravelMode(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      isTravelMode: false,
      travelLatitude: null,
      travelLongitude: null,
      travelCity: null,
    },
    select: {
      id: true,
      isTravelMode: true,
    },
  });
}
