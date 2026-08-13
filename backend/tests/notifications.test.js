import { describe, expect, it } from 'vitest';
import { createDueFollowUpNotifications } from '../src/repositories/notificationRepository.js';
import { api } from './helpers/auth.js';

const TODAY = '2026-08-13';

async function createDueApplication() {
  const response = await api.post('/api/applications').send({
    company: 'Reminder Co',
    position: 'Backend Intern',
    nextAction: 'Send a concise follow-up',
    followUpAt: '2026-08-13',
  });
  expect(response.status).toBe(201);
  return response.body.data;
}

describe('follow-up notifications', () => {
  it('creates an idempotent reminder and exposes unread state', async () => {
    const application = await createDueApplication();
    const firstScan = await createDueFollowUpNotifications(TODAY);
    const secondScan = await createDueFollowUpNotifications(TODAY);

    expect(firstScan.created).toBe(1);
    expect(secondScan.created).toBe(0);

    const list = await api.get('/api/notifications');
    expect(list.status).toBe(200);
    expect(list.body.meta.unread).toBe(1);
    expect(list.body.data[0]).toMatchObject({
      applicationId: application.id,
      kind: 'follow_up_due',
      readAt: null,
    });

    const read = await api.patch(`/api/notifications/${list.body.data[0].id}/read`);
    expect(read.status).toBe(204);
    expect((await api.get('/api/notifications')).body.meta.unread).toBe(0);
  });

  it('requires CSRF and supports marking every reminder read', async () => {
    await createDueApplication();
    await createDueFollowUpNotifications(TODAY);
    const list = await api.get('/api/notifications');

    const missingCsrf = await api.agent.patch(`/api/notifications/${list.body.data[0].id}/read`);
    expect(missingCsrf.status).toBe(403);

    const markAll = await api.patch('/api/notifications/read-all');
    expect(markAll.status).toBe(200);
    expect(markAll.body.data.updated).toBe(1);
  });

  it('does not notify a follow-up before the configured application date', async () => {
    await api.post('/api/applications').send({
      company: 'Tomorrow Co',
      position: 'Frontend Intern',
      followUpAt: '2026-08-14',
    });
    expect((await createDueFollowUpNotifications(TODAY)).created).toBe(0);
    expect((await api.get('/api/notifications')).body.data).toHaveLength(0);
  });
});
