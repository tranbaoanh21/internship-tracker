import { Router } from 'express';
import * as controller from '../controllers/applicationController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const applicationRouter = Router();

applicationRouter.get('/', asyncHandler(controller.list));
applicationRouter.get('/stats', asyncHandler(controller.stats));
applicationRouter.get('/:id/history', asyncHandler(controller.history));
applicationRouter.get('/:id', asyncHandler(controller.getById));
applicationRouter.post('/', asyncHandler(controller.create));
applicationRouter.post('/:id/archive', asyncHandler(controller.archive));
applicationRouter.post('/:id/restore', asyncHandler(controller.restore));
applicationRouter.patch('/:id', asyncHandler(controller.update));
applicationRouter.delete('/:id', asyncHandler(controller.remove));
