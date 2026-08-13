import Redis from 'ioredis';
import { getServerConfig } from '../src/config/env.js';

const redis = new Redis(getServerConfig().redisUrl, {
  connectTimeout: 2_000,
  maxRetriesPerRequest: 1,
  retryStrategy: () => null,
});

try {
  const heartbeat = await redis.get('tracker:reminder-worker:heartbeat');
  if (!heartbeat) process.exitCode = 1;
} catch {
  process.exitCode = 1;
} finally {
  redis.disconnect();
}
