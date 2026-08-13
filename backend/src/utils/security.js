import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export function randomToken() {
  return randomBytes(32).toString('base64url');
}

export function tokenHash(token) {
  return createHash('sha256').update(token).digest();
}

export function safeTokenMatch(value, expectedHash) {
  if (typeof value !== 'string' || !value) return false;
  const actual = tokenHash(value);
  return actual.length === expectedHash.length && timingSafeEqual(actual, expectedHash);
}
