import { getServerConfig } from '../config/env.js';
import * as repository from '../repositories/authRepository.js';
import * as service from '../services/authService.js';
import { sessionCookie } from '../utils/cookies.js';

function cookieOptions(maxAgeSeconds) {
  const { cookieSecure } = getServerConfig();
  return { secure: cookieSecure, maxAgeSeconds };
}

export async function getSession(req, res) {
  res.set('Cache-Control', 'no-store');
  if (!req.auth) {
    res.json({ data: { authenticated: false } });
    return;
  }
  res.json({ data: { authenticated: true, user: req.auth.user, expiresAt: req.auth.expiresAt, csrfToken: req.auth.csrfToken } });
}

export async function login(req, res) {
  if (req.auth) await repository.deleteSession(req.auth.tokenHash);
  const result = await service.login(req.body);
  const { sessionCookieName, sessionTtlHours } = getServerConfig();
  res.set('Cache-Control', 'no-store');
  res.set('Set-Cookie', sessionCookie(sessionCookieName, result.token, cookieOptions(sessionTtlHours * 3600)));
  res.json({ data: { authenticated: true, user: result.user, expiresAt: result.expiresAt, csrfToken: result.csrfToken } });
}

export async function logout(req, res) {
  await repository.deleteSession(req.auth.tokenHash);
  const { sessionCookieName } = getServerConfig();
  res.set('Clear-Site-Data', '"cache", "cookies", "storage"');
  res.set('Set-Cookie', sessionCookie(sessionCookieName, '', cookieOptions(0)));
  res.status(204).end();
}
