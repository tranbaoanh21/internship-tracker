import { getServerConfig } from '../config/env.js';
import { AppError } from '../errors/AppError.js';
import * as repository from '../repositories/authRepository.js';
import { parseCookies } from '../utils/cookies.js';
import { safeTokenMatch, tokenHash } from '../utils/security.js';

export async function loadSession(req, res, next) {
  const { sessionCookieName } = getServerConfig();
  const token = parseCookies(req.headers.cookie)[sessionCookieName];
  if (!token || token.length > 128) {
    req.auth = null;
    next();
    return;
  }
  const hash = tokenHash(token);
  const session = await repository.findSession(hash);
  if (!session) {
    req.auth = null;
    next();
    return;
  }
  req.auth = { ...session, tokenHash: hash };
  repository.touchSession(hash).catch(() => {});
  next();
}

export function requireAuth(req, res, next) {
  if (!req.auth) {
    next(new AppError(401, 'AUTHENTICATION_REQUIRED', 'Sign in to continue.'));
    return;
  }
  next();
}

export function requireCsrf(req, res, next) {
  if (!req.auth) {
    next(new AppError(401, 'AUTHENTICATION_REQUIRED', 'Sign in to continue.'));
    return;
  }
  if (!safeTokenMatch(req.get('X-CSRF-Token'), tokenHash(req.auth.csrfToken))) {
    next(new AppError(403, 'CSRF_TOKEN_INVALID', 'Refresh the page and try again.'));
    return;
  }
  next();
}
