import { Router } from 'express';
import { getPool } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const healthRouter = Router();

healthRouter.get('/', asyncHandler(async (req, res) => {
  try {
    await getPool().query('SELECT 1');
    res.json({ status: 'ok', database: 'up' });
  } catch {
    res.status(503).json({ status: 'error', database: 'down' });
  }
}));
