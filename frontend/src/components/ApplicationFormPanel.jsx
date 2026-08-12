import { useEffect, useRef, useState } from 'react';
import { X } from '@phosphor-icons/react';
import { STATUS_LABELS, STATUSES } from '../constants.js';
import { useModalFocus } from '../hooks/useModalFocus.js';

const EMPTY_FORM = {
  company: '',
  position: '',
  jobUrl: '',
  status: 'wishlist',
  appliedAt: '',
  notes: '',
  nextAction: '',
  followUpAt: '',
};

function toFormValue(application) {
  if (!application) return EMPTY_FORM;
  return {
    company: application.company || '',
    position: application.position || '',
    jobUrl: application.jobUrl || '',
    status: application.status || 'wishlist',
    appliedAt: application.appliedAt || '',
    notes: application.notes || '',
    nextAction: application.nextAction || '',
    followUpAt: application.followUpAt || '',
  };
}

function validate(form) {
  const fields = {};
  if (!form.company.trim()) fields.company = 'Company is required.';
  if (!form.position.trim()) fields.position = 'Position is required.';
  if (form.jobUrl) {
    try {
      const url = new URL(form.jobUrl);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid protocol');
    } catch {
      fields.jobUrl = 'Enter a valid http or https URL.';
    }
  }
  if (form.nextAction.trim().length > 240) fields.nextAction = 'Use 240 characters or fewer.';
  return fields;
}

export function ApplicationFormPanel({ open, application, saving, serverError, onClose, onReload, onSubmit }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [fields, setFields] = useState({});
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const dialogRef = useRef(null);
  const formRef = useRef(null);
  const editing = Boolean(application);

  const dirty = JSON.stringify(form) !== JSON.stringify(toFormValue(application));

  useModalFocus({ open, containerRef: dialogRef, onClose: requestClose, closeDisabled: saving });

  useEffect(() => {
    if (open) {
      setForm(toFormValue(application));
      setFields({});
      setConfirmDiscard(false);
    }
  }, [application, open]);

  if (!open) return null;

  function requestClose() {
    if (saving) return;
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFields((current) => ({ ...current, [name]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const clientFields = validate(form);
    if (Object.keys(clientFields).length > 0) {
      setFields(clientFields);
      window.requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }

    const result = await onSubmit({
      company: form.company.trim(),
      position: form.position.trim(),
      jobUrl: form.jobUrl.trim() || null,
      status: form.status,
      appliedAt: form.appliedAt || null,
      notes: form.notes.trim() || null,
      nextAction: form.nextAction.trim() || null,
      followUpAt: form.followUpAt || null,
    });
    if (result?.fields) {
      setFields(result.fields);
      window.requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus());
    }
  }

  return (
    <div ref={dialogRef} tabIndex={-1} className="fixed inset-0 z-40 outline-none" role="dialog" aria-modal="true" aria-labelledby="application-form-title">
      <button tabIndex={-1} className="absolute inset-0 cursor-default bg-stone-950/25 backdrop-blur-[2px]" aria-label="Close application form" onClick={requestClose} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-white shadow-[-16px_0_40px_rgba(28,25,23,0.08)]">
        <header className="flex items-start justify-between border-b border-stone-200 px-5 py-5 sm:px-7">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-700">{editing ? 'Update opportunity' : 'New opportunity'}</p>
            <h2 id="application-form-title" className="mt-1 break-words text-2xl font-semibold tracking-tight text-stone-950">
              {editing ? application.company : 'Add an application'}
            </h2>
          </div>
          <button className="icon-button" onClick={requestClose} disabled={saving} aria-label="Close form"><X size={20} /></button>
        </header>

        <form ref={formRef} className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit} noValidate>
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-6 sm:px-7">
            {serverError?.message && (
              <div className="error-banner" role="alert">
                <p>{serverError.message}</p>
                {serverError.code === 'STALE_APPLICATION' && onReload && (
                  <button type="button" className="mt-2 font-semibold underline underline-offset-4" onClick={onReload}>Reload latest version</button>
                )}
              </div>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Company" name="company" value={form.company} error={fields.company} onChange={updateField} required autoFocus />
              <Field label="Position" name="position" value={form.position} error={fields.position} onChange={updateField} required />
            </div>
            <Field label="Job listing URL" name="jobUrl" type="url" value={form.jobUrl} error={fields.jobUrl} onChange={updateField} hint="Optional · include https://" />
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="field-group">
                <label htmlFor="status" className="field-label">Status</label>
                <select
                  id="status"
                  className="field-control"
                  name="status"
                  value={form.status}
                  onChange={updateField}
                  aria-invalid={Boolean(fields.status)}
                  aria-describedby={fields.status ? 'status-error' : undefined}
                >
                  {STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
                </select>
                {fields.status && <span id="status-error" className="field-error">{fields.status}</span>}
              </div>
              <Field label="Applied date" name="appliedAt" type="date" value={form.appliedAt} error={fields.appliedAt} onChange={updateField} hint="Optional" />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Next action" name="nextAction" value={form.nextAction} error={fields.nextAction} onChange={updateField} hint="Optional · 240 characters maximum" maxLength={240} />
              <Field label="Follow-up date" name="followUpAt" type="date" value={form.followUpAt} error={fields.followUpAt} onChange={updateField} hint="Optional" />
            </div>
            <label className="field-group">
              <span className="field-label">Notes</span>
              <textarea
                className="field-control min-h-32 resize-y"
                name="notes"
                value={form.notes}
                onChange={updateField}
                maxLength={5000}
                aria-invalid={Boolean(fields.notes)}
                aria-describedby={`notes-hint${fields.notes ? ' notes-error' : ''}`}
              />
              <span id="notes-hint" className="field-hint">Interview prep or context worth remembering · {form.notes.length}/5000</span>
              {fields.notes && <span id="notes-error" className="field-error">{fields.notes}</span>}
            </label>
          </div>
          <footer className="border-t border-stone-200 px-5 py-4 sm:px-7">
            {confirmDiscard && (
              <div className="mb-4 flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between" role="alert">
                <p>You have unsaved changes.</p>
                <div className="flex gap-2">
                  <button type="button" className="font-semibold underline underline-offset-4" onClick={() => setConfirmDiscard(false)}>Keep editing</button>
                  <button type="button" className="font-semibold text-rose-700 underline underline-offset-4" onClick={onClose}>Discard changes</button>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button type="button" className="secondary-button" onClick={requestClose} disabled={saving}>Cancel</button>
              <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add application'}</button>
            </div>
          </footer>
        </form>
      </aside>
    </div>
  );
}

function Field({ label, name, value, error, hint, required, autoFocus, type = 'text', maxLength, onChange }) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;
  const descriptions = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;
  return (
    <label className="field-group">
      <span className="field-label">{label}{required && <span aria-hidden="true" className="text-emerald-700"> *</span>}</span>
      <input
        className="field-control"
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        maxLength={maxLength}
        data-autofocus={autoFocus ? '' : undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={descriptions}
      />
      {hint && <span id={hintId} className="field-hint">{hint}</span>}
      {error && <span id={errorId} className="field-error">{error}</span>}
    </label>
  );
}
