import {
  Archive,
  ArrowCounterClockwise,
  ArrowSquareOut,
  Briefcase,
  Eye,
  FunnelSimpleX,
  Trash,
} from '@phosphor-icons/react';
import { StatusBadge } from './StatusBadge.jsx';

function formatDate(value) {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' })
    .format(new Date(`${value}T00:00:00Z`));
}

function todayLocal() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function FollowUp({ value }) {
  if (!value) return <span className="text-stone-400">Not scheduled</span>;
  const today = todayLocal();
  const tone = value < today
    ? 'bg-rose-50 text-rose-700'
    : value === today
      ? 'bg-amber-50 text-amber-800'
      : 'bg-stone-100 text-stone-700';
  return <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${tone}`}>{formatDate(value)}</span>;
}

function Actions({ application, view, onView, onArchive, onRestore, onDelete }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button className="icon-button" title="View details" onClick={() => onView(application)} aria-label={`View ${application.company} application`}>
        <Eye size={18} />
      </button>
      {application.jobUrl && (
        <a className="icon-button" title="Open job listing" href={application.jobUrl} target="_blank" rel="noreferrer" aria-label={`Open job listing for ${application.company}`}>
          <ArrowSquareOut size={18} />
        </a>
      )}
      {view === 'active' ? (
        <button className="icon-button" title="Archive" onClick={() => onArchive(application)} aria-label={`Archive ${application.company} application`}>
          <Archive size={18} />
        </button>
      ) : (
        <>
          <button className="icon-button" title="Restore" onClick={() => onRestore(application)} aria-label={`Restore ${application.company} application`}>
            <ArrowCounterClockwise size={18} />
          </button>
          <button className="icon-button text-rose-700 hover:bg-rose-50" title="Delete permanently" onClick={() => onDelete(application)} aria-label={`Delete ${application.company} permanently`}>
            <Trash size={18} />
          </button>
        </>
      )}
    </div>
  );
}

export function ApplicationList({
  applications,
  initialLoading,
  view,
  hasFilters,
  onView,
  onArchive,
  onRestore,
  onDelete,
  onClearFilters,
  onCreate,
}) {
  if (initialLoading) {
    return (
      <div className="space-y-3 p-4" aria-label="Loading applications" role="status">
        {[1, 2, 3, 4].map((item) => <div key={item} className="h-20 animate-pulse rounded-lg bg-stone-100" />)}
      </div>
    );
  }

  if (applications.length === 0) {
    const archived = view === 'archived';
    return (
      <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-stone-100 text-stone-600">
          {hasFilters ? <FunnelSimpleX size={24} weight="duotone" /> : <Briefcase size={24} weight="duotone" />}
        </span>
        <h3 className="mt-4 text-lg font-semibold text-stone-950">
          {hasFilters ? 'No matching applications' : archived ? 'Archive is empty' : 'Track your first application'}
        </h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-stone-600">
          {hasFilters
            ? 'Clear one or more filters to widen the result set.'
            : archived
              ? 'Applications you archive will remain recoverable here.'
              : 'Add an opportunity and record the next action while it is still fresh.'}
        </p>
        {hasFilters ? (
          <button className="secondary-button mt-5" onClick={onClearFilters}>Clear filters</button>
        ) : !archived && (
          <button className="primary-button mt-5" onClick={onCreate}>Add application</button>
        )}
      </div>
    );
  }

  const actionProps = { view, onView, onArchive, onRestore, onDelete };

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wider text-stone-500">
            <tr>
              <th className="px-5 py-3">Company and role</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Next action</th>
              <th className="px-5 py-3">Follow-up</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {applications.map((application) => (
              <tr key={application.id} className="transition-colors hover:bg-stone-50/70">
                <td className="px-5 py-4">
                  <button className="text-left" onClick={() => onView(application)}>
                    <span className="block font-semibold text-stone-950 hover:text-emerald-800">{application.company}</span>
                    <span className="mt-1 block text-stone-600">{application.position}</span>
                  </button>
                </td>
                <td className="px-5 py-4"><StatusBadge status={application.status} /></td>
                <td className="max-w-64 px-5 py-4 text-stone-600"><span className="line-clamp-2">{application.nextAction || 'Not recorded'}</span></td>
                <td className="px-5 py-4"><FollowUp value={application.followUpAt} /></td>
                <td className="px-5 py-4"><Actions application={application} {...actionProps} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-stone-100 md:hidden">
        {applications.map((application) => (
          <article key={application.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <button className="min-w-0 text-left" onClick={() => onView(application)}>
                <h3 className="break-words font-semibold text-stone-950">{application.company}</h3>
                <p className="mt-1 break-words text-sm text-stone-600">{application.position}</p>
              </button>
              <StatusBadge status={application.status} />
            </div>
            <div className="mt-4 grid gap-3 text-sm">
              <div><p className="text-xs font-semibold text-stone-500">Next action</p><p className="mt-1 text-stone-700">{application.nextAction || 'Not recorded'}</p></div>
              <div><p className="text-xs font-semibold text-stone-500">Follow-up</p><p className="mt-1"><FollowUp value={application.followUpAt} /></p></div>
            </div>
            <div className="mt-4 border-t border-stone-100 pt-2"><Actions application={application} {...actionProps} /></div>
          </article>
        ))}
      </div>
    </>
  );
}
