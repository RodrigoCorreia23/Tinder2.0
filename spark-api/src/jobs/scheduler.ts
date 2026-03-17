import cron from 'node-cron';
import { expireStaleMatches } from './matchExpiry.job';
import { resetEnergy } from './energyReset.job';

export function startScheduler() {
  // Check for expired matches every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('[CRON] Checking for expired matches...');
    await expireStaleMatches();
  });

  // Reset energy for users every minute (rolling 24h timer)
  cron.schedule('* * * * *', async () => {
    await resetEnergy();
  });

  console.log('📅 Scheduled jobs started');
}
