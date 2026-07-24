import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer.jsx';
import PatientToolbar from '../../components/patientManagement/PatientToolbar.jsx';
import PatientTable from '../../components/patientManagement/PatientTable.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import { activatePatient, deactivatePatient, getPatients, searchPatients } from '../../api/patientsApi.js';
import { getLookupCategory } from '../../api/lookupsApi.js';
import { parseApiError } from '../../api/parseApiError.js';
import { useNotification } from '../../components/notifications/NotificationContext.jsx';

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_SORT_BY = 'createdDate';
const DEFAULT_SORT_DIRECTION = 'desc';
const SEARCH_DEBOUNCE_MS = 400;

function PatientListPage() {
  const { showSuccess, showError, showWarning } = useNotification();
  const [searchParams, setSearchParams] = useSearchParams();

  // Every piece of list state is seeded from the URL on first render, so a page
  // refresh (or a Back navigation from Details/Edit) restores exactly what the user
  // had before, per this step's URL State requirement.
  const [page, setPage] = useState(() => Number(searchParams.get('page')) || 1);
  const [pageSize, setPageSize] = useState(() => Number(searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE);
  const [sortBy, setSortBy] = useState(() => searchParams.get('sortBy') || DEFAULT_SORT_BY);
  const [sortDirection, setSortDirection] = useState(() => searchParams.get('sortDirection') || DEFAULT_SORT_DIRECTION);

  // searchInput updates on every keystroke (for a responsive text field); debouncedSearchTerm
  // only updates 300-500ms after typing stops, and is what actually drives the API call and
  // the URL - matches UserListPage's identical debounce pattern, both seeded from the URL.
  const [searchInput, setSearchInput] = useState(() => searchParams.get('search') || '');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(() => searchParams.get('search') || '');
  const [genderFilter, setGenderFilter] = useState(() => searchParams.get('gender') || '');
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || '');

  const [genderOptions, setGenderOptions] = useState([]);

  const [patients, setPatients] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [confirmAction, setConfirmAction] = useState(null); // { type: 'activate'|'deactivate', patient }
  const [isActionProcessing, setIsActionProcessing] = useState(false);

  // Simple in-memory cache keyed by the exact query - avoids re-hitting the API when
  // paging/sorting back to a combination already seen this session. Cleared on any
  // mutation or explicit Refresh, since a stale cache would be worse than no cache.
  const cacheRef = useRef(new Map());

  // True once the first request (success or failure) has settled - distinguishes the
  // very first load (nothing to show yet, so PatientTable renders skeleton rows) from
  // every later refresh (rows already exist and must stay on screen behind a spinner
  // overlay, not be blanked out).
  const hasLoadedOnceRef = useRef(false);

  // Aborts the previous in-flight request whenever a new one starts, so a fast typist
  // or rapid filter changes never race an old response against a newer one, and the
  // server is never asked to do work whose result is already obsolete.
  const abortControllerRef = useRef(null);

  const hasActiveFilters = Boolean(searchInput.trim() || genderFilter || statusFilter);
  const hasServerFilters = Boolean(debouncedSearchTerm.trim() || genderFilter || statusFilter);
  const activeFilterCount = [genderFilter, statusFilter].filter(Boolean).length;

  useEffect(() => {
    let isMounted = true;

    getLookupCategory('gender')
      .then((category) => {
        if (isMounted) {
          setGenderOptions(category.values ?? []);
        }
      })
      .catch(() => {
        // Non-fatal: the Gender filter dropdown just shows "All Genders" only if this
        // fails - it must not block the rest of the patient list from loading.
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearchTerm(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [searchInput]);

  // Keeps the URL query string in sync with every piece of list state, using
  // `replace: true` so typing/paging/sorting doesn't spam the browser history - only
  // an explicit navigation (e.g. following a Back link) should create a history entry.
  // Default values are omitted from the URL entirely, so a page with no search/filter
  // activity keeps a clean "/patients" address rather than "/patients?page=1&...".
  useEffect(() => {
    const params = {};

    if (debouncedSearchTerm.trim()) params.search = debouncedSearchTerm.trim();
    if (genderFilter) params.gender = genderFilter;
    if (statusFilter) params.status = statusFilter;
    if (page !== 1) params.page = String(page);
    if (pageSize !== DEFAULT_PAGE_SIZE) params.pageSize = String(pageSize);
    if (sortBy !== DEFAULT_SORT_BY) params.sortBy = sortBy;
    if (sortDirection !== DEFAULT_SORT_DIRECTION) params.sortDirection = sortDirection;

    setSearchParams(params, { replace: true });
    // setSearchParams identity is stable enough across renders for this purpose, and
    // including it would re-run this effect on every render for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm, genderFilter, statusFilter, page, pageSize, sortBy, sortDirection]);

  const fetchPatients = useCallback(
    async ({ bypassCache = false } = {}) => {
      const cacheKey = JSON.stringify({
        page,
        pageSize,
        sortBy,
        sortDirection,
        debouncedSearchTerm,
        genderFilter,
        statusFilter,
      });

      // Abort any previous in-flight request unconditionally - even when this call is
      // about to be satisfied from cache, a still-running older request must not be
      // left free to resolve later and overwrite what we're about to show with stale
      // data from a different page/search/filter combination.
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;

      if (!bypassCache && cacheRef.current.has(cacheKey)) {
        const cached = cacheRef.current.get(cacheKey);
        setPatients(cached.items);
        setTotalCount(cached.totalCount);
        setTotalPages(cached.totalPages);
        setError('');
        setIsLoading(false);
        hasLoadedOnceRef.current = true;
        return;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setError('');

      try {
        const result = hasServerFilters
          ? await searchPatients({
              searchTerm: debouncedSearchTerm.trim() || null,
              genderCode: genderFilter || null,
              status: statusFilter || null,
              page,
              pageSize,
              sortBy,
              sortDirection,
              signal: controller.signal,
            })
          : await getPatients({ page, pageSize, sortBy, sortDirection, signal: controller.signal });

        cacheRef.current.set(cacheKey, result);
        setPatients(result.items);
        setTotalCount(result.totalCount);
        setTotalPages(result.totalPages);
        hasLoadedOnceRef.current = true;
      } catch (fetchError) {
        if (fetchError?.code === 'ERR_CANCELED') {
          // Superseded by a newer request - that request's own success/error handling
          // owns the UI state, so this stale one must not touch it.
          return;
        }

        const { generalMessage } = parseApiError(fetchError);
        setError(generalMessage || 'Unable to load patients. Please try again.');
        hasLoadedOnceRef.current = true;
      } finally {
        if (abortControllerRef.current === controller) {
          setIsLoading(false);
        }
      }
    },
    [page, pageSize, sortBy, sortDirection, debouncedSearchTerm, genderFilter, statusFilter, hasServerFilters],
  );

  useEffect(() => {
    fetchPatients();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchPatients]);

  function handleSort(column) {
    if (column === sortBy) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
    setPage(1);
  }

  function handleToggleSortDirection() {
    setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    setPage(1);
  }

  function handleGenderFilterChange(value) {
    setGenderFilter(value);
    setPage(1);
  }

  function handleStatusFilterChange(value) {
    setStatusFilter(value);
    setPage(1);
  }

  function handleClearFilters() {
    setSearchInput('');
    setDebouncedSearchTerm('');
    setGenderFilter('');
    setStatusFilter('');
    setPage(1);
  }

  function handlePageSizeChange(newPageSize) {
    setPageSize(newPageSize);
    setPage(1);
  }

  function handleRefresh() {
    cacheRef.current.clear();
    fetchPatients({ bypassCache: true });
  }

  function requestActivate(targetPatient) {
    setConfirmAction({ type: 'activate', patient: targetPatient });
  }

  function requestDeactivate(targetPatient) {
    setConfirmAction({ type: 'deactivate', patient: targetPatient });
  }

  async function handleConfirmAction() {
    if (!confirmAction) {
      return;
    }

    setIsActionProcessing(true);

    try {
      if (confirmAction.type === 'activate') {
        await activatePatient(confirmAction.patient.patientId);
        showSuccess(`${confirmAction.patient.fullName} was activated.`);
      } else {
        await deactivatePatient(confirmAction.patient.patientId);
        showSuccess(`${confirmAction.patient.fullName} was deactivated.`);
      }

      setConfirmAction(null);
      cacheRef.current.clear();
      await fetchPatients({ bypassCache: true });
    } catch (actionError) {
      const { generalMessage } = parseApiError(actionError);
      const message = generalMessage || 'Unable to complete this action. Please try again.';

      // A 409 on Deactivate is a business-rule block (e.g. a future Prescription module
      // reporting active prescriptions - business rule from api-spec.md/patient-
      // management.md), not an unexpected failure - shown as a warning, not an error.
      // No such check exists in the backend yet, but this path is ready for when one does.
      if (confirmAction.type === 'deactivate' && actionError?.response?.status === 409) {
        showWarning(message);
      } else {
        showError(message);
      }

      setConfirmAction(null);
    } finally {
      setIsActionProcessing(false);
    }
  }

  return (
    <PageContainer title="Patient Management">
      <PatientToolbar
        searchTerm={searchInput}
        onSearchTermChange={setSearchInput}
        genderFilter={genderFilter}
        onGenderFilterChange={handleGenderFilterChange}
        genderOptions={genderOptions}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
        activeFilterCount={activeFilterCount}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSortByChange={(value) => handleSort(value)}
        onToggleSortDirection={handleToggleSortDirection}
        onRefresh={handleRefresh}
      />

      <PatientTable
        patients={patients}
        isLoading={isLoading}
        hasLoadedOnce={hasLoadedOnceRef.current}
        error={error}
        onRetry={() => fetchPatients({ bypassCache: true })}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSort={handleSort}
        onActivate={requestActivate}
        onDeactivate={requestDeactivate}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
      />

      <ConfirmDialog
        show={Boolean(confirmAction)}
        title={confirmAction?.type === 'activate' ? 'Activate Patient' : 'Deactivate Patient'}
        message={
          <>
            <p className="mb-2">
              <strong>{confirmAction?.patient?.patientNumber}</strong> — {confirmAction?.patient?.fullName}
            </p>
            <p className="mb-0">
              {confirmAction?.type === 'activate'
                ? 'Are you sure you want to activate this patient?'
                : 'Are you sure you want to deactivate this patient?'}
            </p>
            {confirmAction?.type === 'deactivate' && (
              <div className="alert alert-warning d-flex align-items-center gap-2 mt-3 mb-0 py-2 px-3 small" role="alert">
                <i className="bi bi-exclamation-triangle" aria-hidden="true" />
                Inactive patients cannot receive new prescriptions.
              </div>
            )}
          </>
        }
        confirmLabel="Confirm"
        confirmVariant={confirmAction?.type === 'activate' ? 'success' : 'warning'}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
        isProcessing={isActionProcessing}
      />
    </PageContainer>
  );
}

export default PatientListPage;
