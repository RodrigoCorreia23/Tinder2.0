/**
 * Reputation scoring constants and helpers
 */
export const REPUTATION_EVENTS = {
  MESSAGE_SENT: { type: 'message_sent', delta: 0.5 },
  QUICK_REPLY: { type: 'quick_reply', delta: 1.0 }, // replied within 1h
  MATCH_EXPIRED_GHOSTER: { type: 'ghosted', delta: -5.0 },
  MATCH_EXPIRED_GHOSTED: { type: 'was_ghosted', delta: 0 },
  DATE_COMPLETED: { type: 'date_completed', delta: 3.0 },
  DATE_DECLINED: { type: 'date_declined', delta: -1.0 },
} as const;

/**
 * Clamp reputation score between 0 and 100
 */
export function clampReputation(score: number): number {
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate dynamic compatibility score from metrics.
 * All sub-scores are normalized to 0-1 range.
 */
export function calculateCompatibilityScore(metrics: {
  avgResponseTimeU1Seconds: number;
  avgResponseTimeU2Seconds: number;
  questionsAskedU1: number;
  questionsAskedU2: number;
  totalMessagesU1: number;
  totalMessagesU2: number;
  commonTopicsCount: number;
  totalTopics: number;
  humorScoreU1: number;
  humorScoreU2: number;
  avgMsgLengthU1: number;
  avgMsgLengthU2: number;
}): number {
  const {
    avgResponseTimeU1Seconds,
    avgResponseTimeU2Seconds,
    questionsAskedU1,
    questionsAskedU2,
    totalMessagesU1,
    totalMessagesU2,
    commonTopicsCount,
    totalTopics,
    humorScoreU1,
    humorScoreU2,
    avgMsgLengthU1,
    avgMsgLengthU2,
  } = metrics;

  // 1. Response time score (25%) - faster is better, ideal < 5 min
  const avgResponseTime = (avgResponseTimeU1Seconds + avgResponseTimeU2Seconds) / 2;
  const responseTimeScore = Math.max(0, 1 - avgResponseTime / (3600 * 2)); // 2h = 0

  // 2. Questions ratio (20%) - both asking questions is good
  const totalMessages = totalMessagesU1 + totalMessagesU2;
  const questionRatio = totalMessages > 0
    ? (questionsAskedU1 + questionsAskedU2) / totalMessages
    : 0;
  const questionScore = Math.min(1, questionRatio * 3); // ~33% questions = perfect

  // 3. Common topics (20%)
  const topicScore = totalTopics > 0 ? commonTopicsCount / totalTopics : 0;

  // 4. Message balance (15%) - 50/50 is ideal
  const balanceRatio = totalMessages > 0
    ? Math.min(totalMessagesU1, totalMessagesU2) / Math.max(totalMessagesU1, totalMessagesU2)
    : 0;

  // 5. Humor (10%)
  const humorScore = (humorScoreU1 + humorScoreU2) / 2;

  // 6. Message length balance (10%)
  const maxLen = Math.max(avgMsgLengthU1, avgMsgLengthU2);
  const lengthBalance = maxLen > 0
    ? Math.min(avgMsgLengthU1, avgMsgLengthU2) / maxLen
    : 0;

  const score =
    0.25 * responseTimeScore +
    0.20 * questionScore +
    0.20 * topicScore +
    0.15 * balanceRatio +
    0.10 * humorScore +
    0.10 * lengthBalance;

  return Math.round(score * 100 * 100) / 100; // percentage with 2 decimals
}
