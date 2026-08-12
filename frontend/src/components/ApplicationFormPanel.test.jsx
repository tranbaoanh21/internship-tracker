import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApplicationFormPanel } from './ApplicationFormPanel.jsx';

describe('ApplicationFormPanel', () => {
  it('shows client field errors before submitting', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <ApplicationFormPanel
        open
        application={null}
        saving={false}
        serverError={null}
        onClose={() => {}}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Add application' }));
    expect(screen.getByText('Company is required.')).toBeInTheDocument();
    expect(screen.getByText('Position is required.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('normalizes optional empty fields and submits valid input', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(null);
    render(
      <ApplicationFormPanel
        open
        application={null}
        saving={false}
        serverError={null}
        onClose={() => {}}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText(/Company/), '  VNG Cloud  ');
    await user.type(screen.getByLabelText(/Position/), 'Backend Intern');
    await user.click(screen.getByRole('button', { name: 'Add application' }));

    expect(onSubmit).toHaveBeenCalledWith({
      company: 'VNG Cloud',
      position: 'Backend Intern',
      jobUrl: null,
      status: 'wishlist',
      appliedAt: null,
      notes: null,
    });
  });

  it('loads an existing application for editing', () => {
    render(
      <ApplicationFormPanel
        open
        application={{
          id: 7,
          company: 'MoMo',
          position: 'Frontend Intern',
          jobUrl: null,
          status: 'interview',
          appliedAt: '2026-08-01',
          notes: 'Prepare React examples.',
        }}
        saving={false}
        serverError={null}
        onClose={() => {}}
        onSubmit={() => {}}
      />,
    );

    expect(screen.getByDisplayValue('MoMo')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveValue('interview');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('moves focus into the modal and closes with Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <ApplicationFormPanel
        open
        application={null}
        saving={false}
        serverError={null}
        onClose={onClose}
        onSubmit={() => {}}
      />,
    );

    expect(screen.getByLabelText(/Company/)).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not reset focus or close while saving', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = render(
      <ApplicationFormPanel
        open
        application={null}
        saving={false}
        serverError={null}
        onClose={onClose}
        onSubmit={() => {}}
      />,
    );
    const position = screen.getByLabelText(/Position/);
    position.focus();

    rerender(
      <ApplicationFormPanel
        open
        application={null}
        saving
        serverError={null}
        onClose={onClose}
        onSubmit={() => {}}
      />,
    );
    expect(position).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('associates a server status error with the status field', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({
      fields: { status: 'Choose a supported status.' },
    });
    render(
      <ApplicationFormPanel
        open
        application={null}
        saving={false}
        serverError={null}
        onClose={() => {}}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText(/Company/), 'KMS Technology');
    await user.type(screen.getByLabelText(/Position/), 'Node.js Intern');
    await user.click(screen.getByRole('button', { name: 'Add application' }));

    const status = screen.getByRole('combobox', { name: 'Status' });
    expect(status).toHaveAttribute('aria-invalid', 'true');
    expect(status).toHaveAccessibleDescription('Choose a supported status.');
  });
});
