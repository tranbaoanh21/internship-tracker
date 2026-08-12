import { CaretLeft, CaretRight } from '@phosphor-icons/react';

export function Pagination({ pagination, onPageChange }) {
  const { page, total, totalPages } = pagination;
  if (total === 0) return null;

  return (
    <nav aria-label="Application pages" className="flex items-center justify-between border-t border-stone-200 px-4 py-3">
      <p className="text-sm text-stone-600">
        Page <span className="font-semibold text-stone-900">{page}</span> of {totalPages} · {total} results
      </p>
      <div className="flex gap-2">
        <button className="secondary-button px-3" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
          <CaretLeft size={17} />
        </button>
        <button className="secondary-button px-3" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
          <CaretRight size={17} />
        </button>
      </div>
    </nav>
  );
}
