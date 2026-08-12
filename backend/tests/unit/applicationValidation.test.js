import { describe, expect, it } from 'vitest';
import {
  validateApplicationInput,
  validateId,
  validateIfMatch,
  validateListQuery,
  validateStatsQuery,
} from '../../src/validation/applicationValidation.js';

describe('application validation', () => {
  it('normalizes a valid create body', () => {
    expect(validateApplicationInput({ company: '  MoMo ', position: ' Backend Intern ' })).toEqual({
      company: 'MoMo',
      position: 'Backend Intern',
      status: 'wishlist',
      jobUrl: null,
      appliedAt: null,
      notes: null,
      nextAction: null,
      followUpAt: null,
    });
  });

  it('rejects unsupported fields', () => {
    expect(() => validateApplicationInput({
      company: 'MoMo',
      position: 'Intern',
      companyName: 'Typo',
    })).toThrowError(expect.objectContaining({ code: 'VALIDATION_ERROR' }));
  });

  it.each(['javascript:alert(1)', 'ftp://example.com', 'not a url'])(
    'rejects unsafe URL %s',
    (jobUrl) => {
      expect(() => validateApplicationInput({ company: 'A', position: 'B', jobUrl }))
        .toThrowError(expect.objectContaining({ code: 'VALIDATION_ERROR' }));
    },
  );

  it('rejects an explicit null status instead of silently applying the default', () => {
    expect(() => validateApplicationInput({ company: 'A', position: 'B', status: null }))
      .toThrowError(expect.objectContaining({ code: 'VALIDATION_ERROR' }));
  });

  it.each(['1e3', '0x10', '9007199254740992', '1000001'])(
    'rejects unsafe page value %s',
    (page) => {
      expect(() => validateListQuery({ page })).toThrowError(expect.objectContaining({ code: 'VALIDATION_ERROR' }));
    },
  );

  it('accepts bounded canonical pagination', () => {
    expect(validateListQuery({ page: '25', limit: '100', status: 'interview', q: ' VNG ' })).toEqual({
      page: 25,
      limit: 100,
      status: 'interview',
      q: 'VNG',
      attention: '',
      sort: 'updatedAt',
      direction: 'desc',
      view: 'active',
    });
  });

  it('normalizes next-action fields and advanced list filters', () => {
    expect(validateApplicationInput({
      company: 'VNG',
      position: 'Intern',
      nextAction: '  Email the recruiter  ',
      followUpAt: '2026-08-20',
    })).toMatchObject({
      nextAction: 'Email the recruiter',
      followUpAt: '2026-08-20',
    });

    expect(validateListQuery({
      attention: 'next7',
      sort: 'followUpAt',
      direction: 'asc',
      view: 'archived',
    })).toMatchObject({
      attention: 'next7',
      sort: 'followUpAt',
      direction: 'asc',
      view: 'archived',
    });
  });

  it('rejects invalid follow-up fields and advanced filters', () => {
    expect(() => validateApplicationInput({
      company: 'A',
      position: 'B',
      nextAction: 'x'.repeat(241),
      followUpAt: '2026-02-30',
    })).toThrowError(expect.objectContaining({ code: 'VALIDATION_ERROR' }));

    expect(() => validateListQuery({
      attention: 'later',
      sort: 'salary',
      direction: 'sideways',
      view: 'all',
    })).toThrowError(expect.objectContaining({ code: 'VALIDATION_ERROR' }));
  });

  it('validates stats context and optimistic-concurrency headers', () => {
    expect(validateStatsQuery({ q: ' VNG ', view: 'archived' })).toEqual({
      q: 'VNG',
      view: 'archived',
    });
    expect(validateIfMatch('"42"')).toBe(42);
    expect(() => validateIfMatch(undefined)).toThrowError(
      expect.objectContaining({ code: 'PRECONDITION_REQUIRED', status: 428 }),
    );
    expect(() => validateIfMatch('42')).toThrowError(
      expect.objectContaining({ code: 'INVALID_VERSION' }),
    );
  });

  it.each(['1e3', '0x10', '0', '-1'])(
    'rejects non-canonical id %s',
    (id) => {
      expect(() => validateId(id)).toThrowError(expect.objectContaining({ code: 'INVALID_ID' }));
    },
  );

  it('keeps large BIGINT ids as strings', () => {
    expect(validateId('18446744073709551615')).toBe('18446744073709551615');
  });

  it('rejects ids larger than an unsigned BIGINT', () => {
    expect(() => validateId('18446744073709551616')).toThrowError(
      expect.objectContaining({ code: 'INVALID_ID' }),
    );
  });
});
