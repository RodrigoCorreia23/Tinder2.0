import prisma from '../../config/database';
import { AppError } from '../../shared/middleware/errorHandler';

export async function getMatches(userId: string) {
  const matches = await prisma.match.findMany({
    where: {
      status: 'active',
      OR: [{ user1Id: userId }, { user2Id: userId }],
    },
    include: {
      user1: {
        select: {
          id: true,
          firstName: true,
          photos: { orderBy: { position: 'asc' }, take: 1 },
        },
      },
      user2: {
        select: {
          id: true,
          firstName: true,
          photos: { orderBy: { position: 'asc' }, take: 1 },
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return matches.map((match) => {
    const otherUser = match.user1Id === userId ? match.user2 : match.user1;
    const lastMessage = match.messages[0] || null;

    return {
      id: match.id,
      otherUser,
      compatibilityScore: match.compatibilityScore,
      expiresAt: match.expiresAt,
      lastMessage: lastMessage
        ? {
            content: lastMessage.content,
            senderId: lastMessage.senderId,
            createdAt: lastMessage.createdAt,
            isRead: lastMessage.isRead,
          }
        : null,
      createdAt: match.createdAt,
    };
  });
}

export async function getMatch(matchId: string, userId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      user1: {
        select: {
          id: true,
          firstName: true,
          bio: true,
          photos: { orderBy: { position: 'asc' } },
          interests: { include: { interest: true } },
        },
      },
      user2: {
        select: {
          id: true,
          firstName: true,
          bio: true,
          photos: { orderBy: { position: 'asc' } },
          interests: { include: { interest: true } },
        },
      },
      compatibilityMetrics: true,
    },
  });

  if (!match || (match.user1Id !== userId && match.user2Id !== userId)) {
    throw new AppError('Match not found', 404);
  }

  return match;
}

export async function unmatch(matchId: string, userId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
  });

  if (!match || (match.user1Id !== userId && match.user2Id !== userId)) {
    throw new AppError('Match not found', 404);
  }

  await prisma.match.update({
    where: { id: matchId },
    data: { status: 'unmatched' },
  });
}

export async function getCompatibility(matchId: string, userId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { compatibilityMetrics: true },
  });

  if (!match || (match.user1Id !== userId && match.user2Id !== userId)) {
    throw new AppError('Match not found', 404);
  }

  return {
    score: match.compatibilityScore,
    metrics: match.compatibilityMetrics,
  };
}
