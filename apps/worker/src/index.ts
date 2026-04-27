import { Cron } from 'croner';
import { runDailyDigest } from './jobs/daily-digest.js';
import { runEmailRetry } from './jobs/email-retry.js';

// 07:00 Brussels time, weekdays only.
// croner handles DST automatically — email arrives at a consistent 07:00
// Brussels wall-clock year-round (06:00 UTC in CEST, 07:00 UTC in CET).
new Cron('0 7 * * 1-5', { timezone: 'Europe/Brussels' }, async () => {
  await runDailyDigest();
});

// Retry queue: pick up failed sends every 5 minutes.
new Cron('*/5 * * * *', async () => {
  await runEmailRetry();
});

console.log('Worker started — digest at 07:00 Brussels (weekdays), retry every 5 min');
