import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotificationCenter } from './NotificationCenter.jsx';

function response(body, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

afterEach(() => vi.restoreAllMocks());

describe('NotificationCenter', () => {
  it('lists durable reminders and marks one read', async () => {
    const user = userEvent.setup();
    let read = false;
    vi.spyOn(globalThis, 'fetch').mockImplementation((url, options = {}) => {
      if (String(url).endsWith('/api/notifications/9/read') && options.method === 'PATCH') {
        read = true;
        return response(null, 204);
      }
      return response({
        data: [{
          id: '9',
          applicationId: '7',
          kind: 'follow_up_due',
          message: 'Follow up with Acme about Backend Intern.',
          readAt: read ? '2026-08-13 10:00:00.000' : null,
          createdAt: '2026-08-13 09:00:00.000',
        }],
        meta: { unread: read ? 0 : 1 },
      });
    });

    render(<NotificationCenter />);
    await user.click(await screen.findByLabelText('1 unread notifications'));
    await user.click(screen.getByText('Follow up with Acme about Backend Intern.'));
    expect(await screen.findByLabelText('0 unread notifications')).toBeInTheDocument();
  });
});
