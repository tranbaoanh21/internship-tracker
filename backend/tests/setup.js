import { afterAll, beforeEach } from 'vitest';
import { closePool, getPool } from '../src/config/db.js';
import { authenticateTestOwner } from './helpers/auth.js';
import { assertDisposableTestDatabase } from './helpers/testDatabaseGuard.js';

beforeEach(async () => {
  assertDisposableTestDatabase();
  await getPool().query('DELETE FROM applications');
  await getPool().query('DELETE FROM sessions');
  await authenticateTestOwner();
});

afterAll(async () => {
  await closePool();
});
