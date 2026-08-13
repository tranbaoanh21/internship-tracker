import { runMigrations } from '../scripts/migrate.js';
import { closePool } from '../src/config/db.js';
import { ensureBootstrapOwner } from '../src/services/authService.js';
import { assertDisposableTestDatabase } from './helpers/testDatabaseGuard.js';

export default async function globalSetup() {
  assertDisposableTestDatabase();
  process.env.OWNER_EMAIL = 'owner@example.com';
  process.env.OWNER_PASSWORD = 'correct-horse-battery-staple';
  await runMigrations();
  try {
    await ensureBootstrapOwner({ required: true });
  } finally {
    await closePool();
  }
}
