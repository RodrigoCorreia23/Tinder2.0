import prisma from '../../config/database';
import { AppError } from '../../shared/middleware/errorHandler';
import { getIO } from '../../socket';

export async function generateDatePlan(matchId: string, userId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      user1: {
        select: {
          firstName: true,
          latitude: true,
          longitude: true,
          interests: { include: { interest: true } },
        },
      },
      user2: {
        select: {
          firstName: true,
          latitude: true,
          longitude: true,
          interests: { include: { interest: true } },
        },
      },
    },
  });

  if (!match || (match.user1Id !== userId && match.user2Id !== userId)) {
    throw new AppError('Match not found', 404);
  }

  if (match.status !== 'active') {
    throw new AppError('Match is not active', 400);
  }

  // Find common interests
  const u1Interests = new Set(match.user1.interests.map((i) => i.interest.name));
  const commonInterests = match.user2.interests
    .map((i) => i.interest.name)
    .filter((name) => u1Interests.has(name));

  const allInterests = [
    ...match.user1.interests.map((i) => i.interest.name),
    ...match.user2.interests.map((i) => i.interest.name),
  ];

  // For MVP, generate a rule-based suggestion
  // In production, this would call OpenAI API
  const plan = generateSuggestion(commonInterests, allInterests);

  const datePlan = await prisma.datePlan.create({
    data: {
      matchId,
      activity: plan.activity,
      venueName: plan.venueName,
      venueAddress: plan.venueAddress,
      suggestedTime: plan.suggestedTime,
      aiReasoning: plan.reasoning,
    },
  });

  // Notify both users
  const io = getIO();
  io.to(`match:${matchId}`).emit('date_plan_ready', { matchId, datePlan });

  return datePlan;
}

export async function respondToPlan(
  planId: string,
  userId: string,
  accepted: boolean
) {
  const plan = await prisma.datePlan.findUnique({
    where: { id: planId },
    include: { match: true },
  });

  if (!plan) throw new AppError('Date plan not found', 404);

  const match = plan.match;
  if (match.user1Id !== userId && match.user2Id !== userId) {
    throw new AppError('Not part of this match', 403);
  }

  const isUser1 = match.user1Id === userId;
  const updateData = isUser1
    ? { user1Accepted: accepted }
    : { user2Accepted: accepted };

  const updated = await prisma.datePlan.update({
    where: { id: planId },
    data: updateData,
  });

  // Check if both responded
  const u1 = isUser1 ? accepted : updated.user1Accepted;
  const u2 = isUser1 ? updated.user2Accepted : accepted;

  if (u1 !== null && u2 !== null) {
    const status = u1 && u2 ? 'accepted' : 'declined';
    await prisma.datePlan.update({
      where: { id: planId },
      data: { status },
    });
  }

  // Notify other user
  const otherUserId = isUser1 ? match.user2Id : match.user1Id;
  const io = getIO();
  io.to(`user:${otherUserId}`).emit('date_plan_response', {
    matchId: match.id,
    planId,
    accepted,
    respondedBy: userId,
  });

  return updated;
}

export async function getDatePlans(matchId: string, userId: string) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || (match.user1Id !== userId && match.user2Id !== userId)) {
    throw new AppError('Match not found', 404);
  }

  return prisma.datePlan.findMany({
    where: { matchId },
    orderBy: { createdAt: 'desc' },
  });
}

// Rule-based date suggestion for MVP
function generateSuggestion(
  commonInterests: string[],
  allInterests: string[]
) {
  const suggestions = [
    {
      interests: ['Coffee', 'Cooking', 'Brunch'],
      activity: 'Coffee date at a cozy cafe',
      venueName: 'Local artisan cafe',
      venueAddress: 'Downtown area',
      reasoning: 'Both enjoy food/coffee — a relaxed first meet',
    },
    {
      interests: ['Hiking', 'Nature', 'Running'],
      activity: 'Sunset hike together',
      venueName: 'Local trail',
      venueAddress: 'Nearest nature park',
      reasoning: 'Shared love for outdoors — active and memorable',
    },
    {
      interests: ['Movies', 'Series', 'Anime'],
      activity: 'Movie night + dinner',
      venueName: 'Local cinema',
      venueAddress: 'City center',
      reasoning: 'Common entertainment interests — easy conversation starter',
    },
    {
      interests: ['Art', 'Photography', 'Theatre'],
      activity: 'Visit an art gallery or exhibition',
      venueName: 'Local gallery',
      venueAddress: 'Arts district',
      reasoning: 'Creative souls — stimulating environment for connection',
    },
    {
      interests: ['Wine', 'Craft Beer', 'Cooking'],
      activity: 'Wine tasting evening',
      venueName: 'Local wine bar',
      venueAddress: 'City center',
      reasoning: 'Shared taste for good drinks — relaxed atmosphere',
    },
    {
      interests: ['Gaming', 'Technology', 'Comedy'],
      activity: 'Board game cafe hangout',
      venueName: 'Local board game cafe',
      venueAddress: 'Downtown area',
      reasoning: 'Fun and interactive — breaks the ice naturally',
    },
  ];

  const pool = [...commonInterests, ...allInterests];

  // Find best matching suggestion
  let bestMatch = suggestions[0];
  let bestScore = 0;

  for (const suggestion of suggestions) {
    const score = suggestion.interests.filter((i) =>
      pool.some((p) => p.toLowerCase().includes(i.toLowerCase()))
    ).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = suggestion;
    }
  }

  // Default time: next Saturday at 7 PM
  const now = new Date();
  const daysUntilSaturday = (6 - now.getDay() + 7) % 7 || 7;
  const suggestedTime = new Date(now);
  suggestedTime.setDate(now.getDate() + daysUntilSaturday);
  suggestedTime.setHours(19, 0, 0, 0);

  return {
    ...bestMatch,
    suggestedTime,
  };
}
