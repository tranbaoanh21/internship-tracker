import Redis from 'ioredis';
import { closePool } from '../src/config/db.js';
import { getServerConfig, validateRuntimeConfig } from '../src/config/env.js';
import { scanDueFollowUps } from '../src/services/reminderService.js';

validateRuntimeConfig();
const publisher = new Redis(getServerConfig().redisUrl, { maxRetriesPerRequest: 3 });

try {
  const result = await scanDueFollowUps(publisher);
  console.log(JSON.stringify(result));
} finally {
  await publisher.quit();
  await closePool();
}
