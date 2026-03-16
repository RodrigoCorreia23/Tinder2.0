import prisma from '../../config/database';
import { AppError } from '../../shared/middleware/errorHandler';
import { getIO } from '../../socket';
import { clampReputation, REPUTATION_EVENTS } from '../../shared/utils/scoring';

interface TimeSlot {
  day: string;      // "2026-03-20"
  timeFrom: string; // "18:00"
  timeTo: string;   // "22:00"
}

export async function setAvailability(
  matchId: string,
  userId: string,
  slots: TimeSlot[]
) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || (match.user1Id !== userId && match.user2Id !== userId)) {
    throw new AppError('Match not found', 404);
  }
  if (match.status !== 'active') {
    throw new AppError('Match is not active', 400);
  }

  // Save availability
  const availability = await prisma.dateAvailability.upsert({
    where: { matchId_userId: { matchId, userId } },
    create: { matchId, userId, slots: slots as any },
    update: { slots: slots as any },
  });

  // Notify the other user
  const otherUserId = match.user1Id === userId ? match.user2Id : match.user1Id;
  const io = getIO();
  io.to(`user:${otherUserId}`).emit('date_availability_set', {
    matchId,
    userId,
    slotsCount: slots.length,
  });

  // Check if both users have set availability
  const bothAvailability = await prisma.dateAvailability.findMany({
    where: { matchId },
  });

  if (bothAvailability.length === 2) {
    // Both set — find overlapping slots and generate plan
    const u1Slots = bothAvailability.find((a) => a.userId === match.user1Id)?.slots as any as TimeSlot[];
    const u2Slots = bothAvailability.find((a) => a.userId === match.user2Id)?.slots as any as TimeSlot[];

    const overlapping = findOverlappingSlots(u1Slots, u2Slots);

    if (overlapping.length > 0) {
      // Auto-generate a date plan based on overlapping availability
      const plan = await generateDatePlan(matchId, userId, overlapping[0]);
      return { availability, plan, overlapping };
    }

    // Notify that there's no overlap
    io.to(`match:${matchId}`).emit('date_no_overlap', { matchId });
    return { availability, plan: null, overlapping: [] };
  }

  return { availability, plan: null, overlapping: null };
}

export async function getAvailability(matchId: string, userId: string) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || (match.user1Id !== userId && match.user2Id !== userId)) {
    throw new AppError('Match not found', 404);
  }

  const availability = await prisma.dateAvailability.findMany({
    where: { matchId },
  });

  const myAvailability = availability.find((a) => a.userId === userId);
  const theirAvailability = availability.find((a) => a.userId !== userId);

  return {
    mine: myAvailability?.slots || null,
    theirs: theirAvailability ? true : false, // Don't expose exact slots, just if they set it
    bothSet: availability.length === 2,
  };
}

export async function generateDatePlan(
  matchId: string,
  userId: string,
  preferredSlot?: TimeSlot
) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      user1: {
        select: {
          firstName: true,
          interests: { include: { interest: true } },
        },
      },
      user2: {
        select: {
          firstName: true,
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

  const plan = generateSuggestion(commonInterests, allInterests, preferredSlot);

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
    const bothAccepted = u1 && u2;
    const status = bothAccepted ? 'accepted' : 'declined';
    await prisma.datePlan.update({
      where: { id: planId },
      data: { status },
    });

    // Reputation rewards/penalties for both users
    const bothUserIds = [match.user1Id, match.user2Id];
    const event = bothAccepted
      ? REPUTATION_EVENTS.DATE_COMPLETED
      : REPUTATION_EVENTS.DATE_DECLINED;

    for (const uid of bothUserIds) {
      const u = await prisma.user.findUnique({
        where: { id: uid },
        select: { reputationScore: true },
      });
      if (u) {
        const newScore = clampReputation(u.reputationScore + event.delta);
        await prisma.user.update({
          where: { id: uid },
          data: { reputationScore: newScore },
        });
        await prisma.reputationEvent.create({
          data: {
            userId: uid,
            eventType: event.type,
            delta: event.delta,
            newScore,
          },
        });
      }
    }
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

// Find overlapping time slots between two users
function findOverlappingSlots(slots1: TimeSlot[], slots2: TimeSlot[]): TimeSlot[] {
  const overlapping: TimeSlot[] = [];

  for (const s1 of slots1) {
    for (const s2 of slots2) {
      if (s1.day !== s2.day) continue;

      // Convert to minutes for comparison
      const s1From = timeToMinutes(s1.timeFrom);
      const s1To = timeToMinutes(s1.timeTo);
      const s2From = timeToMinutes(s2.timeFrom);
      const s2To = timeToMinutes(s2.timeTo);

      const overlapFrom = Math.max(s1From, s2From);
      const overlapTo = Math.min(s1To, s2To);

      if (overlapFrom < overlapTo) {
        overlapping.push({
          day: s1.day,
          timeFrom: minutesToTime(overlapFrom),
          timeTo: minutesToTime(overlapTo),
        });
      }
    }
  }

  return overlapping.sort((a, b) => a.day.localeCompare(b.day));
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

// Rule-based date suggestion
function generateSuggestion(
  commonInterests: string[],
  allInterests: string[],
  preferredSlot?: TimeSlot
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
    {
      interests: ['Gym', 'Yoga', 'Swimming'],
      activity: 'Morning workout + smoothies',
      venueName: 'Local gym or studio',
      venueAddress: 'Near you',
      reasoning: 'Shared active lifestyle — energetic first date',
    },
    {
      interests: ['Travel', 'Festivals', 'Music'],
      activity: 'Live music at a local bar',
      venueName: 'Local live music venue',
      venueAddress: 'City center',
      reasoning: 'Music lovers — great atmosphere for connection',
    },
  ];

  const pool = [...commonInterests, ...allInterests];

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

  // Use preferred slot or default to next Saturday at 7 PM
  let suggestedTime: Date;
  if (preferredSlot) {
    const [h, m] = preferredSlot.timeFrom.split(':').map(Number);
    suggestedTime = new Date(preferredSlot.day);
    suggestedTime.setHours(h, m, 0, 0);
  } else {
    suggestedTime = new Date();
    const daysUntilSaturday = (6 - suggestedTime.getDay() + 7) % 7 || 7;
    suggestedTime.setDate(suggestedTime.getDate() + daysUntilSaturday);
    suggestedTime.setHours(19, 0, 0, 0);
  }

  return {
    ...bestMatch,
    suggestedTime,
  };
}
