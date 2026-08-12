import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';

const applicationInput = {
  company: 'Saigon Technology',
  position: 'Full-stack Intern',
  jobUrl: 'https://saigontechnology.com/careers',
  status: 'applied',
  appliedAt: '2026-08-08',
  notes: 'Practice explaining the API data flow.',
};

async function createApplication(overrides = {}) {
  const response = await request(app)
    .post('/api/applications')
    .send({ ...applicationInput, ...overrides });
  expect(response.status).toBe(201);
  return response.body.data;
}

describe('health API', () => {
  it('reports that the API and database are healthy', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', database: 'up' });
  });
});

describe('applications API', () => {
  it('creates and reads an application using camelCase JSON', async () => {
    const created = await createApplication();
    expect(created).toMatchObject(applicationInput);
    expect(created.id).toEqual(expect.any(String));

    const response = await request(app).get(`/api/applications/${created.id}`);
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject(applicationInput);
  });

  it('defaults optional fields and status on create', async () => {
    const response = await request(app)
      .post('/api/applications')
      .send({ company: 'Bosch Vietnam', position: 'Software Intern' });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      status: 'wishlist',
      jobUrl: null,
      appliedAt: null,
      notes: null,
    });
  });

  it('returns field errors for invalid create input', async () => {
    const response = await request(app).post('/api/applications').send({
      company: '',
      position: '',
      jobUrl: 'javascript:alert(1)',
      status: 'pending',
      appliedAt: '2026-02-30',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.fields).toMatchObject({
      company: expect.any(String),
      position: expect.any(String),
      jobUrl: expect.any(String),
      status: expect.any(String),
      appliedAt: expect.any(String),
    });
  });

  it('lists with search, status filter, and pagination', async () => {
    await createApplication({ company: 'KMS Technology', status: 'interview' });
    await createApplication({ company: 'VNG Corporation', status: 'wishlist' });
    await createApplication({ company: 'VNG Cloud', status: 'interview' });

    const response = await request(app)
      .get('/api/applications')
      .query({ q: 'vng', status: 'interview', page: 1, limit: 1 });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].company).toBe('VNG Cloud');
    expect(response.body.pagination).toEqual({ page: 1, limit: 1, total: 1, totalPages: 1 });
  });

  it('returns all status buckets and a total from stats', async () => {
    await createApplication({ status: 'interview' });
    await createApplication({ company: 'Grab Vietnam', status: 'interview' });

    const response = await request(app).get('/api/applications/stats');
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      wishlist: 0,
      applied: 0,
      interview: 2,
      offer: 0,
      rejected: 0,
      total: 2,
    });
  });

  it('patches only supplied fields', async () => {
    const created = await createApplication();
    const response = await request(app)
      .patch(`/api/applications/${created.id}`)
      .send({ status: 'interview', notes: 'Technical round scheduled.' });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      company: applicationInput.company,
      position: applicationInput.position,
      status: 'interview',
      notes: 'Technical round scheduled.',
    });
  });

  it('rejects an empty patch', async () => {
    const created = await createApplication();
    const response = await request(app).patch(`/api/applications/${created.id}`).send({});
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('identifies unsupported fields in a patch', async () => {
    const created = await createApplication();
    const response = await request(app)
      .patch(`/api/applications/${created.id}`)
      .send({ companyName: 'Typo' });

    expect(response.status).toBe(400);
    expect(response.body.error.fields.companyName).toBe('This field is not supported.');
  });

  it('deletes an application', async () => {
    const created = await createApplication();
    expect((await request(app).delete(`/api/applications/${created.id}`)).status).toBe(204);
    expect((await request(app).get(`/api/applications/${created.id}`)).status).toBe(404);
  });

  it('returns consistent errors for invalid and missing ids', async () => {
    const invalid = await request(app).get('/api/applications/not-a-number');
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('INVALID_ID');

    const missing = await request(app).get('/api/applications/999999');
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('APPLICATION_NOT_FOUND');
  });

  it('rejects invalid query pagination and status', async () => {
    const response = await request(app)
      .get('/api/applications')
      .query({ page: 0, limit: 101, status: 'unknown' });

    expect(response.status).toBe(400);
    expect(response.body.error.fields).toMatchObject({
      page: expect.any(String),
      limit: expect.any(String),
      status: expect.any(String),
    });
  });

  it.each(['1e3', '0x10', '9007199254740992', '1000001'])(
    'rejects non-canonical or excessive page value %s',
    async (page) => {
      const response = await request(app).get('/api/applications').query({ page });
      expect(response.status).toBe(400);
      expect(response.body.error.fields.page).toEqual(expect.any(String));
    },
  );

  it.each(['1e3', '0x10', '-1', '18446744073709551616'])(
    'rejects non-canonical id %s',
    async (id) => {
      const response = await request(app).get(`/api/applications/${id}`);
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_ID');
    },
  );

  it('rejects unknown request fields', async () => {
    const response = await request(app)
      .post('/api/applications')
      .send({ ...applicationInput, companyName: 'Typo' });
    expect(response.status).toBe(400);
    expect(response.body.error.fields.companyName).toBe('This field is not supported.');
  });

  it('treats LIKE metacharacters as literal search text', async () => {
    await createApplication({ company: '100% Remote Studio' });
    await createApplication({ company: 'Regular Company' });
    const response = await request(app).get('/api/applications').query({ q: '%' });
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].company).toBe('100% Remote Studio');
  });

  it('maps malformed and oversized JSON to client errors', async () => {
    const malformed = await request(app)
      .post('/api/applications')
      .set('Content-Type', 'application/json')
      .send('{"company":');
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.code).toBe('INVALID_JSON');

    const oversized = await request(app)
      .post('/api/applications')
      .send({ company: 'A', position: 'B', notes: 'x'.repeat(40_000) });
    expect(oversized.status).toBe(413);
    expect(oversized.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});
