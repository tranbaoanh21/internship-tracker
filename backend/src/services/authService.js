import argon2 from 'argon2';
import { getServerConfig } from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import * as repository from '../repositories/authRepository.js';
import { randomToken, tokenHash } from '../utils/security.js';
import { normalizeEmail, validateCredentials } from '../validation/authValidation.js';

const ARGON_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

let dummyHash;

async function verificationHash(user) {
  if (user) return user.passwordHash;
  dummyHash ||= await argon2.hash('not-a-real-password', ARGON_OPTIONS);
  return dummyHash;
}

export async function ensureBootstrapOwner({ required = false } = {}) {
  const { ownerEmail, ownerPassword } = getServerConfig();
  if (!ownerEmail || !ownerPassword) {
    if (required) throw new Error('OWNER_EMAIL and OWNER_PASSWORD are required to bootstrap the owner.');
    return { kind: 'skipped' };
  }
  const { email, password } = validateCredentials({ email: ownerEmail, password: ownerPassword });
  const existingCount = await repository.countUsers();
  if (existingCount) {
    const existing = await repository.findUserByEmail(email);
    if (!existing) throw new Error('A different owner account already exists.');
    return { kind: 'exists', user: publicUser(existing) };
  }
  const passwordHash = await argon2.hash(password, ARGON_OPTIONS);
  const result = await repository.bootstrapOwner({ email, passwordHash });
  return { ...result, user: result.user ? publicUser(result.user) : null };
}

export async function login(body) {
  const { email, password } = validateCredentials(body);
  const user = await repository.findUserByEmail(email);
  const valid = await argon2.verify(await verificationHash(user), password).catch(() => false);
  if (!user || !valid) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');

  const token = randomToken();
  const csrfToken = randomToken();
  const { sessionTtlHours } = getServerConfig();
  const expiresAt = new Date(Date.now() + sessionTtlHours * 60 * 60 * 1000);
  await repository.createSession({
    tokenHash: tokenHash(token),
    csrfToken,
    userId: user.id,
    expiresAt,
  });
  return { token, csrfToken, expiresAt, user: publicUser(user) };
}

export function publicUser(user) {
  return { id: user.id, email: user.email, role: user.role, createdAt: user.createdAt };
}

export function normalizeOwnerEmail(value) {
  return normalizeEmail(value);
}
