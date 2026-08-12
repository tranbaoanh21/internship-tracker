import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runMigrations } from './migrate.js';

const MAX_ATTEMPTS = 30;
const RETRY_DELAY_MS = 2_000;
const TRANSIENT_DATABASE_ERRORS = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'PROTOCOL_CONNECTION_LOST',
]);

export async function migrateWithRetry({
  migrate = runMigrations,
  wait = delay,
  maxAttempts = MAX_ATTEMPTS,
  retryDelayMs = RETRY_DELAY_MS,
  onRetry = console.warn,
} = {}) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await migrate();
      return;
    } catch (error) {
      const retryable = TRANSIENT_DATABASE_ERRORS.has(error?.code);
      if (!retryable || attempt === maxAttempts) throw error;
      onRetry(
        `Database is not ready (${error.code}); migration retry ${attempt}/${maxAttempts} in ${retryDelayMs / 1000}s.`,
      );
      await wait(retryDelayMs);
    }
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  await migrateWithRetry();
  await import('../src/server.js');
}
