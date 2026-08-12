import { describe, expect, it, vi } from 'vitest';
import { migrateWithRetry } from '../../scripts/start.js';

describe('database startup retry', () => {
  it('retries transient connection failures before succeeding', async () => {
    const transientError = Object.assign(new Error('not ready'), { code: 'ECONNREFUSED' });
    const migrate = vi.fn()
      .mockRejectedValueOnce(transientError)
      .mockRejectedValueOnce(transientError)
      .mockResolvedValueOnce(undefined);
    const wait = vi.fn().mockResolvedValue(undefined);
    const onRetry = vi.fn();

    await migrateWithRetry({ migrate, wait, onRetry, maxAttempts: 3, retryDelayMs: 10 });

    expect(migrate).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it('does not retry migration integrity failures', async () => {
    const migrationError = new Error('checksum mismatch');
    const migrate = vi.fn().mockRejectedValue(migrationError);
    const wait = vi.fn();

    await expect(migrateWithRetry({ migrate, wait })).rejects.toThrow('checksum mismatch');
    expect(migrate).toHaveBeenCalledOnce();
    expect(wait).not.toHaveBeenCalled();
  });
});
