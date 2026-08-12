import { ArrowSquareOut, Briefcase, PencilSimple, Trash } from '@phosphor-icons/react';
import { StatusBadge } from './StatusBadge.jsx';

function formatDate(value) {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}

function Actions({ application, onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-end gap-1">
      {application.jobUrl && (
        <a className="icon-button" href={application.jobUrl} target="_blank" rel="noreferrer" aria-label={`Open job listing for ${application.company}`}>
          <ArrowSquareOut size={18} />
        </a>
      )}
      <button className="icon-button" onClick={() => onEdit(application)} aria-label={`Edit ${application.company} application`}>
        <PencilSimple size={18} />
      </button>
      <button className="icon-button text-rose-700 hover:bg-rose-50" onClick={() => onDelete(application)} aria-label={`Delete ${application.company} application`}>
        <Trash size={18} />
      </button>
    </div>
  );
}

export function ApplicationList({ applications, loading, onEdit, onDelete }) {
  if (loading) {
    return (
      <div className="space-y-3 p-4" aria-label="Loading applications" role="status">
        {[1, 2, 3, 4].map((item) => <div key={item} className="h-16 animate-pulse rounded-lg bg-stone-100" />)}
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-stone-100 text-stone-600">
          <Briefcase size={24} weight="duotone" />
        </span>
        <h3 className="mt-4 text-lg font-semibold text-stone-950">No applications found</h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-stone-600">
          Add your first opportunity or change the current search and status filters.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wider text-stone-500">
            <tr>
              <th className="px-5 py-3">Company and role</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Applied</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {applications.map((application) => (
              <tr key={application.id} className="transition-colors hover:bg-stone-50/70">
                <td className="px-5 py-4">
                  <p className="font-semibold text-stone-950">{application.company}</p>
                  <p className="mt-1 text-stone-600">{application.position}</p>
                </td>
                <td className="px-5 py-4"><StatusBadge status={application.status} /></td>
                <td className="px-5 py-4 text-stone-600">{formatDate(application.appliedAt)}</td>
                <td className="px-5 py-4"><Actions application={application} onEdit={onEdit} onDelete={onDelete} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-stone-100 md:hidden">
        {applications.map((application) => (
          <article key={application.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="break-words font-semibold text-stone-950">{application.company}</h3>
                <p className="mt-1 break-words text-sm text-stone-600">{application.position}</p>
              </div>
              <StatusBadge status={application.status} />
            </div>
            <p className="mt-4 text-xs font-medium text-stone-500">Applied {formatDate(application.appliedAt)}</p>
            <div className="mt-3 border-t border-stone-100 pt-2"><Actions application={application} onEdit={onEdit} onDelete={onDelete} /></div>
          </article>
        ))}
      </div>
    </>
  );
}
