import express from 'express';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { applicationRouter } from './routes/applicationRoutes.js';
import { docsRouter } from './routes/docsRoutes.js';
import { healthRouter } from './routes/healthRoutes.js';

export const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.use('/api', docsRouter);
app.use('/api/health', healthRouter);
app.use('/api/applications', applicationRouter);
app.use(notFoundHandler);
app.use(errorHandler);
