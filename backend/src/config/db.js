import mysql from 'mysql2/promise';
import { getDatabaseConfig } from './env.js';

let pool;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      ...getDatabaseConfig(),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true,
      decimalNumbers: true,
      supportBigNumbers: true,
      bigNumberStrings: true,
    });
  }

  return pool;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
