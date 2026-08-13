import { Router } from 'express';
import { metricsRegistry } from '../config/metrics.js';

export const metricsRouter = Router();

metricsRouter.get('/', async (req, res) => {
  res.set('Content-Type', metricsRegistry.contentType);
  res.send(await metricsRegistry.metrics());
});
