import { runMigrations } from '../scripts/migrate.js';

export default async function globalSetup() {
  await runMigrations();
}
