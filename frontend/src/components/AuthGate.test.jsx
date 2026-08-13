import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthGate } from './AuthGate.jsx';

function response(body, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

afterEach(() => vi.restoreAllMocks());

describe('AuthGate', () => {
  it('keeps private content hidden until the owner signs in', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockImplementation((url, options = {}) => {
      if (String(url).endsWith('/api/auth/session')) {
        return response({ data: { authenticated: false } });
      }
      if (String(url).endsWith('/api/auth/login') && options.method === 'POST') {
        return response({
          data: {
            authenticated: true,
            csrfToken: 'x'.repeat(43),
            user: { id: '1', email: 'owner@example.com', role: 'owner' },
          },
        });
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(<AuthGate>{({ user: owner }) => <h1>Welcome {owner.email}</h1>}</AuthGate>);
    expect(await screen.findByRole('heading', { name: 'Sign in to your pipeline' })).toBeInTheDocument();
    expect(screen.queryByText(/Welcome/)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Email'), 'owner@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct-horse-battery-staple');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('heading', { name: 'Welcome owner@example.com' })).toBeInTheDocument();
  });
});
