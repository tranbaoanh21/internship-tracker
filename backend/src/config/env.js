import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env'), override: false });

function numberFromEnvironment(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getServerConfig() {
  return {
    port: numberFromEnvironment(process.env.PORT, 3000),
    applicationTimezone: process.env.APP_TIMEZONE || 'Asia/Ho_Chi_Minh',
  };
}

export function getDatabaseConfig() {
  const isTest = process.env.NODE_ENV === 'test';

  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: numberFromEnvironment(process.env.DB_PORT, isTest ? 3307 : 3306),
    database: process.env.DB_NAME || (isTest ? 'internship_tracker_test' : 'internship_tracker'),
    user: process.env.DB_USER || 'tracker',
    password: process.env.DB_PASSWORD || 'tracker_password',
  };
}
