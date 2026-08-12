import { MagnifyingGlass, Plus } from '@phosphor-icons/react';
import { STATUS_LABELS, STATUSES } from '../constants.js';

export function ApplicationToolbar({ query, status, onQueryChange, onStatusChange, onCreate }) {
  return (
    <div className="flex flex-col gap-3 border-b border-stone-200 p-4 sm:flex-row sm:items-center">
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
      <label>
        <span className="sr-only">Filter by status</span>
        <select className="field-control w-full sm:w-44" value={status} onChange={(event) => onStatusChange(event.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((item) => <option key={item} value={item}>{STATUS_LABELS[item]}</option>)}
        </select>
      </label>
      <button className="primary-button" onClick={onCreate}>
        <Plus size={18} weight="bold" />
        Add application
      </button>
    </div>
  );
}
