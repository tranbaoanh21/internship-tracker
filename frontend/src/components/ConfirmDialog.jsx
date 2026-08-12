import { WarningCircle, X } from '@phosphor-icons/react';
import { useEffect, useRef } from 'react';
import { useModalFocus } from '../hooks/useModalFocus.js';

export function ConfirmDialog({ application, deleting, error, onCancel, onConfirm }) {
  const dialogRef = useRef(null);
  useModalFocus({ open: Boolean(application), containerRef: dialogRef, onClose: onCancel, closeDisabled: deleting });
  useEffect(() => {
    if (deleting) dialogRef.current?.focus();
  }, [deleting]);
  if (!application) return null;

  return (
    <div ref={dialogRef} tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description">
      <button tabIndex={-1} className="absolute inset-0 cursor-default bg-stone-950/30 backdrop-blur-[2px]" onClick={onCancel} aria-label="Cancel delete" />
      <div className="relative w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-[0_24px_80px_rgba(28,25,23,0.16)]">
        <div className="flex items-start justify-between gap-4">
          <span className="flex size-10 items-center justify-center rounded-xl bg-rose-50 text-rose-700"><WarningCircle size={22} weight="duotone" /></span>
          <button className="icon-button" onClick={onCancel} disabled={deleting} aria-label="Close delete confirmation"><X size={18} /></button>
        </div>
        <h2 id="delete-title" className="mt-5 text-xl font-semibold tracking-tight text-stone-950">Delete this application?</h2>
        <p id="delete-description" className="mt-2 text-sm leading-6 text-stone-600">
          The {application.position} application at {application.company} will be permanently removed.
        </p>
        {error && <div className="error-banner mt-4" role="alert">{error}</div>}
        <div className="mt-6 flex justify-end gap-3">
          <button data-autofocus className="secondary-button" onClick={onCancel} disabled={deleting}>Keep application</button>
          <button className="danger-button" onClick={onConfirm} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</button>
        </div>
      </div>
    </div>
  );
}
