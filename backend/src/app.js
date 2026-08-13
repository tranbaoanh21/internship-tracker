import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { getServerConfig } from './config/env.js';
import { loadSession, requireAuth } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { requestLogger } from './middleware/observability.js';
import { recordRequestMetrics } from './config/metrics.js';
import { applicationRouter } from './routes/applicationRoutes.js';
import { authRouter } from './routes/authRoutes.js';
import { docsRouter } from './routes/docsRoutes.js';
import { healthRouter } from './routes/healthRoutes.js';
import { notificationRouter } from './routes/notificationRoutes.js';
import { metricsRouter } from './routes/metricsRoutes.js';

export const app = express();

const config = getServerConfig();

app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);
app.use(requestLogger);
app.use(recordRequestMetrics);
app.use(helmet({ contentSecurityPolicy: false }));
const apiLimiter = config.environment === 'test' ? (req, res, next) => next() : rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler(req, res) {
    res.status(429).json({ error: { code: 'API_RATE_LIMITED', message: 'Too many requests. Try again later.' } });
  },
});
app.use(apiLimiter);
app.use(express.json({ limit: '32kb' }));
app.use(loadSession);
app.use('/api/health', healthRouter);
app.use('/metrics', metricsRouter);
app.use('/api/auth', authRouter);
if (config.apiDocsEnabled) {
  app.use('/api', config.production ? requireAuth : (req, res, next) => next(), docsRouter);
}
app.use('/api/applications', applicationRouter);
app.use('/api/notifications', notificationRouter);
app.use(notFoundHandler);
app.use(errorHandler);
