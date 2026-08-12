import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    globalSetup: ['./tests/globalSetup.js'],
    setupFiles: ['./tests/setup.js'],
    env: {
      NODE_ENV: 'test',
      DB_HOST: '127.0.0.1',
      DB_PORT: '3307',
      DB_NAME: 'internship_tracker_test',
      DB_USER: 'tracker',
      DB_PASSWORD: 'tracker_password',
    },
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
