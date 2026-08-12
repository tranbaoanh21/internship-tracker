import { afterAll, beforeEach } from 'vitest';
import { closePool, getPool } from '../src/config/db.js';

beforeEach(async () => {
  await getPool().query('DELETE FROM applications');
});

afterAll(async () => {
  await closePool();
});
