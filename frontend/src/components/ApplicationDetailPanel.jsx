import {
  Archive,
  ArrowCounterClockwise,
  ArrowSquareOut,
  CalendarBlank,
  ClockCounterClockwise,
  PencilSimple,
  Trash,
  X,
} from '@phosphor-icons/react';
import { useRef } from 'react';
import { STATUS_LABELS } from '../constants.js';
import { useModalFocus } from '../hooks/useModalFocus.js';
import { StatusBadge } from './StatusBadge.jsx';

function formatDate(value) {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' })
    .format(new Date(`${value}T00:00:00Z`));
}

function formatTimestamp(value) {
  if (!value) return 'Not recorded';
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' })
    .format(new Date(normalized));
}

export function ApplicationDetailPanel({
  application,
  history,
  loading,
  error,
  busy,
  onClose,
  onRetry,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}) {
  const panelRef = useRef(null);
  useModalFocus({
    open: Boolean(application),
    containerRef: panelRef,
    onClose,
    closeDisabled: busy,
  });
  if (!application) return null;

  const archived = Boolean(application.archivedAt);

  return (
    <div ref={panelRef} tabIndex={-1} className="fixed inset-0 z-40 outline-none" role="dialog" aria-modal="true" aria-labelledby="application-detail-title">
      <button tabIndex={-1} className="absolute inset-0 cursor-default bg-stone-950/25 backdrop-blur-[2px]" aria-label="Close application details" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-white shadow-[-16px_0_40px_rgba(28,25,23,0.08)]">
        <header className="border-b border-stone-200 px-5 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={application.status} />
                {archived && <span className="rounded-md bg-stone-200 px-2 py-1 text-xs font-semibold text-stone-700">Archived</span>}
              </div>
              <h2 id="application-detail-title" className="mt-3 break-words text-2xl font-semibold tracking-tight text-stone-950">{application.company}</h2>
              <p className="mt-1 break-words text-sm text-stone-600">{application.position}</p>
            </div>
            <button className="icon-button shrink-0" onClick={onClose} disabled={busy} aria-label="Close details"><X size={20} /></button>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {!archived && <button data-autofocus className="secondary-button" onClick={() => onEdit(application)} disabled={busy}><PencilSimple size={17} /> Edit</button>}
            {application.jobUrl && <a className="secondary-button" href={application.jobUrl} target="_blank" rel="noreferrer"><ArrowSquareOut size={17} /> Job listing</a>}
            {!archived ? (
              <button className="secondary-button" onClick={() => onArchive(application)} disabled={busy}><Archive size={17} /> Archive</button>
            ) : (
              <>
                <button data-autofocus className="secondary-button" onClick={() => onRestore(application)} disabled={busy}><ArrowCounterClockwise size={17} /> Restore</button>
                <button className="secondary-button text-rose-700" onClick={() => onDelete(application)} disabled={busy}><Trash size={17} /> Delete permanently</button>
              </>
            )}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
          {error && (
            <div className="error-banner mb-5" role="alert">
              <p>{error}</p>
              <button className="mt-2 font-semibold underline underline-offset-4" onClick={onRetry}>Retry details</button>
            </div>
          )}
          {loading ? (
            <div className="space-y-4" aria-label="Loading application details" role="status">
              {[1, 2, 3, 4].map((item) => <div key={item} className="h-16 animate-pulse rounded-lg bg-stone-100" />)}
            </div>
          ) : (
            <div className="space-y-8">
              <section aria-labelledby="next-action-title" className="rounded-xl bg-emerald-50/70 p-4">
                <div className="flex items-center gap-2 text-emerald-800"><CalendarBlank size={18} /><h3 id="next-action-title" className="font-semibold">Next action</h3></div>
                <p className="mt-3 text-sm leading-6 text-stone-800">{application.nextAction || 'No next action recorded.'}</p>
                <p className="mt-2 text-xs font-semibold text-emerald-800">Follow up {formatDate(application.followUpAt)}</p>
              </section>

              <section aria-labelledby="application-context-title">
                <h3 id="application-context-title" className="text-sm font-semibold text-stone-950">Application context</h3>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Detail label="Applied" value={formatDate(application.appliedAt)} />
                  <Detail label="Last updated" value={formatTimestamp(application.updatedAt)} />
                  <Detail label="Created" value={formatTimestamp(application.createdAt)} />
                  <Detail label="Version" value={String(application.version)} />
                </dl>
                <div className="mt-5">
                  <p className="text-xs font-semibold text-stone-500">Notes</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">{application.notes || 'No notes recorded.'}</p>
                </div>
              </section>

              <section aria-labelledby="status-history-title">
                <div className="flex items-center gap-2"><ClockCounterClockwise className="text-stone-500" size={18} /><h3 id="status-history-title" className="text-sm font-semibold text-stone-950">Status history</h3></div>
                {history.length === 0 ? (
                  <p className="mt-3 text-sm text-stone-500">No status changes recorded.</p>
                ) : (
                  <ol className="mt-4 space-y-4 border-l border-stone-200 pl-5">
                    {history.map((entry) => (
                      <li key={entry.id} className="relative">
                        <span className="absolute -left-[1.45rem] top-1 size-2 rounded-full bg-emerald-600 ring-4 ring-white" />
                        <p className="text-sm font-medium text-stone-800">
                          {entry.fromStatus ? `${STATUS_LABELS[entry.fromStatus]} → ` : 'Started as '}
                          {STATUS_LABELS[entry.toStatus]}
                        </p>
                        <p className="mt-1 text-xs text-stone-500">{formatTimestamp(entry.changedAt)}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-stone-500">{label}</dt>
      <dd className="mt-1 text-sm text-stone-800">{value}</dd>
    </div>
  );
}
