import { useEffect } from 'react';
import { CheckCircle, X } from '@phosphor-icons/react';

export function ToastRegion({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(onDismiss, toast.action ? 7000 : 4500);
    return () => window.clearTimeout(timeout);
  }, [onDismiss, toast]);

  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex justify-center sm:justify-end" aria-live="polite" aria-atomic="true">
      <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl border border-stone-200 bg-stone-950 px-4 py-3 text-sm text-white shadow-[0_18px_55px_rgba(28,25,23,0.2)]" role="status">
        <CheckCircle className="shrink-0 text-emerald-300" size={20} weight="fill" />
        <p className="min-w-0 flex-1 font-medium">{toast.message}</p>
        {toast.action && (
          <button className="font-semibold text-emerald-200 underline underline-offset-4" onClick={toast.action}>
            {toast.actionLabel}
          </button>
        )}
        <button className="rounded-md p-1 text-stone-300 hover:bg-white/10 hover:text-white" onClick={onDismiss} aria-label="Dismiss notification">
          <X size={17} />
        </button>
      </div>
    </div>
  );
}
