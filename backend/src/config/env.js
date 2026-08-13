import dotenv from 'dotenv';
import path from 'node:path';
import { readFileSync } from 'node:fs';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env'), override: false });

function numberFromEnvironment(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function booleanFromEnvironment(value, fallback) {
  if (value === undefined) return fallback;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`Expected a boolean environment value, received ${value}.`);
}

function boundedNumber(value, fallback, { min, max, name }) {
  const parsed = numberFromEnvironment(value, fallback);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be between ${min} and ${max}.`);
  }
  return parsed;
}

function secretFromEnvironment(name, fallback = '') {
  if (process.env[name]) return process.env[name];
  const file = process.env[`${name}_FILE`];
  if (!file) return fallback;
  return readFileSync(file, 'utf8').trimEnd();
}

export function getServerConfig() {
  const production = process.env.NODE_ENV === 'production';
  return {
    environment: process.env.NODE_ENV || 'development',
    production,
    port: boundedNumber(process.env.PORT, 3000, { min: 1, max: 65535, name: 'PORT' }),
    applicationTimezone: process.env.APP_TIMEZONE || 'Asia/Ho_Chi_Minh',
    trustProxy: production
      ? boundedNumber(process.env.TRUST_PROXY_HOPS, 1, { min: 1, max: 3, name: 'TRUST_PROXY_HOPS' })
      : false,
    sessionTtlHours: boundedNumber(process.env.SESSION_TTL_HOURS, 12, { min: 1, max: 168, name: 'SESSION_TTL_HOURS' }),
    cookieSecure: booleanFromEnvironment(process.env.COOKIE_SECURE, production),
    sessionCookieName: production ? '__Host-tracker_session' : 'tracker_session',
    ownerEmail: process.env.OWNER_EMAIL || '',
    ownerPassword: secretFromEnvironment('OWNER_PASSWORD'),
    redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
    apiDocsEnabled: booleanFromEnvironment(process.env.API_DOCS_ENABLED, !production),
  };
}

export function getDatabaseConfig() {
  const isTest = process.env.NODE_ENV === 'test';
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: numberFromEnvironment(process.env.DB_PORT, isTest ? 3307 : 3306),
    database: process.env.DB_NAME || (isTest ? 'internship_tracker_test' : 'internship_tracker'),
    user: process.env.DB_USER || 'tracker',
    password: secretFromEnvironment('DB_PASSWORD', isProduction ? '' : 'tracker_password'),
  };
}

export function validateRuntimeConfig() {
  const server = getServerConfig();
  const database = getDatabaseConfig();
  if (server.production) {
    const missing = [];
    if (!database.password) missing.push('DB_PASSWORD or DB_PASSWORD_FILE');
    if (!server.ownerEmail) missing.push('OWNER_EMAIL');
    if (!server.ownerPassword) missing.push('OWNER_PASSWORD');
    if (!server.cookieSecure) throw new Error('COOKIE_SECURE must be true in production.');
    if (missing.length) throw new Error(`Missing required production environment: ${missing.join(', ')}.`);
  }
  return { server, database };
}
