import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog.jsx';

const application = {
  company: 'KMS Technology',
  position: 'Node.js Intern',
};

describe('ConfirmDialog', () => {
  it('traps focus and restores it to the trigger when closed', async () => {
    const user = userEvent.setup();
    const trigger = document.createElement('button');
    trigger.textContent = 'Delete application';
    document.body.append(trigger);
    trigger.focus();

    const { rerender } = render(
      <ConfirmDialog application={application} deleting={false} error="" onCancel={() => {}} onConfirm={() => {}} />,
    );

    const keepButton = screen.getByRole('button', { name: 'Keep archived' });
    const deleteButton = screen.getByRole('button', { name: 'Delete permanently' });
    const closeButton = screen.getByRole('button', { name: 'Close delete confirmation' });
    expect(keepButton).toHaveFocus();

    closeButton.focus();
    await user.tab({ shift: true });
    expect(deleteButton).toHaveFocus();
    await user.tab();
    expect(closeButton).toHaveFocus();

    rerender(<ConfirmDialog application={null} deleting={false} error="" onCancel={() => {}} onConfirm={() => {}} />);
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it('keeps focus inside while deletion disables the dialog controls', () => {
    const { rerender } = render(
      <ConfirmDialog application={application} deleting={false} error="" onCancel={() => {}} onConfirm={() => {}} />,
    );
    const keepButton = screen.getByRole('button', { name: 'Keep archived' });
    expect(keepButton).toHaveFocus();

    rerender(<ConfirmDialog application={application} deleting error="" onCancel={() => {}} onConfirm={() => {}} />);
    expect(screen.getByRole('alertdialog')).toHaveFocus();
  });

  it('does not close with Escape while deleting', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ConfirmDialog application={application} deleting error="" onCancel={onCancel} onConfirm={() => {}} />);

    await user.keyboard('{Escape}');
    expect(onCancel).not.toHaveBeenCalled();
  });
});
