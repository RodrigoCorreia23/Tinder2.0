import prisma from '../../config/database';
import { AppError } from '../../shared/middleware/errorHandler';

export async function blockUser(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) {
    throw new AppError('Cannot block yourself', 400);
  }

  // Check if already blocked
  const existing = await prisma.block.findUnique({
    where: { blockerId_blockedId: { blockerId, blockedId } },
  });
  if (existing) {
    throw new AppError('User already blocked', 409);
  }

  await prisma.$transaction(async (tx) => {
    // Create block record
    await tx.block.create({
      data: { blockerId, blockedId },
    });

    // Auto-unmatch if matched
    const [u1, u2] = [blockerId, blockedId].sort();
    await tx.match.updateMany({
      where: {
        user1Id: u1,
        user2Id: u2,
        status: 'active',
      },
      data: { status: 'unmatched' },
    });

    // Delete swipes between them (both directions)
    await tx.swipe.deleteMany({
      where: {
        OR: [
          { swiperId: blockerId, swipedId: blockedId },
          { swiperId: blockedId, swipedId: blockerId },
        ],
      },
    });
  });
}

export async function unblockUser(blockerId: string, blockedId: string) {
  const existing = await prisma.block.findUnique({
    where: { blockerId_blockedId: { blockerId, blockedId } },
  });

  if (!existing) {
    throw new AppError('Block not found', 404);
  }

  await prisma.block.delete({
    where: { blockerId_blockedId: { blockerId, blockedId } },
  });
}

export async function getBlockedIds(userId: string): Promise<string[]> {
  const [blocksGiven, blocksReceived] = await Promise.all([
    prisma.block.findMany({
      where: { blockerId: userId },
      select: { blockedId: true },
    }),
    prisma.block.findMany({
      where: { blockedId: userId },
      select: { blockerId: true },
    }),
  ]);

  return [
    ...blocksGiven.map((b) => b.blockedId),
    ...blocksReceived.map((b) => b.blockerId),
  ];
}

export async function reportUser(
  reporterId: string,
  reportedId: string,
  reason: string,
  details?: string
) {
  if (reporterId === reportedId) {
    throw new AppError('Cannot report yourself', 400);
  }

  await prisma.report.create({
    data: {
      reporterId,
      reportedId,
      reason,
      details,
    },
  });
}
