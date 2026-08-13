import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { closePool } from '../src/config/db.js';
import { getServerConfig, validateRuntimeConfig } from '../src/config/env.js';
import { logger } from '../src/config/logger.js';
import { scanDueFollowUps } from '../src/services/reminderService.js';

validateRuntimeConfig();
const { redisUrl } = getServerConfig();
const queueConnection = new Redis(redisUrl, { maxRetriesPerRequest: null });
const workerConnection = new Redis(redisUrl, { maxRetriesPerRequest: null });
const publisher = new Redis(redisUrl, { maxRetriesPerRequest: 3 });
const queue = new Queue('reminders', { connection: queueConnection });

const worker = new Worker('reminders', async () => {
  const result = await scanDueFollowUps(publisher);
  logger.info(result, 'follow-up reminder scan complete');
  return result;
}, { connection: workerConnection, concurrency: 1 });

worker.on('failed', (job, error) => logger.error({ err: error, jobId: job?.id }, 'reminder job failed'));
worker.on('error', (error) => logger.error({ err: error }, 'reminder worker error'));

async function scheduleScan() {
  const minute = Math.floor(Date.now() / 60_000);
  await queue.add('scan-due-follow-ups', {}, {
    jobId: `scan-${minute}`,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: 100,
    removeOnFail: 100,
  });
}

await scheduleScan();
const scheduler = setInterval(() => scheduleScan().catch((error) => {
  logger.error({ err: error }, 'could not enqueue reminder scan');
}), 60_000);
logger.info('reminder worker started');

async function shutdown(signal) {
  logger.info({ signal }, 'stopping reminder worker');
  clearInterval(scheduler);
  await Promise.allSettled([worker.close(), queue.close(), publisher.quit()]);
  await closePool();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
