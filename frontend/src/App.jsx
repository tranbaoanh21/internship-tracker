import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowClockwise, Briefcase, Sparkle } from '@phosphor-icons/react';
import {
  archiveApplication,
  createApplication,
  deleteApplication,
  getApplication,
  getApplicationHistory,
  getApplications,
  getStats,
  restoreApplication,
  updateApplication,
} from './api/applications.js';
import { ApplicationDetailPanel } from './components/ApplicationDetailPanel.jsx';
import { ApplicationFormPanel } from './components/ApplicationFormPanel.jsx';
import { ApplicationList } from './components/ApplicationList.jsx';
import { ApplicationToolbar } from './components/ApplicationToolbar.jsx';
import { ConfirmDialog } from './components/ConfirmDialog.jsx';
import { Pagination } from './components/Pagination.jsx';
import { StatusSummary } from './components/StatusSummary.jsx';
import { ToastRegion } from './components/ToastRegion.jsx';
import {
  ATTENTION_FILTERS,
  EMPTY_STATS,
  SORT_OPTIONS,
  STATUSES,
} from './constants.js';
import { useDebouncedValue } from './hooks/useDebouncedValue.js';

function initialFilters() {
  const params = new URLSearchParams(window.location.search);
  const pageValue = params.get('page') || '';
  const page = /^[1-9]\d*$/.test(pageValue) ? Number(pageValue) : 1;
  const status = params.get('status') || '';
  const attention = params.get('attention') || '';
  const sort = params.get('sort') || 'updatedAt';
  const direction = params.get('direction') || 'desc';
  const view = params.get('view') || 'active';
  const validSort = SORT_OPTIONS.some((option) => option.value === `${sort}:${direction}`);
  return {
    query: (params.get('q') || '').slice(0, 120),
    status: STATUSES.includes(status) ? status : '',
    attention: ATTENTION_FILTERS.includes(attention) ? attention : '',
    sort: validSort ? sort : 'updatedAt',
    direction: validSort ? direction : 'desc',
    view: ['active', 'archived'].includes(view) ? view : 'active',
    page: Number.isSafeInteger(page) && page <= 1_000_000 ? page : 1,
  };
}

