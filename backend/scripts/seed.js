import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { getDatabaseConfig } from '../src/config/env.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const seedsDirectory = path.resolve(currentDirectory, '../../database/seeds');

async function seed() {
  const connection = await mysql.createConnection({
    ...getDatabaseConfig(),
    multipleStatements: true,
  });
  try {
    const [rows] = await connection.query('SELECT COUNT(*) AS total FROM applications');
    if (Number(rows[0].total) > 0) {
      console.log('Seed skipped because applications already exist.');
      return;
    }

    const files = (await readdir(seedsDirectory)).filter((file) => file.endsWith('.sql')).sort();
    for (const file of files) {
      await connection.query(await readFile(path.join(seedsDirectory, file), 'utf8'));
      console.log(`Applied seed ${file}`);
    }
  } finally {
    await connection.end();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
