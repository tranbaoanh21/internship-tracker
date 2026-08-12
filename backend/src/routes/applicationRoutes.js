import { Router } from 'express';
import * as controller from '../controllers/applicationController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const applicationRouter = Router();

applicationRouter.get('/', asyncHandler(controller.list));
applicationRouter.get('/stats', asyncHandler(controller.stats));
applicationRouter.get('/:id', asyncHandler(controller.getById));
applicationRouter.post('/', asyncHandler(controller.create));
applicationRouter.patch('/:id', asyncHandler(controller.update));
applicationRouter.delete('/:id', asyncHandler(controller.remove));
