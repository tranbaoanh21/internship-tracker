import request from 'supertest';
import { app } from '../../src/app.js';

export let api;

export async function authenticateTestOwner() {
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/login').send({
    email: 'owner@example.com',
    password: 'correct-horse-battery-staple',
  });
  if (response.status !== 200) throw new Error(`Test owner login failed with ${response.status}.`);
  const csrfToken = response.body.data.csrfToken;
  api = {
    agent,
    get: (path) => agent.get(path),
    post: (path) => agent.post(path).set('X-CSRF-Token', csrfToken),
    patch: (path) => agent.patch(path).set('X-CSRF-Token', csrfToken),
    put: (path) => agent.put(path).set('X-CSRF-Token', csrfToken),
    delete: (path) => agent.delete(path).set('X-CSRF-Token', csrfToken),
  };
}
