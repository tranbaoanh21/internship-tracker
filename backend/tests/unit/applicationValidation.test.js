import { describe, expect, it } from 'vitest';
import {
  validateApplicationInput,
  validateId,
  validateListQuery,
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
    });
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
