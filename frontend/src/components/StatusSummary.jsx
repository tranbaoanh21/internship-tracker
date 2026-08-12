import {
  BookmarkSimple,
  CheckCircle,
  ClockCountdown,
  PaperPlaneTilt,
  XCircle,
} from '@phosphor-icons/react';
import { STATUS_LABELS, STATUSES } from '../constants.js';

const ICONS = {
  wishlist: BookmarkSimple,
  applied: PaperPlaneTilt,
  interview: ClockCountdown,
  offer: CheckCircle,
  rejected: XCircle,
};

export function StatusSummary({ stats, activeStatus, view, onSelect }) {
  return (
    <section aria-labelledby="pipeline-heading">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-700">Application pipeline</p>
          <h2 id="pipeline-heading" className="mt-1 text-xl font-semibold tracking-tight text-stone-950">
            {stats.total} {view === 'archived' ? 'archived' : 'active'} {stats.total === 1 ? 'application' : 'applications'} tracked
          </h2>
        </div>
        {activeStatus && (
          <button className="text-sm font-semibold text-stone-600 underline-offset-4 hover:underline" onClick={() => onSelect('')}>
            Clear filter
          </button>
        )}
      </div>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 lg:overflow-visible">
        {STATUSES.map((status) => {
          const Icon = ICONS[status];
          const active = activeStatus === status;
          return (
            <button
              key={status}
              aria-pressed={active}
              onClick={() => onSelect(active ? '' : status)}
              className={`group min-w-36 flex-1 snap-start rounded-xl border p-4 text-left transition duration-200 active:scale-[0.98] lg:min-w-0 ${
                active
                  ? 'border-emerald-500 bg-emerald-50/70'
                  : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50'
              }`}
            >
              <span className="flex items-center justify-between">
                <Icon size={20} weight="duotone" className={active ? 'text-emerald-700' : 'text-stone-500'} />
                <span className="font-mono text-2xl font-semibold tabular-nums text-stone-950">{stats[status]}</span>
              </span>
              <span className="mt-4 block text-sm font-medium text-stone-600">{STATUS_LABELS[status]}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
