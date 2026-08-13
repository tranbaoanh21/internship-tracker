import { describe, expect, it } from 'vitest';
import { todayInApplicationTimezone } from '../src/utils/date.js';
import { api } from './helpers/auth.js';

const applicationInput = {
  company: 'Saigon Technology',
  position: 'Full-stack Intern',
  jobUrl: 'https://saigontechnology.com/careers',
  status: 'applied',
  appliedAt: '2026-08-08',
  notes: 'Practice explaining the API data flow.',
  nextAction: 'Send a concise follow-up email.',
  followUpAt: '2026-08-20',
};

async function createApplication(overrides = {}) {
  const response = await api
    .post('/api/applications')
    .send({ ...applicationInput, ...overrides });
  expect(response.status).toBe(201);
  return response.body.data;
}

function dateFromToday(days) {
  const date = new Date(`${todayInApplicationTimezone()}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

describe('health API', () => {
  it('reports that the API and database are healthy', async () => {
    const response = await api.get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', database: 'up' });
  });
});

describe('API documentation', () => {
  it('serves the OpenAPI contract and Swagger UI', async () => {
    const contract = await api.get('/api/openapi.json');
    expect(contract.status).toBe(200);
    expect(contract.body.openapi).toBe('3.1.0');
    expect(contract.body.paths).toHaveProperty('/applications/{id}');

    const docs = await api.get('/api/docs/');
    expect(docs.status).toBe(200);
    expect(docs.type).toMatch(/html/);
    expect(docs.text).toContain('<title>Internship Tracker API Docs</title>');
  });
});

describe('applications API', () => {
  it('creates and reads an application using camelCase JSON', async () => {
    const created = await createApplication();
    expect(created).toMatchObject(applicationInput);
    expect(created.id).toEqual(expect.any(String));
    expect(created.version).toBe(1);
    expect(created.archivedAt).toBeNull();

    const response = await api.get(`/api/applications/${created.id}`);
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject(applicationInput);
  });

  it('defaults optional fields and status on create', async () => {
    const response = await api
      .post('/api/applications')
      .send({ company: 'Bosch Vietnam', position: 'Software Intern' });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      status: 'wishlist',
      jobUrl: null,
      appliedAt: null,
      notes: null,
      nextAction: null,
      followUpAt: null,
    });
  });

  it('returns field errors for invalid create input', async () => {
    const response = await api.post('/api/applications').send({
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

    const response = await api
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

    const response = await api.get('/api/applications/stats');
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
    const response = await api
      .patch(`/api/applications/${created.id}`)
      .set('If-Match', `"${created.version}"`)
      .send({ status: 'interview', notes: 'Technical round scheduled.' });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      company: applicationInput.company,
      position: applicationInput.position,
      status: 'interview',
      notes: 'Technical round scheduled.',
      version: 2,
    });
  });

  it('rejects an empty patch', async () => {
    const created = await createApplication();
    const response = await api
      .patch(`/api/applications/${created.id}`)
      .set('If-Match', `"${created.version}"`)
      .send({});
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('identifies unsupported fields in a patch', async () => {
    const created = await createApplication();
    const response = await api
      .patch(`/api/applications/${created.id}`)
      .set('If-Match', `"${created.version}"`)
      .send({ companyName: 'Typo' });

    expect(response.status).toBe(400);
    expect(response.body.error.fields.companyName).toBe('This field is not supported.');
  });

  it('requires archive before permanent deletion', async () => {
    const created = await createApplication();
    const activeDelete = await api
      .delete(`/api/applications/${created.id}`)
      .set('If-Match', `"${created.version}"`);
    expect(activeDelete.status).toBe(409);
    expect(activeDelete.body.error.code).toBe('ARCHIVE_REQUIRED');

    const archived = await api
      .post(`/api/applications/${created.id}/archive`)
      .set('If-Match', `"${created.version}"`);
    expect(archived.status).toBe(200);
    expect(archived.body.data.archivedAt).toEqual(expect.any(String));

    expect((await api
      .delete(`/api/applications/${created.id}`)
      .set('If-Match', `"${archived.body.data.version}"`)).status).toBe(204);
    expect((await api.get(`/api/applications/${created.id}`)).status).toBe(404);
  });

  it('records real status changes in history without no-op noise', async () => {
    const created = await createApplication({ status: 'applied' });
    const initialHistory = await api.get(`/api/applications/${created.id}/history`);
    expect(initialHistory.status).toBe(200);
    expect(initialHistory.body.data).toHaveLength(1);
    expect(initialHistory.body.data[0]).toMatchObject({
      fromStatus: null,
      toStatus: 'applied',
    });

    const changed = await api
      .patch(`/api/applications/${created.id}`)
      .set('If-Match', `"${created.version}"`)
      .send({ status: 'interview' });
    const noOp = await api
      .patch(`/api/applications/${created.id}`)
      .set('If-Match', `"${changed.body.data.version}"`)
      .send({ status: 'interview' });
    expect(noOp.status).toBe(200);

    const history = await api.get(`/api/applications/${created.id}/history`);
    expect(history.body.data).toHaveLength(2);
    expect(history.body.data[0]).toMatchObject({
      fromStatus: 'applied',
      toStatus: 'interview',
    });
  });

  it('archives, filters, and restores an application without losing data', async () => {
    const created = await createApplication({ company: 'Archive Labs' });
    const archived = await api
      .post(`/api/applications/${created.id}/archive`)
      .set('If-Match', `"${created.version}"`);
    expect(archived.status).toBe(200);

    const activeList = await api.get('/api/applications');
    expect(activeList.body.data).toHaveLength(0);
    expect((await api.get('/api/applications/stats')).body.data.total).toBe(0);

    const archivedList = await api.get('/api/applications').query({ view: 'archived' });
    expect(archivedList.body.data[0]).toMatchObject({ company: 'Archive Labs' });
    expect((await api.get('/api/applications/stats').query({ view: 'archived' })).body.data.total).toBe(1);

    const restored = await api
      .post(`/api/applications/${created.id}/restore`)
      .set('If-Match', `"${archived.body.data.version}"`);
    expect(restored.status).toBe(200);
    expect(restored.body.data).toMatchObject({
      company: 'Archive Labs',
      archivedAt: null,
      version: 3,
    });
  });

  it('rejects stale mutations and missing preconditions', async () => {
    const created = await createApplication();
    const missingHeader = await api
      .patch(`/api/applications/${created.id}`)
      .send({ notes: 'No version supplied.' });
    expect(missingHeader.status).toBe(428);
    expect(missingHeader.body.error.code).toBe('PRECONDITION_REQUIRED');

    const updated = await api
      .patch(`/api/applications/${created.id}`)
      .set('If-Match', `"${created.version}"`)
      .send({ notes: 'Fresh update.' });
    expect(updated.status).toBe(200);

    const stale = await api
      .patch(`/api/applications/${created.id}`)
      .set('If-Match', `"${created.version}"`)
      .send({ notes: 'Stale overwrite.' });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('STALE_APPLICATION');
    expect((await api.get(`/api/applications/${created.id}`)).body.data.notes).toBe('Fresh update.');
  });

  it('combines attention, search, status, sorting, and contextual stats', async () => {
    await createApplication({
      company: 'Due Soon Labs',
      status: 'interview',
      followUpAt: dateFromToday(-1),
    });
    const second = await createApplication({
      company: 'Due Soon Cloud',
      status: 'applied',
      followUpAt: dateFromToday(1),
    });
    await api
      .post(`/api/applications/${second.id}/archive`)
      .set('If-Match', `"${second.version}"`);

    const list = await api.get('/api/applications').query({
      q: 'Due Soon',
      status: 'interview',
      attention: 'overdue',
      sort: 'followUpAt',
      direction: 'asc',
    });
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].company).toBe('Due Soon Labs');

    const activeStats = await api.get('/api/applications/stats').query({ q: 'Due Soon' });
    expect(activeStats.body.data).toMatchObject({ interview: 1, applied: 0, total: 1 });
    const archivedStats = await api
      .get('/api/applications/stats')
      .query({ q: 'Due Soon', view: 'archived' });
    expect(archivedStats.body.data).toMatchObject({ interview: 0, applied: 1, total: 1 });
  });


  it('returns consistent errors for invalid and missing ids', async () => {
    const invalid = await api.get('/api/applications/not-a-number');
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('INVALID_ID');

    const missing = await api.get('/api/applications/999999');
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('APPLICATION_NOT_FOUND');
  });

  it('rejects invalid query pagination and status', async () => {
    const response = await api
      .get('/api/applications')
      .query({ page: 0, limit: 101, status: 'unknown' });

    expect(response.status).toBe(400);
    expect(response.body.error.fields).toMatchObject({
      page: expect.any(String),
      limit: expect.any(String),
      status: expect.any(String),
    });
  });

  it('rejects a search query longer than the documented limit', async () => {
    const response = await api
      .get('/api/applications')
      .query({ q: 'x'.repeat(121) });

    expect(response.status).toBe(400);
    expect(response.body.error.fields.q).toBe('Search must use 120 characters or fewer.');
  });

  it.each(['1e3', '0x10', '9007199254740992', '1000001'])(
    'rejects non-canonical or excessive page value %s',
    async (page) => {
      const response = await api.get('/api/applications').query({ page });
      expect(response.status).toBe(400);
      expect(response.body.error.fields.page).toEqual(expect.any(String));
    },
  );

  it.each(['1e3', '0x10', '-1', '18446744073709551616'])(
    'rejects non-canonical id %s',
    async (id) => {
      const response = await api.get(`/api/applications/${id}`);
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_ID');
    },
  );

  it('rejects unknown request fields', async () => {
    const response = await api
      .post('/api/applications')
      .send({ ...applicationInput, companyName: 'Typo' });
    expect(response.status).toBe(400);
    expect(response.body.error.fields.companyName).toBe('This field is not supported.');
  });

  it('treats LIKE metacharacters as literal search text', async () => {
    await createApplication({ company: '100% Remote Studio' });
    await createApplication({ company: 'Regular Company' });
    const response = await api.get('/api/applications').query({ q: '%' });
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].company).toBe('100% Remote Studio');
  });

  it('maps malformed and oversized JSON to client errors', async () => {
    const malformed = await api
      .post('/api/applications')
      .set('Content-Type', 'application/json')
      .send('{"company":');
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.code).toBe('INVALID_JSON');

    const oversized = await api
      .post('/api/applications')
      .send({ company: 'A', position: 'B', notes: 'x'.repeat(40_000) });
    expect(oversized.status).toBe(413);
    expect(oversized.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});
