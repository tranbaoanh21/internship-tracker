import { Router } from 'express';
import Redis from 'ioredis';
import { getServerConfig } from '../config/env.js';
import * as controller from '../controllers/notificationController.js';
import { requireAuth, requireCsrf } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const notificationRouter = Router();

notificationRouter.use(requireAuth);
notificationRouter.get('/', asyncHandler(controller.list));
notificationRouter.patch('/read-all', requireCsrf, asyncHandler(controller.markAllRead));
notificationRouter.patch('/:id/read', requireCsrf, asyncHandler(controller.markRead));
notificationRouter.get('/events', asyncHandler(async (req, res) => {
  res.status(200);
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write('event: ready\ndata: {}\n\n');

  const subscriber = new Redis(getServerConfig().redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      return times > 5 ? null : Math.min(times * 500, 2_000);
    },
  });
  const channel = `notifications:${req.auth.user.id}`;
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 25_000);

  subscriber.on('message', (receivedChannel, message) => {
    if (receivedChannel === channel) res.write(`event: notification\ndata: ${message}\n\n`);
  });
  subscriber.on('error', (error) => req.log?.warn({ err: error }, 'notification SSE Redis error'));
  subscriber.connect().then(() => subscriber.subscribe(channel)).catch((error) => {
    req.log?.warn({ err: error }, 'notification SSE unavailable');
  });

  req.on('close', () => {
    clearInterval(heartbeat);
    subscriber.quit().catch(() => subscriber.disconnect());
  });
}));
