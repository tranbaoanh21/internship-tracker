import { STATUS_LABELS } from '../constants.js';

const STATUS_CLASSES = {
  wishlist: 'bg-stone-100 text-stone-700',
  applied: 'bg-sky-50 text-sky-700',
  interview: 'bg-amber-50 text-amber-800',
  offer: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-700',
};

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${STATUS_CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
