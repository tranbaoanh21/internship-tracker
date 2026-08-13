import { getDatabaseConfig } from '../../src/config/env.js';

export function assertDisposableTestDatabase({
  environment = process.env.NODE_ENV,
  database = getDatabaseConfig().database,
} = {}) {
  if (environment !== 'test' || !database.endsWith('_test')) {
    throw new Error(
      `Refusing destructive test setup for database "${database}" outside NODE_ENV=test and an *_test database.`,
    );
  }
}
