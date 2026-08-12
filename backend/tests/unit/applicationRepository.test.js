import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPool } from '../../src/config/db.js';
import { updateApplication } from '../../src/repositories/applicationRepository.js';

vi.mock('../../src/config/db.js', () => ({ getPool: vi.fn() }));

describe('application repository transaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rolls back and releases the connection when status-history insertion fails', async () => {
    const historyFailure = new Error('forced history failure');
    const connection = {
      beginTransaction: vi.fn().mockResolvedValue(undefined),
      commit: vi.fn().mockResolvedValue(undefined),
      rollback: vi.fn().mockResolvedValue(undefined),
      release: vi.fn(),
      execute: vi.fn()
        .mockResolvedValueOnce([[
          {
            id: '1',
            company: 'MoMo',
            position: 'Intern',
            job_url: null,
            status: 'applied',
            applied_at: null,
            notes: null,
            next_action: null,
            follow_up_at: null,
            created_at: '2026-08-13 10:00:00.000',
            updated_at: '2026-08-13 10:00:00.000',
            archived_at: null,
            version: 1,
          },
        ]])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockRejectedValueOnce(historyFailure),
    };
    getPool.mockReturnValue({ getConnection: vi.fn().mockResolvedValue(connection) });

    await expect(updateApplication('1', { status: 'interview' }, 1)).rejects.toThrow(historyFailure);
    expect(connection.rollback).toHaveBeenCalledOnce();
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalledOnce();
  });
});
