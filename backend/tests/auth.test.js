import argon2 from 'argon2';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { getPool } from '../src/config/db.js';
import { api } from './helpers/auth.js';

describe('owner authentication', () => {
  it('keeps internal metrics off the public /api namespace and tolerates malformed cookies', async () => {
    const metrics = await request(app).get('/metrics');
    expect(metrics.status).toBe(200);
    expect(metrics.text).toContain('tracker_http_request_duration_seconds');

    const session = await request(app).get('/api/auth/session').set('Cookie', 'tracker_session=%E0%A4%A');
    expect(session.status).toBe(200);
    expect(session.body.data).toEqual({ authenticated: false });
  });

  it('requires authentication and CSRF for private mutations', async () => {
    const anonymous = await request(app).get('/api/applications');
    expect(anonymous.status).toBe(401);
    expect(anonymous.body.error.code).toBe('AUTHENTICATION_REQUIRED');

    const missingCsrf = await request.agent(app)
      .post('/api/auth/login')
      .send({ email: 'owner@example.com', password: 'correct-horse-battery-staple' });
    const cookie = missingCsrf.headers['set-cookie'];
    const mutation = await request(app)
      .post('/api/applications')
      .set('Cookie', cookie)
      .send({ company: 'Private Co', position: 'Intern' });
    expect(mutation.status).toBe(403);
    expect(mutation.body.error.code).toBe('CSRF_TOKEN_INVALID');
  });

  it('creates a secure server-side session and logs out', async () => {
    const agent = request.agent(app);
    const invalid = await agent.post('/api/auth/login').send({
      email: 'owner@example.com',
      password: 'incorrect-password-value',
    });
    expect(invalid.status).toBe(401);
    expect(invalid.body.error.code).toBe('INVALID_CREDENTIALS');

    const login = await agent.post('/api/auth/login').send({
      email: 'OWNER@example.com',
      password: 'correct-horse-battery-staple',
    });
    expect(login.status).toBe(200);
    expect(login.body.data).toMatchObject({ authenticated: true, user: { role: 'owner' } });
    expect(login.body.data).toHaveProperty('csrfToken');
    expect(login.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(login.headers['set-cookie'][0]).toContain('SameSite=Strict');

    const session = await agent.get('/api/auth/session');
    expect(session.body.data).toMatchObject({ authenticated: true, user: { email: 'owner@example.com' } });
    expect(session.body.data.csrfToken).toBe(login.body.data.csrfToken);

    const logout = await agent
      .post('/api/auth/logout')
      .set('X-CSRF-Token', login.body.data.csrfToken);
    expect(logout.status).toBe(204);
    expect((await agent.get('/api/auth/session')).body.data).toEqual({ authenticated: false });
  });

  it('scopes every application query to the authenticated owner', async () => {
    await api.post('/api/applications').send({ company: 'Owner One', position: 'Intern' });
    const passwordHash = await argon2.hash('another-secure-owner-password', { type: argon2.argon2id });
    const [result] = await getPool().execute(
      "INSERT INTO users (email, password_hash, role) VALUES ('second@example.com', ?, 'owner')",
      [passwordHash],
    );
    try {
      const second = request.agent(app);
      const login = await second.post('/api/auth/login').send({
        email: 'second@example.com',
        password: 'another-secure-owner-password',
      });
      const list = await second.get('/api/applications');
      expect(login.status).toBe(200);
      expect(list.body.data).toHaveLength(0);
    } finally {
      await getPool().execute('DELETE FROM users WHERE id = ?', [result.insertId]);
    }
  });
});
