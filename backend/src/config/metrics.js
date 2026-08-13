import { collectDefaultMetrics, Histogram, Registry } from 'prom-client';

export const metricsRegistry = new Registry();

if (process.env.NODE_ENV !== 'test') {
  collectDefaultMetrics({ register: metricsRegistry, prefix: 'tracker_' });
}

const requestDuration = new Histogram({
  name: 'tracker_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds.',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [metricsRegistry],
});

export function recordRequestMetrics(req, res, next) {
  if (req.path === '/metrics') {
    next();
    return;
  }
  const stop = requestDuration.startTimer();
  res.once('finish', () => {
    const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : 'unmatched';
    stop({ method: req.method, route, status_code: String(res.statusCode) });
  });
  next();
}
