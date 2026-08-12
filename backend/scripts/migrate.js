import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { getDatabaseConfig } from '../src/config/env.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const migrationsDirectory = path.resolve(currentDirectory, '../../database/migrations');

export async function runMigrations() {
  const connection = await mysql.createConnection({
    ...getDatabaseConfig(),
    dateStrings: true,
    multipleStatements: true,
  });

  try {
    const [lockRows] = await connection.execute(
      'SELECT GET_LOCK(?, 30) AS acquired',
      ['internship_tracker_schema_migrations'],
    );
    if (Number(lockRows[0].acquired) !== 1) {
      throw new Error('Could not acquire the database migration lock.');
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) NOT NULL PRIMARY KEY,
        checksum CHAR(64) NOT NULL,
        applied_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    const [appliedRows] = await connection.query('SELECT filename, checksum FROM schema_migrations');
    const applied = new Map(appliedRows.map((row) => [row.filename, row.checksum]));
    const files = (await readdir(migrationsDirectory))
      .filter((file) => /^\d{3}_[a-z0-9_]+\.sql$/.test(file))
      .sort();

    for (const file of files) {
      const sql = await readFile(path.join(migrationsDirectory, file), 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      if (applied.has(file)) {
        if (applied.get(file) !== checksum) {
          throw new Error(`Applied migration ${file} has been modified.`);
        }
        continue;
      }
      await connection.query(sql);
      await connection.execute(
        'INSERT INTO schema_migrations (filename, checksum) VALUES (?, ?)',
        [file, checksum],
      );
      console.log(`Applied migration ${file}`);
    }
  } finally {
    await connection.execute('SELECT RELEASE_LOCK(?)', ['internship_tracker_schema_migrations']).catch(() => {});
    await connection.end();
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  runMigrations().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
