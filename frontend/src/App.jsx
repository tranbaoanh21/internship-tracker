import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowClockwise, Briefcase, Sparkle } from '@phosphor-icons/react';
import {
  createApplication,
  deleteApplication,
  getApplications,
  getStats,
  updateApplication,
} from './api/applications.js';
import { ApplicationFormPanel } from './components/ApplicationFormPanel.jsx';
import { ApplicationList } from './components/ApplicationList.jsx';
import { ApplicationToolbar } from './components/ApplicationToolbar.jsx';
import { ConfirmDialog } from './components/ConfirmDialog.jsx';
import { Pagination } from './components/Pagination.jsx';
import { StatusSummary } from './components/StatusSummary.jsx';
import { EMPTY_STATS, STATUSES } from './constants.js';
import { useDebouncedValue } from './hooks/useDebouncedValue.js';

function initialFilters() {
  const params = new URLSearchParams(window.location.search);
  const pageValue = params.get('page') || '';
  const page = /^[1-9]\d*$/.test(pageValue) ? Number(pageValue) : 1;
  const status = params.get('status') || '';
  return {
    query: params.get('q') || '',
    status: STATUSES.includes(status) ? status : '',
    page: Number.isSafeInteger(page) && page <= 1_000_000 ? page : 1,
  };
}

export function App() {
  const [initial] = useState(initialFilters);
  const [query, setQuery] = useState(initial.query);
  const [status, setStatus] = useState(initial.status);
  const [page, setPage] = useState(initial.page);
  const [applications, setApplications] = useState([]);
  const [pagination, setPagination] = useState({ page: initial.page, limit: 20, total: 0, totalPages: 1 });
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [statsError, setStatsError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deletingApplication, setDeletingApplication] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const requestSequence = useRef(0);
  const debouncedQuery = useDebouncedValue(query, 300);

  const load = useCallback(async (signal) => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setLoadError('');
    setStatsError('');

    const [listResult, statsResult] = await Promise.allSettled([
      getApplications({ q: debouncedQuery, status, page, signal }),
      getStats({ signal }),
    ]);

    if (signal?.aborted || requestId !== requestSequence.current) return;

    if (listResult.status === 'fulfilled') {
      const response = listResult.value;
      const validPage = response.pagination.total === 0
        ? 1
        : Math.min(response.pagination.page, response.pagination.totalPages);
      if (validPage !== page) {
        setPage(validPage);
      } else {
        setApplications(response.data);
        setPagination(response.pagination);
      }
    } else {
      setLoadError(listResult.reason?.message || 'Applications could not be loaded.');
    }

    if (statsResult.status === 'fulfilled') {
      setStats(statsResult.value.data);
    } else {
      setStatsError(statsResult.reason?.message || 'Pipeline totals could not be loaded.');
    }
    setLoading(false);
  }, [debouncedQuery, page, status]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (status) params.set('status', status);
    if (page > 1) params.set('page', String(page));
    const search = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`);
  }, [debouncedQuery, page, status]);

  useEffect(() => {
    function restoreFilters() {
      const filters = initialFilters();
      setQuery(filters.query);
      setStatus(filters.status);
      setPage(filters.page);
    }
    window.addEventListener('popstate', restoreFilters);
    return () => window.removeEventListener('popstate', restoreFilters);
  }, []);

  function openCreate() {
    setEditing(null);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(application) {
    setEditing(application);
    setFormError(null);
    setFormOpen(true);
  }

  async function saveApplication(input) {
    setSaving(true);
    setFormError(null);
    try {
      if (editing) await updateApplication(editing.id, input);
      else await createApplication(input);
      setFormOpen(false);
      setEditing(null);
      if (page !== 1) setPage(1);
      else await load();
      return null;
    } catch (error) {
      const result = { message: error.message, fields: error.fields };
      setFormError(result);
      return result;
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteApplication(deletingApplication.id);
      setDeletingApplication(null);
      if (applications.length === 1 && page > 1) setPage(page - 1);
      else await load();
    } catch (error) {
      setDeleteError(error.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="app-canvas min-h-[100dvh] bg-[#f7f8f5] text-stone-900">
      <header className="border-b border-stone-200/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-stone-950 text-white"><Briefcase size={20} weight="fill" /></span>
            <div>
              <p className="font-semibold tracking-tight text-stone-950">Internship Tracker</p>
              <p className="text-xs text-stone-500">Keep every next step visible</p>
            </div>
          </div>
          <span className="hidden items-center gap-2 text-sm font-medium text-stone-500 sm:flex"><Sparkle size={16} className="text-emerald-700" /> Portfolio project</span>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <section className="intro-panel relative mb-10 overflow-hidden rounded-[1.25rem] border border-stone-200/80 bg-white px-5 py-7 sm:px-8 sm:py-9">
          <div className="relative z-10 max-w-3xl">
            <p className="text-sm font-semibold text-emerald-700">Focused job search</p>
            <h1 className="headline-balance mt-3 text-3xl font-semibold tracking-[-0.04em] text-stone-950 sm:text-5xl">Turn every application into a clear next step.</h1>
            <p className="copy-pretty mt-4 max-w-2xl text-base leading-7 text-stone-600">Track roles, interview progress, and follow-ups without losing context between opportunities.</p>
          </div>
        </section>

        <StatusSummary stats={stats} activeStatus={status} onSelect={(value) => { setStatus(value); setPage(1); }} />
        {statsError && (
          <div className="error-banner mt-3 flex items-center justify-between gap-4" role="status">
            <span>Pipeline totals are temporarily unavailable. {statsError}</span>
            <button aria-label="Retry pipeline totals" className="font-semibold underline underline-offset-4" onClick={() => load()}>Retry</button>
          </div>
        )}

        <section aria-labelledby="applications-heading" aria-busy={loading} className="mt-8 overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <div className="sr-only"><h2 id="applications-heading">Applications</h2></div>
          <p className="sr-only" role="status" aria-live="polite">
            {!loading && !loadError ? `${pagination.total} ${pagination.total === 1 ? 'application' : 'applications'} found.` : ''}
          </p>
          <ApplicationToolbar
            query={query}
            status={status}
            onQueryChange={(value) => { setQuery(value); setPage(1); }}
            onStatusChange={(value) => { setStatus(value); setPage(1); }}
            onCreate={openCreate}
          />

          {loadError ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center" role="alert">
              <h3 className="text-lg font-semibold text-stone-950">Applications could not be loaded</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-stone-600">{loadError}</p>
              <button aria-label="Retry applications" className="secondary-button mt-5" onClick={() => load()}><ArrowClockwise size={17} /> Retry</button>
            </div>
          ) : (
            <>
              <ApplicationList applications={applications} loading={loading} onEdit={openEdit} onDelete={(application) => { setDeleteError(''); setDeletingApplication(application); }} />
              {!loading && <Pagination pagination={pagination} onPageChange={setPage} />}
            </>
          )}
        </section>
      </main>

      <ApplicationFormPanel
        open={formOpen}
        application={editing}
        saving={saving}
        serverError={formError}
        onClose={() => { if (!saving) setFormOpen(false); }}
        onSubmit={saveApplication}
      />
      <ConfirmDialog
        application={deletingApplication}
        deleting={deleting}
        error={deleteError}
        onCancel={() => { if (!deleting) setDeletingApplication(null); }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
