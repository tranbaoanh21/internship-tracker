import { randomUUID } from 'node:crypto';
import pinoHttp from 'pino-http';
import { logger } from '../config/logger.js';

export const requestLogger = pinoHttp({
  logger,
  genReqId(req, res) {
    const supplied = req.headers['x-request-id'];
    const id = typeof supplied === 'string' && /^[A-Za-z0-9._-]{1,80}$/.test(supplied)
      ? supplied
      : randomUUID();
    res.setHeader('X-Request-ID', id);
    return id;
  },
  serializers: {
    req(req) {
      return { id: req.id, method: req.method, url: req.url, remoteAddress: req.remoteAddress };
    },
    res(res) {
      return { statusCode: res.statusCode };
    },
  },
});
