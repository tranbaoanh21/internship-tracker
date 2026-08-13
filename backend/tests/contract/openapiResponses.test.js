import Ajv2020 from 'ajv/dist/2020.js';
import SwaggerParser from '@apidevtools/swagger-parser';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { openApiDocument } from '../../src/routes/docsRoutes.js';
import { app } from '../../src/app.js';
import { createDueFollowUpNotifications } from '../../src/repositories/notificationRepository.js';
import { api } from '../helpers/auth.js';

const applicationInput = {
  company: 'OpenAPI Contract Co.',
  position: 'Platform Intern',
  jobUrl: 'https://example.com/internships/platform',
  status: 'applied',
  appliedAt: '2026-08-12',
  notes: 'Created by the runtime contract test.',
};

const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
  validateFormats: false,
});

let dereferencedContract;

beforeAll(async () => {
  dereferencedContract = await SwaggerParser.dereference(structuredClone(openApiDocument));
});

function expectResponseToMatchContract(response, method, path) {
  const operation = dereferencedContract.paths[path]?.[method.toLowerCase()];
  expect(operation, `${method} ${path} must be documented`).toBeDefined();

  const documentedResponse = operation.responses[String(response.status)];
  expect(
    documentedResponse,
    `${method} ${path} must document response ${response.status}`,
  ).toBeDefined();

  const schema = documentedResponse.content?.['application/json']?.schema;
  if (!schema) {
    expect(response.text).toBe('');
    return;
  }

  const validate = ajv.compile(schema);
  const valid = validate(response.body);
  expect(
    valid,
    `${method} ${path} ${response.status} did not match OpenAPI: ${JSON.stringify(validate.errors)}; body: ${JSON.stringify(response.body)}`,
  ).toBe(true);
}

describe('live API responses', () => {
  it('match the documented schemas for every public operation and representative errors', async () => {
    const health = await api.get('/api/health');
    expectResponseToMatchContract(health, 'GET', '/health');

    const anonymousSession = await request(app).get('/api/auth/session');
    expectResponseToMatchContract(anonymousSession, 'GET', '/auth/session');
    const authAgent = request.agent(app);
    const login = await authAgent.post('/api/auth/login').send({
      email: 'owner@example.com',
      password: 'correct-horse-battery-staple',
    });
    expectResponseToMatchContract(login, 'POST', '/auth/login');
    const logout = await authAgent.post('/api/auth/logout').set('X-CSRF-Token', login.body.data.csrfToken);
    expectResponseToMatchContract(logout, 'POST', '/auth/logout');

    const created = await api.post('/api/applications').send(applicationInput);
    expectResponseToMatchContract(created, 'POST', '/applications');
    const id = created.body.data.id;

    const list = await api.get('/api/applications').query({ q: 'OpenAPI', limit: 10 });
    expectResponseToMatchContract(list, 'GET', '/applications');

    const stats = await api.get('/api/applications/stats');
    expectResponseToMatchContract(stats, 'GET', '/applications/stats');

    const found = await api.get(`/api/applications/${id}`);
    expectResponseToMatchContract(found, 'GET', '/applications/{id}');

    const updated = await api
      .patch(`/api/applications/${id}`)
      .set('If-Match', `"${created.body.data.version}"`)
      .send({ status: 'interview' });
    expectResponseToMatchContract(updated, 'PATCH', '/applications/{id}');

    const history = await api.get(`/api/applications/${id}/history`);
    expectResponseToMatchContract(history, 'GET', '/applications/{id}/history');

    const missingPrecondition = await api
      .patch(`/api/applications/${id}`)
      .send({ notes: 'Missing If-Match.' });
    expectResponseToMatchContract(missingPrecondition, 'PATCH', '/applications/{id}');

    const stale = await api
      .patch(`/api/applications/${id}`)
      .set('If-Match', `"${created.body.data.version}"`)
      .send({ notes: 'Stale write.' });
    expectResponseToMatchContract(stale, 'PATCH', '/applications/{id}');

    const invalidQuery = await api.get('/api/applications').query({ limit: 101 });
    expectResponseToMatchContract(invalidQuery, 'GET', '/applications');

    const missing = await api.get('/api/applications/999999999');
    expectResponseToMatchContract(missing, 'GET', '/applications/{id}');

    const oversized = await api
      .post('/api/applications')
      .send({ company: 'A', position: 'B', notes: 'x'.repeat(40_000) });
    expectResponseToMatchContract(oversized, 'POST', '/applications');

    const archived = await api
      .post(`/api/applications/${id}/archive`)
      .set('If-Match', `"${updated.body.data.version}"`);
    expectResponseToMatchContract(archived, 'POST', '/applications/{id}/archive');

    const restored = await api
      .post(`/api/applications/${id}/restore`)
      .set('If-Match', `"${archived.body.data.version}"`);
    expectResponseToMatchContract(restored, 'POST', '/applications/{id}/restore');

    const archivedAgain = await api
      .post(`/api/applications/${id}/archive`)
      .set('If-Match', `"${restored.body.data.version}"`);
    expectResponseToMatchContract(archivedAgain, 'POST', '/applications/{id}/archive');

    const deleted = await api
      .delete(`/api/applications/${id}`)
      .set('If-Match', `"${archivedAgain.body.data.version}"`);
    expectResponseToMatchContract(deleted, 'DELETE', '/applications/{id}');

    await api.post('/api/applications').send({
      company: 'Contract Reminder Co.',
      position: 'Backend Intern',
      followUpAt: '2026-08-13',
    });
    await createDueFollowUpNotifications('2026-08-13');
    const notifications = await api.get('/api/notifications');
    expectResponseToMatchContract(notifications, 'GET', '/notifications');
    const notificationId = notifications.body.data[0].id;
    const readOne = await api.patch(`/api/notifications/${notificationId}/read`);
    expectResponseToMatchContract(readOne, 'PATCH', '/notifications/{id}/read');
    const readAll = await api.patch('/api/notifications/read-all');
    expectResponseToMatchContract(readAll, 'PATCH', '/notifications/read-all');
  });
});
