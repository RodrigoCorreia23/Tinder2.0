import prisma from '../../config/database';
import { AppError } from '../../shared/middleware/errorHandler';
import { getIO } from '../../socket';
import { clampReputation, REPUTATION_EVENTS } from '../../shared/utils/scoring';

const MATCH_EXPIRY_HOURS = 48;

export async function getMessages(
  matchId: string,
  userId: string,
  cursor?: string,
  limit: number = 50
) {
  // Verify user is part of the match
  const match = await prisma.match.findUnique({
    where: { id: matchId },
  });

  if (!match || (match.user1Id !== userId && match.user2Id !== userId)) {
    throw new AppError('Match not found', 404);
  }

  const messages = await prisma.message.findMany({
    where: {
      matchId,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      senderId: true,
      content: true,
      isRead: true,
      createdAt: true,
    },
  });

  return {
    messages,
    nextCursor: messages.length === limit ? messages[messages.length - 1].createdAt.toISOString() : null,
  };
}

export async function sendMessage(matchId: string, senderId: string, content: string) {
  // Verify match is active and user is part of it
  const match = await prisma.match.findUnique({
    where: { id: matchId },
  });

  if (!match || match.status !== 'active') {
    throw new AppError('Match not found or expired', 404);
  }

  if (match.user1Id !== senderId && match.user2Id !== senderId) {
    throw new AppError('Not part of this match', 403);
  }

  const now = new Date();
  const newExpiresAt = new Date(now.getTime() + MATCH_EXPIRY_HOURS * 60 * 60 * 1000);

  // Create message
  const message = await prisma.message.create({
    data: {
      matchId,
      senderId,
      content,
    },
    select: {
      id: true,
      senderId: true,
      content: true,
      isRead: true,
      createdAt: true,
    },
  });

  // Update match timestamps and reset expiry
  const isUser1 = match.user1Id === senderId;
  await prisma.match.update({
    where: { id: matchId },
    data: {
      lastMessageAt: now,
      expiresAt: newExpiresAt,
      ...(isUser1
        ? { user1LastMsgAt: now }
        : { user2LastMsgAt: now }),
    },
  });

  // Reputation: +0.5 for every message sent
  const sender = await prisma.user.findUnique({
    where: { id: senderId },
    select: { reputationScore: true },
  });
  if (sender) {
    let repDelta = REPUTATION_EVENTS.MESSAGE_SENT.delta;

    // Check for quick reply bonus (within 1 hour)
    const lastMsgFromOther = isUser1 ? match.user2LastMsgAt : match.user1LastMsgAt;
    if (lastMsgFromOther) {
      const replyTimeMs = now.getTime() - lastMsgFromOther.getTime();
      if (replyTimeMs < 60 * 60 * 1000) {
        repDelta += REPUTATION_EVENTS.QUICK_REPLY.delta;
      }
    }

    const newScore = clampReputation(sender.reputationScore + repDelta);
    await prisma.user.update({
      where: { id: senderId },
      data: { reputationScore: newScore },
    });

    await prisma.reputationEvent.create({
      data: {
        userId: senderId,
        eventType: repDelta > REPUTATION_EVENTS.MESSAGE_SENT.delta
          ? 'message_sent+quick_reply'
          : REPUTATION_EVENTS.MESSAGE_SENT.type,
        delta: repDelta,
        newScore,
      },
    });
  }

  // Emit via socket
  const io = getIO();
  io.to(`match:${matchId}`).emit('new_message', { matchId, message });

  // Notify the other user
  const otherUserId = isUser1 ? match.user2Id : match.user1Id;
  io.to(`user:${otherUserId}`).emit('new_message_notification', {
    matchId,
    messagePreview: content.substring(0, 100),
  });

  return message;
}

export async function markAsRead(matchId: string, userId: string) {
  await prisma.message.updateMany({
    where: {
      matchId,
      senderId: { not: userId },
      isRead: false,
    },
    data: { isRead: true },
  });

  const io = getIO();
  io.to(`match:${matchId}`).emit('message_read', { matchId, readBy: userId });
}
