import prisma from '../../config/database';
import { calculateCompatibilityScore } from '../../shared/utils/scoring';
import { getIO } from '../../socket';

const HUMOR_PATTERNS = /(?:😂|🤣|😄|😆|😅|haha|hehe|lol|lmao|rofl|😁|🤪|💀)/gi;
const QUESTION_PATTERN = /\?/g;

/**
 * Recalculate compatibility score for a match.
 * Called after every 5 messages or periodically.
 */
export async function recalculateCompatibility(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      user1: {
        select: {
          interests: { select: { interestId: true } },
        },
      },
      user2: {
        select: {
          interests: { select: { interestId: true } },
        },
      },
    },
  });

  if (!match) return;

  // Get all messages for this match
  const messages = await prisma.message.findMany({
    where: { matchId },
    orderBy: { createdAt: 'asc' },
  });

  if (messages.length < 4) return; // Need at least a few messages

  const u1Messages = messages.filter((m) => m.senderId === match.user1Id);
  const u2Messages = messages.filter((m) => m.senderId === match.user2Id);

  // Calculate response times
  const responseTimes1: number[] = [];
  const responseTimes2: number[] = [];

  for (let i = 1; i < messages.length; i++) {
    const prev = messages[i - 1];
    const curr = messages[i];
    if (prev.senderId !== curr.senderId) {
      const diffSecs = (curr.createdAt.getTime() - prev.createdAt.getTime()) / 1000;
      if (curr.senderId === match.user1Id) {
        responseTimes1.push(diffSecs);
      } else {
        responseTimes2.push(diffSecs);
      }
    }
  }

  const avgResponseTimeU1 = responseTimes1.length > 0
    ? responseTimes1.reduce((a, b) => a + b, 0) / responseTimes1.length
    : 0;
  const avgResponseTimeU2 = responseTimes2.length > 0
    ? responseTimes2.reduce((a, b) => a + b, 0) / responseTimes2.length
    : 0;

  // Count questions
  const questionsU1 = u1Messages.reduce(
    (count, m) => count + (m.content.match(QUESTION_PATTERN)?.length ?? 0), 0
  );
  const questionsU2 = u2Messages.reduce(
    (count, m) => count + (m.content.match(QUESTION_PATTERN)?.length ?? 0), 0
  );

  // Humor detection (emoji/keyword based)
  const humorCountU1 = u1Messages.reduce(
    (count, m) => count + (m.content.match(HUMOR_PATTERNS)?.length ?? 0), 0
  );
  const humorCountU2 = u2Messages.reduce(
    (count, m) => count + (m.content.match(HUMOR_PATTERNS)?.length ?? 0), 0
  );
  const humorScoreU1 = Math.min(1, humorCountU1 / Math.max(1, u1Messages.length));
  const humorScoreU2 = Math.min(1, humorCountU2 / Math.max(1, u2Messages.length));

  // Average message length
  const avgLenU1 = u1Messages.length > 0
    ? u1Messages.reduce((sum, m) => sum + m.content.length, 0) / u1Messages.length
    : 0;
  const avgLenU2 = u2Messages.length > 0
    ? u2Messages.reduce((sum, m) => sum + m.content.length, 0) / u2Messages.length
    : 0;

  // Common interests
  const u1Interests = new Set(match.user1.interests.map((i) => i.interestId));
  const u2Interests = match.user2.interests.map((i) => i.interestId);
  const commonCount = u2Interests.filter((id) => u1Interests.has(id)).length;
  const totalTopics = new Set([...u1Interests, ...u2Interests]).size;

  // Calculate score
  const score = calculateCompatibilityScore({
    avgResponseTimeU1Seconds: avgResponseTimeU1,
    avgResponseTimeU2Seconds: avgResponseTimeU2,
    questionsAskedU1: questionsU1,
    questionsAskedU2: questionsU2,
    totalMessagesU1: u1Messages.length,
    totalMessagesU2: u2Messages.length,
    commonTopicsCount: commonCount,
    totalTopics,
    humorScoreU1,
    humorScoreU2,
    avgMsgLengthU1: avgLenU1,
    avgMsgLengthU2: avgLenU2,
  });

  // Update metrics
  await prisma.compatibilityMetrics.upsert({
    where: { matchId },
    create: {
      matchId,
      avgResponseTimeU1Secs: avgResponseTimeU1,
      avgResponseTimeU2Secs: avgResponseTimeU2,
      questionsAskedU1: questionsU1,
      questionsAskedU2: questionsU2,
      commonTopicsCount: commonCount,
      humorScoreU1,
      humorScoreU2,
      totalMessagesU1: u1Messages.length,
      totalMessagesU2: u2Messages.length,
      msgLengthAvgU1: avgLenU1,
      msgLengthAvgU2: avgLenU2,
    },
    update: {
      avgResponseTimeU1Secs: avgResponseTimeU1,
      avgResponseTimeU2Secs: avgResponseTimeU2,
      questionsAskedU1: questionsU1,
      questionsAskedU2: questionsU2,
      commonTopicsCount: commonCount,
      humorScoreU1,
      humorScoreU2,
      totalMessagesU1: u1Messages.length,
      totalMessagesU2: u2Messages.length,
      msgLengthAvgU1: avgLenU1,
      msgLengthAvgU2: avgLenU2,
    },
  });

  // Update match score
  await prisma.match.update({
    where: { id: matchId },
    data: { compatibilityScore: score },
  });

  // Notify users
  const io = getIO();
  io.to(`match:${matchId}`).emit('compatibility_updated', { matchId, score });

  return score;
}
