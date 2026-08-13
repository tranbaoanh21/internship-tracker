import { Router } from 'express';
import * as controller from '../controllers/applicationController.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, requireCsrf } from '../middleware/auth.js';

export const applicationRouter = Router();

applicationRouter.use(requireAuth);

applicationRouter.get('/', asyncHandler(controller.list));
applicationRouter.get('/stats', asyncHandler(controller.stats));
applicationRouter.get('/:id/history', asyncHandler(controller.history));
applicationRouter.get('/:id', asyncHandler(controller.getById));
applicationRouter.post('/', requireCsrf, asyncHandler(controller.create));
applicationRouter.post('/:id/archive', requireCsrf, asyncHandler(controller.archive));
applicationRouter.post('/:id/restore', requireCsrf, asyncHandler(controller.restore));
applicationRouter.patch('/:id', requireCsrf, asyncHandler(controller.update));
applicationRouter.delete('/:id', requireCsrf, asyncHandler(controller.remove));