export function App() {
  const [initial] = useState(initialFilters);
  const [query, setQuery] = useState(initial.query);
  const [status, setStatus] = useState(initial.status);
  const [attention, setAttention] = useState(initial.attention);
  const [sort, setSort] = useState(initial.sort);
  const [direction, setDirection] = useState(initial.direction);
  const [view, setView] = useState(initial.view);
  const [page, setPage] = useState(initial.page);
  const [applications, setApplications] = useState([]);
  const [pagination, setPagination] = useState({ page: initial.page, limit: 20, total: 0, totalPages: 1 });
  const [stats, setStats] = useState(EMPTY_STATS);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [statsError, setStatsError] = useState('');
  const [selected, setSelected] = useState(null);
  const [detailApplication, setDetailApplication] = useState(null);
  const [history, setHistory] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deletingApplication, setDeletingApplication] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [mutatingId, setMutatingId] = useState(null);
  const [toast, setToast] = useState(null);
  const requestSequence = useRef(0);
  const detailSequence = useRef(0);
  const hasLoaded = useRef(false);
  const debouncedQuery = useDebouncedValue(query, 300);

  const showToast = useCallback((message, action) => {
    setToast({ id: Date.now(), message, ...action });
  }, []);

  const load = useCallback(async (signal) => {
    const requestId = ++requestSequence.current;
    if (hasLoaded.current) setRefreshing(true);
    else setInitialLoading(true);
    setLoadError('');
    setStatsError('');

    const [listResult, statsResult] = await Promise.allSettled([
      getApplications({
        q: debouncedQuery,
        status,
        attention,
        sort,
        direction,
        view,
        page,
        signal,
      }),
      getStats({ q: debouncedQuery, view, signal }),
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
        hasLoaded.current = true;
      }
    } else {
      setLoadError(listResult.reason?.message || 'Applications could not be loaded.');
    }

    if (statsResult.status === 'fulfilled') {
      setStats(statsResult.value.data);
    } else {
      setStatsError(statsResult.reason?.message || 'Pipeline totals could not be loaded.');
    }
    setInitialLoading(false);
    setRefreshing(false);
  }, [attention, debouncedQuery, direction, page, sort, status, view]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (status) params.set('status', status);
    if (attention) params.set('attention', attention);
    if (sort !== 'updatedAt') params.set('sort', sort);
    if (direction !== 'desc') params.set('direction', direction);
    if (view !== 'active') params.set('view', view);
    if (page > 1) params.set('page', String(page));
    const search = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`);
  }, [attention, debouncedQuery, direction, page, sort, status, view]);

  useEffect(() => {
    function restoreFilters() {
      const filters = initialFilters();
      setQuery(filters.query);
      setStatus(filters.status);
      setAttention(filters.attention);
      setSort(filters.sort);
      setDirection(filters.direction);
      setView(filters.view);
      setPage(filters.page);
    }
    window.addEventListener('popstate', restoreFilters);
    return () => window.removeEventListener('popstate', restoreFilters);
  }, []);

  async function loadDetails(id) {
    const requestId = ++detailSequence.current;
    setDetailLoading(true);
    setDetailError('');
    try {
      const [applicationResponse, historyResponse] = await Promise.all([
        getApplication(id),
        getApplicationHistory(id),
      ]);
      if (requestId !== detailSequence.current) return;
      setDetailApplication(applicationResponse.data);
      setHistory(historyResponse.data);
    } catch (error) {
      if (requestId === detailSequence.current) setDetailError(error.message);
    } finally {
      if (requestId === detailSequence.current) setDetailLoading(false);
    }
  }

  function openDetails(application) {
    setSelected(application);
    setDetailApplication(application);
    setHistory([]);
    loadDetails(application.id);
  }

  function closeDetails() {
    detailSequence.current += 1;
    setSelected(null);
    setDetailApplication(null);
    setHistory([]);
    setDetailError('');
  }

  function openCreate() {
    setEditing(null);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(application) {
    closeDetails();
    setEditing(application);
    setFormError(null);
    setFormOpen(true);
  }

  async function reloadEditing() {
    try {
      const response = await getApplication(editing.id);
      setEditing(response.data);
      setFormError(null);
    } catch (error) {
      setFormError({ message: error.message, code: error.code });
    }
  }

  async function saveApplication(input) {
    setSaving(true);
    setFormError(null);
    try {
      const response = editing
        ? await updateApplication(editing.id, input, editing.version)
        : await createApplication(input);
      setFormOpen(false);
      setEditing(null);
      showToast(editing ? `${response.data.company} updated.` : `${response.data.company} added.`);
      if (page !== 1) setPage(1);
      else await load();
      return null;
    } catch (error) {
      const result = { message: error.message, fields: error.fields, code: error.code };
      setFormError(result);
      return result;
    } finally {
      setSaving(false);
    }
  }

  async function archiveRecord(application) {
    setMutatingId(application.id);
    try {
      const response = await archiveApplication(application.id, application.version);
      closeDetails();
      await load();
      showToast(`${application.company} archived.`, {
        actionLabel: 'Undo',
        action: async () => {
          setToast(null);
          try {
            await restoreApplication(response.data.id, response.data.version);
            showToast(`${application.company} restored.`);
            await load();
          } catch (error) {
            showToast(error.message);
          }
        },
      });
    } catch (error) {
      showToast(error.code === 'STALE_APPLICATION' ? 'This application changed. Refresh and try again.' : error.message);
      await load();
    } finally {
      setMutatingId(null);
    }
  }

  async function restoreRecord(application) {
    setMutatingId(application.id);
    try {
      await restoreApplication(application.id, application.version);
      closeDetails();
      showToast(`${application.company} restored.`);
      await load();
    } catch (error) {
      showToast(error.code === 'STALE_APPLICATION' ? 'This application changed. Refresh and try again.' : error.message);
      await load();
    } finally {
      setMutatingId(null);
    }
  }

  function requestPermanentDelete(application) {
    closeDetails();
    setDeleteError('');
    setDeletingApplication(application);
  }

  async function confirmDelete() {
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteApplication(deletingApplication.id, deletingApplication.version);
      const company = deletingApplication.company;
      setDeletingApplication(null);
      showToast(`${company} permanently deleted.`);
      if (applications.length === 1 && page > 1) setPage(page - 1);
      else await load();
    } catch (error) {
      setDeleteError(error.message);
    } finally {
      setDeleting(false);
    }
  }

  function clearFilters() {
    setQuery('');
    setStatus('');
    setAttention('');
    setPage(1);
  }

  const hasFilters = Boolean(debouncedQuery || status || attention);
  const detail = detailApplication || selected;

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

      <main id="main-content" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
        <section className="intro-panel relative mb-8 overflow-hidden rounded-[1.25rem] border border-stone-200/80 bg-white px-5 py-6 sm:px-8 sm:py-7">
          <div className="relative z-10 max-w-3xl">
            <p className="text-sm font-semibold text-emerald-700">Focused job search</p>
            <h1 className="headline-balance mt-2 text-3xl font-semibold tracking-[-0.04em] text-stone-950 sm:text-4xl">Turn every application into a clear next step.</h1>
            <p className="copy-pretty mt-3 max-w-2xl text-sm leading-6 text-stone-600 sm:text-base">Track roles, interview progress, and follow-ups without losing context between opportunities.</p>
          </div>
        </section>

        <StatusSummary stats={stats} activeStatus={status} view={view} onSelect={(value) => { setStatus(value); setPage(1); }} />
        {statsError && (
          <div className="error-banner mt-3 flex items-center justify-between gap-4" role="status">
            <span>Pipeline totals are temporarily unavailable. {statsError}</span>
            <button aria-label="Retry pipeline totals" className="font-semibold underline underline-offset-4" onClick={() => load()}>Retry</button>
          </div>
        )}

        <section aria-labelledby="applications-heading" aria-busy={initialLoading || refreshing} className="mt-7 overflow-hidden rounded-2xl border border-stone-200 bg-white">
          <div className="sr-only"><h2 id="applications-heading">Applications</h2></div>
          <p className="sr-only" role="status" aria-live="polite">
            {!initialLoading && !loadError ? `${pagination.total} ${pagination.total === 1 ? 'application' : 'applications'} found.` : ''}
          </p>
          <ApplicationToolbar
            query={query}
            status={status}
            attention={attention}
            sort={sort}
            direction={direction}
            view={view}
            hasFilters={hasFilters}
            onQueryChange={(value) => { setQuery(value); setPage(1); }}
            onStatusChange={(value) => { setStatus(value); setPage(1); }}
            onAttentionChange={(value) => { setAttention(value); setPage(1); }}
            onSortChange={(nextSort, nextDirection) => { setSort(nextSort); setDirection(nextDirection); setPage(1); }}
            onViewChange={(value) => { setView(value); setPage(1); }}
            onClearFilters={clearFilters}
            onCreate={openCreate}
          />

          {refreshing && <div className="border-b border-stone-100 px-4 py-2 text-xs font-semibold text-emerald-800" role="status">Updating results…</div>}
          {loadError && applications.length > 0 && (
            <div className="error-banner m-4 flex items-center justify-between gap-4" role="alert">
              <span>Results could not be updated. {loadError}</span>
              <button className="font-semibold underline underline-offset-4" onClick={() => load()}>Retry</button>
            </div>
          )}

          {loadError && applications.length === 0 && !initialLoading ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center" role="alert">
              <h3 className="text-lg font-semibold text-stone-950">Applications could not be loaded</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-stone-600">{loadError}</p>
              <button aria-label="Retry applications" className="secondary-button mt-5" onClick={() => load()}><ArrowClockwise size={17} /> Retry</button>
            </div>
          ) : (
            <>
              <ApplicationList
                applications={applications}
                initialLoading={initialLoading}
                view={view}
                hasFilters={hasFilters}
                onView={openDetails}
                onArchive={archiveRecord}
                onRestore={restoreRecord}
                onDelete={requestPermanentDelete}
                onClearFilters={clearFilters}
                onCreate={openCreate}
              />
              {!initialLoading && <Pagination pagination={pagination} onPageChange={setPage} />}
            </>
          )}
        </section>
      </main>

      <ApplicationDetailPanel
        application={detail}
        history={history}
        loading={detailLoading}
        error={detailError}
        busy={mutatingId === detail?.id}
        onClose={closeDetails}
        onRetry={() => loadDetails(detail.id)}
        onEdit={openEdit}
        onArchive={archiveRecord}
        onRestore={restoreRecord}
        onDelete={requestPermanentDelete}
      />
      <ApplicationFormPanel
        open={formOpen}
        application={editing}
        saving={saving}
        serverError={formError}
        onClose={() => { if (!saving) { setFormOpen(false); setEditing(null); } }}
        onReload={reloadEditing}
        onSubmit={saveApplication}
      />
      <ConfirmDialog
        application={deletingApplication}
        deleting={deleting}
        error={deleteError}
        onCancel={() => { if (!deleting) setDeletingApplication(null); }}
        onConfirm={confirmDelete}
      />
      <ToastRegion toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
