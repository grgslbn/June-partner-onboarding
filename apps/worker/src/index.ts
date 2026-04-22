import { Cron } from 'croner';
import { runDailyDigest } from './jobs/daily-digest';
import { runEmailRetry } from './jobs/email-retry';

new Cron('0 6 * * *', { timezone: 'Europe/Brussels' }, async () => {
  await runDailyDigest();
});

new Cron('*/5 * * * *', async () => {
  await runEmailRetry();
});

console.log('Worker started');
