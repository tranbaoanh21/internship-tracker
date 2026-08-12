import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App.jsx';

const sampleApplication = {
  id: 1,
  company: 'KMS Technology',
  position: 'Node.js Intern',
  jobUrl: 'https://careers.kms-technology.com',
  status: 'interview',
  appliedAt: '2026-08-01',
  notes: null,
  nextAction: 'Send portfolio link',
  followUpAt: '2026-08-15',
  createdAt: '2026-08-01 10:00:00.000',
  updatedAt: '2026-08-01 10:00:00.000',
  archivedAt: null,
  version: 1,
};

function response(body, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState({}, '', '/');
});

describe('App', () => {
  it('renders applications and pipeline stats returned by the API', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      if (String(url).includes('/stats')) {
        return response({ data: { wishlist: 0, applied: 0, interview: 1, offer: 0, rejected: 0, total: 1 } });
      }
      return response({
        data: [sampleApplication],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
    });

    render(<App />);

    expect(await screen.findAllByText('KMS Technology')).not.toHaveLength(0);
    expect(screen.getByText('1 active application tracked')).toBeInTheDocument();
    expect(screen.getAllByText('Node.js Intern')).not.toHaveLength(0);
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('1 application found.');
  });

  it('shows a helpful empty state', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      if (String(url).includes('/stats')) {
        return response({ data: { wishlist: 0, applied: 0, interview: 0, offer: 0, rejected: 0, total: 0 } });
      }
      return response({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } });
    });

    render(<App />);
    expect(await screen.findByText('Track your first application')).toBeInTheDocument();
    expect(screen.getByText('0 applications found.')).toBeInTheDocument();
  });

  it('shows an API error and can retry', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    render(<App />);

    expect(await screen.findByText('Applications could not be loaded')).toBeInTheDocument();
    fetchMock.mockImplementation((url) => {
      if (String(url).includes('/stats')) {
        return response({ data: { wishlist: 0, applied: 0, interview: 0, offer: 0, rejected: 0, total: 0 } });
      }
      return response({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } });
    });

    await user.click(screen.getByRole('button', { name: 'Retry applications' }));
    await waitFor(() => expect(screen.getByText('Track your first application')).toBeInTheDocument());
  });

  it('does not let a stale request overwrite newer search results', async () => {
    const user = userEvent.setup();
    let resolveStale;
    const staleResponse = new Promise((resolve) => { resolveStale = resolve; });
    let listRequests = 0;

    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      const address = String(url);
      if (address.includes('/stats')) {
        return response({ data: { wishlist: 0, applied: 0, interview: 0, offer: 0, rejected: 0, total: 0 } });
      }
      listRequests += 1;
      if (!new URL(address, window.location.origin).searchParams.get('q')) return staleResponse;
      return response({
        data: [{ ...sampleApplication, id: 2, company: 'VNG Cloud' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
    });

    render(<App />);
    await user.type(screen.getByRole('searchbox', { name: 'Search company or position' }), 'VNG');
    await waitFor(() => expect(listRequests).toBeGreaterThanOrEqual(2), { timeout: 1500 });
    expect(await screen.findAllByText('VNG Cloud')).not.toHaveLength(0);

    resolveStale({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        data: [sampleApplication],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }),
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText('KMS Technology')).not.toBeInTheDocument();
  });
});
