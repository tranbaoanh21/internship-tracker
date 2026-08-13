import { describe, expect, it } from 'vitest';
import { parseCookies, sessionCookie } from '../../src/utils/cookies.js';

describe('session cookies', () => {
  it('serializes the production security attributes', () => {
    expect(sessionCookie('__Host-tracker_session', 'opaque-token', { secure: true, maxAgeSeconds: 60 }))
      .toBe('__Host-tracker_session=opaque-token; Path=/; HttpOnly; SameSite=Strict; Max-Age=60; Secure');
  });

  it('does not throw on malformed percent encoding', () => {
    expect(parseCookies('tracker_session=%E0%A4%A')).toEqual({ tracker_session: '' });
  });
});
