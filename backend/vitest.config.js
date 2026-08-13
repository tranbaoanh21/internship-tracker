import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/*.test.js', 'tests/contract/**/*.test.js'],
    exclude: ['tests/unit/**'],
    fileParallelism: false,
    testTimeout: 10_000,
    hookTimeout: 10_000,
    globalSetup: ['./tests/globalSetup.js'],
    setupFiles: ['./tests/setup.js'],
    env: {
      NODE_ENV: 'test',
      DB_HOST: '127.0.0.1',
      DB_PORT: '3307',
      DB_NAME: 'internship_tracker_test',
      DB_USER: 'tracker',
      DB_PASSWORD: 'tracker_password',
      OWNER_EMAIL: 'owner@example.com',
      OWNER_PASSWORD: 'correct-horse-battery-staple',
    },
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
