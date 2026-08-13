import { describe, expect, it } from 'vitest';
import { assertDisposableTestDatabase } from '../helpers/testDatabaseGuard.js';

describe('destructive test database guard', () => {
  it('allows only NODE_ENV=test with an *_test database', () => {
    expect(() => assertDisposableTestDatabase({
      environment: 'test',
      database: 'internship_tracker_test',
    })).not.toThrow();
  });

  it.each([
    { environment: 'development', database: 'internship_tracker_test' },
    { environment: 'test', database: 'internship_tracker' },
    { environment: 'production', database: 'internship_tracker' },
  ])('rejects unsafe cleanup target $environment/$database', (configuration) => {
    expect(() => assertDisposableTestDatabase(configuration)).toThrow(/Refusing destructive test setup/);
  });
});
