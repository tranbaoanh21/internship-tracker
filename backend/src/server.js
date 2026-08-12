import { app } from './app.js';
import { closePool } from './config/db.js';
import { getServerConfig } from './config/env.js';

const { port } = getServerConfig();
const server = app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received, shutting down.`);
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
