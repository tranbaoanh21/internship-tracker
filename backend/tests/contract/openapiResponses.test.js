import Ajv2020 from 'ajv/dist/2020.js';
import SwaggerParser from '@apidevtools/swagger-parser';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';
import { openApiDocument } from '../../src/routes/docsRoutes.js';

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
    `${method} ${path} ${response.status} did not match OpenAPI: ${JSON.stringify(validate.errors)}`,
  ).toBe(true);
}

describe('live API responses', () => {
  it('match the documented schemas for every public operation and representative errors', async () => {
    const health = await request(app).get('/api/health');
    expectResponseToMatchContract(health, 'GET', '/health');

    const created = await request(app).post('/api/applications').send(applicationInput);
    expectResponseToMatchContract(created, 'POST', '/applications');
    const id = created.body.data.id;

    const list = await request(app).get('/api/applications').query({ q: 'OpenAPI', limit: 10 });
    expectResponseToMatchContract(list, 'GET', '/applications');

    const stats = await request(app).get('/api/applications/stats');
    expectResponseToMatchContract(stats, 'GET', '/applications/stats');

    const found = await request(app).get(`/api/applications/${id}`);
    expectResponseToMatchContract(found, 'GET', '/applications/{id}');

    const updated = await request(app)
      .patch(`/api/applications/${id}`)
      .set('If-Match', `"${created.body.data.version}"`)
      .send({ status: 'interview' });
    expectResponseToMatchContract(updated, 'PATCH', '/applications/{id}');

    const history = await request(app).get(`/api/applications/${id}/history`);
    expectResponseToMatchContract(history, 'GET', '/applications/{id}/history');

    const missingPrecondition = await request(app)
      .patch(`/api/applications/${id}`)
      .send({ notes: 'Missing If-Match.' });
    expectResponseToMatchContract(missingPrecondition, 'PATCH', '/applications/{id}');

    const stale = await request(app)
      .patch(`/api/applications/${id}`)
      .set('If-Match', `"${created.body.data.version}"`)
      .send({ notes: 'Stale write.' });
    expectResponseToMatchContract(stale, 'PATCH', '/applications/{id}');

    const invalidQuery = await request(app).get('/api/applications').query({ limit: 101 });
    expectResponseToMatchContract(invalidQuery, 'GET', '/applications');

    const missing = await request(app).get('/api/applications/999999999');
    expectResponseToMatchContract(missing, 'GET', '/applications/{id}');

    const oversized = await request(app)
      .post('/api/applications')
      .send({ company: 'A', position: 'B', notes: 'x'.repeat(40_000) });
    expectResponseToMatchContract(oversized, 'POST', '/applications');

    const archived = await request(app)
      .post(`/api/applications/${id}/archive`)
      .set('If-Match', `"${updated.body.data.version}"`);
    expectResponseToMatchContract(archived, 'POST', '/applications/{id}/archive');

    const restored = await request(app)
      .post(`/api/applications/${id}/restore`)
      .set('If-Match', `"${archived.body.data.version}"`);
    expectResponseToMatchContract(restored, 'POST', '/applications/{id}/restore');

    const archivedAgain = await request(app)
      .post(`/api/applications/${id}/archive`)
      .set('If-Match', `"${restored.body.data.version}"`);
    expectResponseToMatchContract(archivedAgain, 'POST', '/applications/{id}/archive');

    const deleted = await request(app)
      .delete(`/api/applications/${id}`)
      .set('If-Match', `"${archivedAgain.body.data.version}"`);
    expectResponseToMatchContract(deleted, 'DELETE', '/applications/{id}');
  });
});
