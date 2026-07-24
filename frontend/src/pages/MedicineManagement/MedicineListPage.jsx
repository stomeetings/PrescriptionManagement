import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer.jsx';
import MedicineToolbar from '../../components/medicineManagement/MedicineToolbar.jsx';
import MedicineTable from '../../components/medicineManagement/MedicineTable.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import { activateMedicine, deactivateMedicine, getMedicines, searchMedicines } from '../../api/medicinesApi.js';
import { getLookupCategory } from '../../api/lookupsApi.js';
import { parseApiError } from '../../api/parseApiError.js';
import { useNotification } from '../../components/notifications/NotificationContext.jsx';

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_SORT_BY = 'createdDate';
const DEFAULT_SORT_DIRECTION = 'desc';
const SEARCH_DEBOUNCE_MS = 400;

function MedicineListPage() {
  const { showSuccess, showError, showWarning } = useNotification();
  const [searchParams, setSearchParams] = useSearchParams();

  // Every piece of list state is seeded from the URL on first render, so a page
  // refresh (or a Back navigation from Details/Edit) restores exactly what the user
  // had before - matches PatientListPage's identical URL-state pattern.
  const [page, setPage] = useState(() => Number(searchParams.get('page')) || 1);
  const [pageSize, setPageSize] = useState(() => Number(searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE);
  const [sortBy, setSortBy] = useState(() => searchParams.get('sortBy') || DEFAULT_SORT_BY);
  const [sortDirection, setSortDirection] = useState(() => searchParams.get('sortDirection') || DEFAULT_SORT_DIRECTION);

  const [searchInput, setSearchInput] = useState(() => searchParams.get('search') || '');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(() => searchParams.get('search') || '');
  const [dosageFormFilter, setDosageFormFilter] = useState(() => searchParams.get('dosageForm') || '');
  const [routeFilter, setRouteFilter] = useState(() => searchParams.get('route') || '');
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || '');
  const [controlledDrugFilter, setControlledDrugFilter] = useState(() => searchParams.get('controlledDrug') || '');

  const [dosageFormOptions, setDosageFormOptions] = useState([]);
  const [routeOptions, setRouteOptions] = useState([]);

  const [medicines, setMedicines] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [confirmAction, setConfirmAction] = useState(null); // { type: 'activate'|'deactivate', medicine }
  const [isActionProcessing, setIsActionProcessing] = useState(false);

  // Simple in-memory cache keyed by the exact query - avoids re-hitting the API when
  // paging/sorting back to a combination already seen this session. Cleared on any
  // mutation or explicit Refresh, since a stale cache would be worse than no cache.
  const cacheRef = useRef(new Map());

  // True once the first request (success or failure) has settled - distinguishes the
  // very first load (nothing to show yet, so MedicineTable renders skeleton rows) from
  // every later refresh (rows already exist and must stay on screen behind a spinner
  // overlay, not be blanked out).
  const hasLoadedOnceRef = useRef(false);

  // Aborts the previous in-flight request whenever a new one starts, so a fast typist
  // or rapid filter changes never race an old response against a newer one.
  const abortControllerRef = useRef(null);

  const hasActiveFilters = Boolean(
    searchInput.trim() || dosageFormFilter || routeFilter || statusFilter || controlledDrugFilter,
  );
  const hasServerFilters = Boolean(
    debouncedSearchTerm.trim() || dosageFormFilter || routeFilter || statusFilter || controlledDrugFilter,
  );
  const activeFilterCount = [dosageFormFilter, routeFilter, statusFilter, controlledDrugFilter].filter(Boolean).length;

  useEffect(() => {
    let isMounted = true;

    Promise.all([getLookupCategory('medicineform'), getLookupCategory('medicineroute')])
      .then(([formCategory, routeCategory]) => {
        if (isMounted) {
          setDosageFormOptions(formCategory.values ?? []);
          setRouteOptions(routeCategory.values ?? []);
        }
      })
      .catch(() => {
        // Non-fatal: the Dosage Form/Route filter dropdowns just show "All ..." only if
        // this fails - it must not block the rest of the medicine list from loading.
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
  // `replace: true` so typing/paging/sorting doesn't spam the browser history. Default
  // values are omitted from the URL entirely, so an untouched list keeps a clean
  // "/medicines" address.
  useEffect(() => {
    const params = {};

    if (debouncedSearchTerm.trim()) params.search = debouncedSearchTerm.trim();
    if (dosageFormFilter) params.dosageForm = dosageFormFilter;
    if (routeFilter) params.route = routeFilter;
    if (statusFilter) params.status = statusFilter;
    if (controlledDrugFilter) params.controlledDrug = controlledDrugFilter;
    if (page !== 1) params.page = String(page);
    if (pageSize !== DEFAULT_PAGE_SIZE) params.pageSize = String(pageSize);
    if (sortBy !== DEFAULT_SORT_BY) params.sortBy = sortBy;
    if (sortDirection !== DEFAULT_SORT_DIRECTION) params.sortDirection = sortDirection;

    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm, dosageFormFilter, routeFilter, statusFilter, controlledDrugFilter, page, pageSize, sortBy, sortDirection]);

  const fetchMedicines = useCallback(
    async ({ bypassCache = false } = {}) => {
      const cacheKey = JSON.stringify({
        page,
        pageSize,
        sortBy,
        sortDirection,
        debouncedSearchTerm,
        dosageFormFilter,
        routeFilter,
        statusFilter,
        controlledDrugFilter,
      });

      // Abort any previous in-flight request unconditionally - even when this call is
      // about to be satisfied from cache, a still-running older request must not be
      // left free to resolve later and overwrite what we're about to show with stale
      // data from a different page/search/filter combination.
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;

      if (!bypassCache && cacheRef.current.has(cacheKey)) {
        const cached = cacheRef.current.get(cacheKey);
        setMedicines(cached.items);
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
          ? await searchMedicines({
              searchTerm: debouncedSearchTerm.trim() || null,
              medicineFormCode: dosageFormFilter || null,
              medicineRouteCode: routeFilter || null,
              status: statusFilter || null,
              isControlledDrug: controlledDrugFilter === '' ? null : controlledDrugFilter === 'true',
              page,
              pageSize,
              sortBy,
              sortDirection,
              signal: controller.signal,
            })
          : await getMedicines({ page, pageSize, sortBy, sortDirection, signal: controller.signal });

        cacheRef.current.set(cacheKey, result);
        setMedicines(result.items);
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
        setError(generalMessage || 'Unable to load medicines. Please try again.');
        hasLoadedOnceRef.current = true;
      } finally {
        if (abortControllerRef.current === controller) {
          setIsLoading(false);
        }
      }
    },
    [
      page,
      pageSize,
      sortBy,
      sortDirection,
      debouncedSearchTerm,
      dosageFormFilter,
      routeFilter,
      statusFilter,
      controlledDrugFilter,
      hasServerFilters,
    ],
  );

  useEffect(() => {
    fetchMedicines();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchMedicines]);

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

  function handleDosageFormFilterChange(value) {
    setDosageFormFilter(value);
    setPage(1);
  }

  function handleRouteFilterChange(value) {
    setRouteFilter(value);
    setPage(1);
  }

  function handleStatusFilterChange(value) {
    setStatusFilter(value);
    setPage(1);
  }

  function handleControlledDrugFilterChange(value) {
    setControlledDrugFilter(value);
    setPage(1);
  }

  function handleClearFilters() {
    setSearchInput('');
    setDebouncedSearchTerm('');
    setDosageFormFilter('');
    setRouteFilter('');
    setStatusFilter('');
    setControlledDrugFilter('');
    setPage(1);
  }

  function handlePageSizeChange(newPageSize) {
    setPageSize(newPageSize);
    setPage(1);
  }

  function handleRefresh() {
    cacheRef.current.clear();
    fetchMedicines({ bypassCache: true });
  }

  function requestActivate(targetMedicine) {
    setConfirmAction({ type: 'activate', medicine: targetMedicine });
  }

  function requestDeactivate(targetMedicine) {
    setConfirmAction({ type: 'deactivate', medicine: targetMedicine });
  }

  async function handleConfirmAction() {
    if (!confirmAction) {
      return;
    }

    setIsActionProcessing(true);

    try {
      if (confirmAction.type === 'activate') {
        await activateMedicine(confirmAction.medicine.medicineId);
        showSuccess(`${confirmAction.medicine.medicineName} was activated.`);
      } else {
        await deactivateMedicine(confirmAction.medicine.medicineId);
        showSuccess(`${confirmAction.medicine.medicineName} was deactivated.`);
      }

      setConfirmAction(null);
      cacheRef.current.clear();
      await fetchMedicines({ bypassCache: true });
    } catch (actionError) {
      const { generalMessage } = parseApiError(actionError);
      const message = generalMessage || 'Unable to complete this action. Please try again.';

      // A 409 on Deactivate would be a business-rule block (e.g. a future Prescription
      // reference check) - shown as a warning rather than an error, mirroring
      // PatientListPage's identical handling, even though no such check exists yet.
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
    <PageContainer title="Medicine Management">
      <MedicineToolbar
        searchTerm={searchInput}
        onSearchTermChange={setSearchInput}
        dosageFormFilter={dosageFormFilter}
        onDosageFormFilterChange={handleDosageFormFilterChange}
        dosageFormOptions={dosageFormOptions}
        routeFilter={routeFilter}
        onRouteFilterChange={handleRouteFilterChange}
        routeOptions={routeOptions}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        controlledDrugFilter={controlledDrugFilter}
        onControlledDrugFilterChange={handleControlledDrugFilterChange}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
        activeFilterCount={activeFilterCount}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSortByChange={(value) => handleSort(value)}
        onToggleSortDirection={handleToggleSortDirection}
        onRefresh={handleRefresh}
      />

      <MedicineTable
        medicines={medicines}
        isLoading={isLoading}
        hasLoadedOnce={hasLoadedOnceRef.current}
        error={error}
        onRetry={() => fetchMedicines({ bypassCache: true })}
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
        title={confirmAction?.type === 'activate' ? 'Activate Medicine' : 'Deactivate Medicine'}
        message={
          <>
            <p className="mb-2">
              <strong>{confirmAction?.medicine?.medicineCode}</strong> — {confirmAction?.medicine?.medicineName}
              {confirmAction?.medicine?.strength ? ` (${confirmAction.medicine.strength})` : ''}
            </p>
            <p className="mb-0">
              {confirmAction?.type === 'activate'
                ? 'Are you sure you want to activate this medicine?'
                : 'Are you sure you want to deactivate this medicine?'}
            </p>
            {confirmAction?.type === 'deactivate' && (
              <div className="alert alert-warning d-flex align-items-center gap-2 mt-3 mb-0 py-2 px-3 small" role="alert">
                <i className="bi bi-exclamation-triangle" aria-hidden="true" />
                Inactive medicines cannot be selected for new prescriptions.
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

export default MedicineListPage;
