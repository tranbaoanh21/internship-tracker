import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApplicationDetailPanel } from './ApplicationDetailPanel.jsx';

const application = {
  id: '7',
  company: 'MoMo',
  position: 'Frontend Intern',
  jobUrl: 'https://example.com/job',
  status: 'interview',
  appliedAt: '2026-08-01',
  notes: 'Prepare React examples.',
  nextAction: 'Send the take-home exercise',
  followUpAt: '2026-08-15',
  createdAt: '2026-08-01 10:00:00.000',
  updatedAt: '2026-08-12 10:00:00.000',
  archivedAt: null,
  version: 2,
};

const history = [{
  id: '2',
  applicationId: '7',
  fromStatus: 'applied',
  toStatus: 'interview',
  changedAt: '2026-08-12 10:00:00.000',
}];

function renderPanel(overrides = {}) {
  const props = {
    application,
    history,
    loading: false,
    error: '',
    busy: false,
    onClose: vi.fn(),
    onRetry: vi.fn(),
    onEdit: vi.fn(),
    onArchive: vi.fn(),
    onRestore: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
  const result = render(<ApplicationDetailPanel {...props} />);
  return { props, ...result };
}

describe('ApplicationDetailPanel', () => {
  it('shows next action, notes, dates, and status history without entering edit mode', () => {
    renderPanel();
    expect(screen.getByRole('heading', { name: 'MoMo' })).toBeInTheDocument();
    expect(screen.getByText('Send the take-home exercise')).toBeInTheDocument();
    expect(screen.getByText('Prepare React examples.')).toBeInTheDocument();
    expect(screen.getByText('Applied → Interview')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  it('exposes archive for active records and restore/delete for archived records', async () => {
    const user = userEvent.setup();
    const active = renderPanel();
    await user.click(screen.getByRole('button', { name: 'Archive' }));
    expect(active.props.onArchive).toHaveBeenCalledWith(application);

    active.rerender(
      <ApplicationDetailPanel
        {...active.props}
        application={{ ...application, archivedAt: '2026-08-13 10:00:00.000' }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Restore' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete permanently' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });
});
