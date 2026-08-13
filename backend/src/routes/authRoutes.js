import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import * as controller from '../controllers/authController.js';
import { requireAuth, requireCsrf } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authRouter = Router();

const loginLimiter = process.env.NODE_ENV === 'test' ? (req, res, next) => next() : rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler(req, res) {
    res.status(429).json({ error: { code: 'LOGIN_RATE_LIMITED', message: 'Too many sign-in attempts. Try again later.' } });
  },
});

authRouter.get('/session', asyncHandler(controller.getSession));
authRouter.post('/login', loginLimiter, asyncHandler(controller.login));
authRouter.post('/logout', requireAuth, requireCsrf, asyncHandler(controller.logout));
