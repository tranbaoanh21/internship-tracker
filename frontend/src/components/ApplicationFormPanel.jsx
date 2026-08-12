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
  return fields;
}

export function ApplicationFormPanel({ open, application, saving, serverError, onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [fields, setFields] = useState({});
  const dialogRef = useRef(null);
  const formRef = useRef(null);
  const editing = Boolean(application);

  useModalFocus({ open, containerRef: dialogRef, onClose, closeDisabled: saving });

  useEffect(() => {
    if (open) {
      setForm(toFormValue(application));
      setFields({});
    }
  }, [application, open]);

  if (!open) return null;

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
    });
    if (result?.fields) {
      setFields(result.fields);
      window.requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus());
    }
  }

  return (
    <div ref={dialogRef} tabIndex={-1} className="fixed inset-0 z-40 outline-none" role="dialog" aria-modal="true" aria-labelledby="application-form-title">
      <button tabIndex={-1} className="absolute inset-0 cursor-default bg-stone-950/25 backdrop-blur-[2px]" aria-label="Close application form" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-white shadow-[-16px_0_40px_rgba(28,25,23,0.08)]">
        <header className="flex items-start justify-between border-b border-stone-200 px-5 py-5 sm:px-7">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-700">{editing ? 'Update opportunity' : 'New opportunity'}</p>
            <h2 id="application-form-title" className="mt-1 break-words text-2xl font-semibold tracking-tight text-stone-950">
              {editing ? application.company : 'Add an application'}
            </h2>
          </div>
          <button className="icon-button" onClick={onClose} disabled={saving} aria-label="Close form"><X size={20} /></button>
        </header>

        <form ref={formRef} className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit} noValidate>
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-6 sm:px-7">
            {serverError?.message && <div className="error-banner" role="alert">{serverError.message}</div>}
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
              <span id="notes-hint" className="field-hint">Interview prep, follow-up date, or context worth remembering.</span>
              {fields.notes && <span id="notes-error" className="field-error">{fields.notes}</span>}
            </label>
          </div>
          <footer className="flex justify-end gap-3 border-t border-stone-200 px-5 py-4 sm:px-7">
            <button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add application'}</button>
          </footer>
        </form>
      </aside>
    </div>
  );
}

function Field({ label, name, value, error, hint, required, autoFocus, type = 'text', onChange }) {
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
        data-autofocus={autoFocus ? '' : undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={descriptions}
      />
      {hint && <span id={hintId} className="field-hint">{hint}</span>}
      {error && <span id={errorId} className="field-error">{error}</span>}
    </label>
  );
}
