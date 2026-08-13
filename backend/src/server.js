import { app } from './app.js';
import { closePool } from './config/db.js';
import { getServerConfig } from './config/env.js';
import { logger } from './config/logger.js';

const { port } = getServerConfig();
const server = app.listen(port, () => {
  logger.info({ port }, 'API listening');
});

server.requestTimeout = 30_000;
server.headersTimeout = 35_000;
server.keepAliveTimeout = 5_000;

async function shutdown(signal) {
  logger.info({ signal }, 'Shutting down');
  const forceExit = setTimeout(() => process.exit(1), 10_000).unref();
  server.close(async () => {
    clearTimeout(forceExit);
    await closePool();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
