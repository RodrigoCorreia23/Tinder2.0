import prisma from '../config/database';
import { clampReputation, REPUTATION_EVENTS } from '../shared/utils/scoring';
import { getIO, isUserOnline } from '../socket';
import { sendPushToUser } from '../shared/utils/pushNotifications';

export async function expireStaleMatches() {
  const now = new Date();

  // Find all active matches that have expired
  const expiredMatches = await prisma.match.findMany({
    where: {
      status: 'active',
      expiresAt: { lte: now },
    },
    include: {
      user1: true,
      user2: true,
    },
  });

  for (const match of expiredMatches) {
    // Determine who ghosted (the one who didn't reply last)
    const ghosterId =
      (match.user1LastMsgAt ?? new Date(0)) > (match.user2LastMsgAt ?? new Date(0))
        ? match.user2Id
        : match.user1Id;

    const ghostedId = ghosterId === match.user1Id ? match.user2Id : match.user1Id;

    // Update match status
    await prisma.match.update({
      where: { id: match.id },
      data: { status: 'expired' },
    });

    // Penalize ghoster's reputation
    const ghoster = ghosterId === match.user1Id ? match.user1 : match.user2;
    const newScore = clampReputation(
      ghoster.reputationScore + REPUTATION_EVENTS.MATCH_EXPIRED_GHOSTER.delta
    );

    await prisma.user.update({
      where: { id: ghosterId },
      data: { reputationScore: newScore },
    });

    await prisma.reputationEvent.create({
      data: {
        userId: ghosterId,
        eventType: REPUTATION_EVENTS.MATCH_EXPIRED_GHOSTER.type,
        delta: REPUTATION_EVENTS.MATCH_EXPIRED_GHOSTER.delta,
        newScore,
      },
    });

    // Notify both users
    const io = getIO();
    io.to(`user:${match.user1Id}`).emit('match_expired', { matchId: match.id });
    io.to(`user:${match.user2Id}`).emit('match_expired', { matchId: match.id });

    // Send push notifications to offline users
    const [user1Online, user2Online] = await Promise.all([
      isUserOnline(match.user1Id),
      isUserOnline(match.user2Id),
    ]);

    if (!user1Online) {
      sendPushToUser(
        match.user1Id,
        'Match expired',
        'A match expired because no one replied in time.',
        { type: 'match_expired', matchId: match.id }
      );
    }
    if (!user2Online) {
      sendPushToUser(
        match.user2Id,
        'Match expired',
        'A match expired because no one replied in time.',
        { type: 'match_expired', matchId: match.id }
      );
    }

    console.log(`[CRON] Match ${match.id} expired. Ghoster: ${ghosterId}`);
  }
}
