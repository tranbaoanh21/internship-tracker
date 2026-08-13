import { Archive, MagnifyingGlass, Plus, Tray } from '@phosphor-icons/react';
import {
  ATTENTION_FILTERS,
  ATTENTION_LABELS,
  SORT_OPTIONS,
  STATUS_LABELS,
  STATUSES,
} from '../constants.js';

export function ApplicationToolbar({
  query,
  status,
  attention,
  sort,
  direction,
  view,
  hasFilters,
  onQueryChange,
  onStatusChange,
  onAttentionChange,
  onSortChange,
  onViewChange,
  onClearFilters,
  onCreate,
}) {
  return (
    <div className="border-b border-stone-200 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search company or position</span>
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <input
            type="search"
            maxLength={120}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search company or position"
            className="field-control w-full pl-10"
          />
        </label>
        {view === 'active' && (
          <button className="primary-button" onClick={onCreate}>
            <Plus size={18} weight="bold" />
            Add application
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-3 sm:grid-cols-3">
          <Filter label="Status">
            <select className="field-control w-full sm:min-w-40" value={status} onChange={(event) => onStatusChange(event.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((item) => <option key={item} value={item}>{STATUS_LABELS[item]}</option>)}
            </select>
          </Filter>
          <Filter label="Attention">
            <select className="field-control w-full sm:min-w-40" value={attention} onChange={(event) => onAttentionChange(event.target.value)}>
              <option value="">Any follow-up</option>
              {ATTENTION_FILTERS.map((item) => <option key={item} value={item}>{ATTENTION_LABELS[item]}</option>)}
            </select>
          </Filter>
          <Filter label="Sort">
            <select className="field-control w-full sm:min-w-44" value={`${sort}:${direction}`} onChange={(event) => onSortChange(...event.target.value.split(':'))}>
              {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Filter>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasFilters && <button className="text-sm font-semibold text-stone-600 underline-offset-4 hover:underline" onClick={onClearFilters}>Clear filters</button>}
          <div className="inline-flex rounded-lg border border-stone-300 bg-stone-50 p-1" aria-label="Application view">
            <button aria-pressed={view === 'active'} className={`inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold ${view === 'active' ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-500'}`} onClick={() => onViewChange('active')}><Tray size={16} /> Active</button>
            <button aria-pressed={view === 'archived'} className={`inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold ${view === 'archived' ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-500'}`} onClick={() => onViewChange('archived')}><Archive size={16} /> Archived</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Filter({ label, children }) {
  return (
    <label className="field-group gap-1">
      <span className="text-xs font-semibold text-stone-500">{label}</span>
      {children}
    </label>
  );
}
