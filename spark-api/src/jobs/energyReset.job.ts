import prisma from '../config/database';
import { getIO } from '../socket';

const MAX_ENERGY = 25;

export async function resetEnergy() {
  const now = new Date();

  // Find users whose energy timer has expired
  const users = await prisma.user.findMany({
    where: {
      energyResetAt: { lte: now },
      energyRemaining: { lt: MAX_ENERGY },
    },
    select: { id: true },
  });

  if (users.length === 0) return;

  // Reset their energy
  await prisma.user.updateMany({
    where: {
      id: { in: users.map((u) => u.id) },
    },
    data: {
      energyRemaining: MAX_ENERGY,
      energyResetAt: null,
    },
  });

  // Notify each user
  const io = getIO();
  for (const user of users) {
    io.to(`user:${user.id}`).emit('energy_refilled', { energy: MAX_ENERGY });
  }

  if (users.length > 0) {
    console.log(`[CRON] Reset energy for ${users.length} users`);
  }
}
