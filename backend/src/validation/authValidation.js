import { AppError } from '../errors/AppError.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function validateCredentials(body) {
  const fields = {};
  const email = normalizeEmail(body?.email);
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) fields.email = 'Enter a valid email address.';
  if (password.length < 12 || password.length > 128) fields.password = 'Password must use 12 to 128 characters.';
  if (Object.keys(fields).length) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Check the highlighted fields.', fields);
  }
  return { email, password };
}
