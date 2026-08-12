import { describe, expect, it, vi } from 'vitest';
import { todayInApplicationTimezone } from '../../src/utils/date.js';

describe('application calendar date', () => {
  it('uses the configured product timezone instead of the host timezone', () => {
    vi.stubEnv('APP_TIMEZONE', 'Asia/Ho_Chi_Minh');
    expect(todayInApplicationTimezone(new Date('2026-08-12T18:30:00.000Z'))).toBe('2026-08-13');
    vi.unstubAllEnvs();
  });
});
