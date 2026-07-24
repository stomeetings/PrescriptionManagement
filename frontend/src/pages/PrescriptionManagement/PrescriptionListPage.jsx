import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer.jsx';
import PrescriptionToolbar from '../../components/prescriptionManagement/PrescriptionToolbar.jsx';
import PrescriptionFilterPanel from '../../components/prescriptionManagement/PrescriptionFilterPanel.jsx';
import PrescriptionGrid from '../../components/prescriptionManagement/PrescriptionGrid.jsx';
import PatientSearchSelectionDialog from '../../components/prescriptionManagement/PatientSearchSelectionDialog.jsx';
import { getPrescriptions, searchPrescriptions } from '../../api/prescriptionApi.js';
import { getLookupCategory } from '../../api/lookupsApi.js';
import { parseApiError } from '../../api/parseApiError.js';
import { useNotification } from '../../components/notifications/NotificationContext.jsx';

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_SORT_BY = 'createdDate';
const DEFAULT_SORT_DIRECTION = 'desc';
const SEARCH_DEBOUNCE_MS = 400;

// Mirrors PatientListPage's established architecture exactly: URL-seeded state (page
// refresh/Back navigation restores what the user had), a debounced search box, an
// in-memory query cache cleared on Refresh, and an AbortController so a fast typist or
// rapid filter changes never race an old response against a newer one.
function PrescriptionListPage() {
  const { showWarning } = useNotification();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // "New Prescription" -> Patient Search/Selection dialog. The Prescription module must
  // never let a user create a patient or search the Medicine Master directly (mandatory,
  // application-wide rule) - selecting a patient here navigates straight to that
  // patient's own Patient Medication grid, where Generate Prescription already lives,
  // instead of any prescription-specific creation form.
  const [showPatientSearchDialog, setShowPatientSearchDialog] = useState(false);

  const [page, setPage] = useState(() => Number(searchParams.get('page')) || 1);
  const [pageSize, setPageSize] = useState(() => Number(searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE);
  const [sortBy, setSortBy] = useState(() => searchParams.get('sortBy') || DEFAULT_SORT_BY);
  const [sortDirection, setSortDirection] = useState(() => searchParams.get('sortDirection') || DEFAULT_SORT_DIRECTION);

  const [searchInput, setSearchInput] = useState(() => searchParams.get('search') || '');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(() => searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || '');
  const [issueDateFrom, setIssueDateFrom] = useState(() => searchParams.get('issueDateFrom') || '');
  const [issueDateTo, setIssueDateTo] = useState(() => searchParams.get('issueDateTo') || '');
  const [expiryDateFrom, setExpiryDateFrom] = useState(() => searchParams.get('expiryDateFrom') || '');
  const [expiryDateTo, setExpiryDateTo] = useState(() => searchParams.get('expiryDateTo') || '');
  const [patientIdFilter, setPatientIdFilter] = useState(() => searchParams.get('patientId') || '');
  const [providerIdFilter, setProviderIdFilter] = useState(() => searchParams.get('providerId') || '');

  const [statusOptions, setStatusOptions] = useState([]);

  const [prescriptions, setPrescriptions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const cacheRef = useRef(new Map());
  const hasLoadedOnceRef = useRef(false);
  const abortControllerRef = useRef(null);

  const hasActiveFilters = Boolean(
    searchInput.trim() ||
      statusFilter ||
      issueDateFrom ||
      issueDateTo ||
      expiryDateFrom ||
      expiryDateTo ||
      patientIdFilter ||
      providerIdFilter,
  );
  const hasServerFilters = Boolean(
    debouncedSearchTerm.trim() ||
      statusFilter ||
      issueDateFrom ||
      issueDateTo ||
      expiryDateFrom ||
      expiryDateTo ||
      patientIdFilter ||
      providerIdFilter,
  );
  const activeFilterCount = [statusFilter, issueDateFrom, issueDateTo, expiryDateFrom, expiryDateTo, patientIdFilter, providerIdFilter].filter(
    Boolean,
  ).length;

  useEffect(() => {
    let isMounted = true;

    getLookupCategory('prescriptionstatus')
      .then((category) => {
        if (isMounted) {
          setStatusOptions(category.values ?? []);
        }
      })
      .catch(() => {
        // Non-fatal: the Status filter dropdown just shows "All Statuses" only if this
        // fails - it must not block the rest of the prescription list from loading.
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

  useEffect(() => {
    const params = {};

    if (debouncedSearchTerm.trim()) params.search = debouncedSearchTerm.trim();
    if (statusFilter) params.status = statusFilter;
    if (issueDateFrom) params.issueDateFrom = issueDateFrom;
    if (issueDateTo) params.issueDateTo = issueDateTo;
    if (expiryDateFrom) params.expiryDateFrom = expiryDateFrom;
    if (expiryDateTo) params.expiryDateTo = expiryDateTo;
    if (patientIdFilter) params.patientId = patientIdFilter;
    if (providerIdFilter) params.providerId = providerIdFilter;
    if (page !== 1) params.page = String(page);
    if (pageSize !== DEFAULT_PAGE_SIZE) params.pageSize = String(pageSize);
    if (sortBy !== DEFAULT_SORT_BY) params.sortBy = sortBy;
    if (sortDirection !== DEFAULT_SORT_DIRECTION) params.sortDirection = sortDirection;

    setSearchParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedSearchTerm,
    statusFilter,
    issueDateFrom,
    issueDateTo,
    expiryDateFrom,
    expiryDateTo,
    patientIdFilter,
    providerIdFilter,
    page,
    pageSize,
    sortBy,
    sortDirection,
  ]);

  const fetchPrescriptions = useCallback(
    async ({ bypassCache = false } = {}) => {
      const cacheKey = JSON.stringify({
        page,
        pageSize,
        sortBy,
        sortDirection,
        debouncedSearchTerm,
        statusFilter,
        issueDateFrom,
        issueDateTo,
        expiryDateFrom,
        expiryDateTo,
        patientIdFilter,
        providerIdFilter,
      });

      abortControllerRef.current?.abort();
      abortControllerRef.current = null;

      if (!bypassCache && cacheRef.current.has(cacheKey)) {
        const cached = cacheRef.current.get(cacheKey);
        setPrescriptions(cached.items);
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
          ? await searchPrescriptions({
              searchTerm: debouncedSearchTerm.trim() || null,
              statusCode: statusFilter || null,
              issueDateFrom: issueDateFrom || null,
              issueDateTo: issueDateTo || null,
              expiryDateFrom: expiryDateFrom || null,
              expiryDateTo: expiryDateTo || null,
              // Sent as actual numbers, not the raw input strings - System.Text.Json
              // does not coerce a JSON string into an int-typed property by default, and
              // a raw string here would fail model binding on the backend.
              patientId: patientIdFilter ? Number(patientIdFilter) : null,
              providerUserAccountId: providerIdFilter ? Number(providerIdFilter) : null,
              page,
              pageSize,
              sortBy,
              sortDirection,
              signal: controller.signal,
            })
          : await getPrescriptions({ page, pageSize, sortBy, sortDirection, signal: controller.signal });

        cacheRef.current.set(cacheKey, result);
        setPrescriptions(result.items);
        setTotalCount(result.totalCount);
        setTotalPages(result.totalPages);
        hasLoadedOnceRef.current = true;
      } catch (fetchError) {
        if (fetchError?.code === 'ERR_CANCELED') {
          return;
        }

        const { generalMessage } = parseApiError(fetchError);
        setError(generalMessage || 'Unable to load prescriptions. Please try again.');
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
      statusFilter,
      issueDateFrom,
      issueDateTo,
      expiryDateFrom,
      expiryDateTo,
      patientIdFilter,
      providerIdFilter,
      hasServerFilters,
    ],
  );

  useEffect(() => {
    fetchPrescriptions();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchPrescriptions]);

  function handleSort(column) {
    if (column === sortBy) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
    setPage(1);
  }

  function handleClearFilters() {
    setSearchInput('');
    setDebouncedSearchTerm('');
    setStatusFilter('');
    setIssueDateFrom('');
    setIssueDateTo('');
    setExpiryDateFrom('');
    setExpiryDateTo('');
    setPatientIdFilter('');
    setProviderIdFilter('');
    setPage(1);
  }

  function handlePageSizeChange(newPageSize) {
    setPageSize(newPageSize);
    setPage(1);
  }

  function handleRefresh() {
    cacheRef.current.clear();
    fetchPrescriptions({ bypassCache: true });
  }

  function handleExport() {
    showWarning('Export will be available in a future release.');
  }

  // Lands on the Medications tab directly (initialTab state, the same mechanism
  // AddPatientMedicationPage's own Cancel/Save already uses) rather than the Overview
  // tab, since the entire point of this flow is to select medications and generate a
  // prescription.
  function handlePatientSelected(patient) {
    setShowPatientSearchDialog(false);
    navigate(`/patients/${patient.patientId}`, { state: { initialTab: 'medications' } });
  }

  function withFilterReset(setter) {
    return (value) => {
      setter(value);
      setPage(1);
    };
  }

  return (
    <PageContainer title="Prescription Management">
      <PrescriptionToolbar
        searchTerm={searchInput}
        onSearchTermChange={setSearchInput}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
        activeFilterCount={activeFilterCount}
        onRefresh={handleRefresh}
        onExport={handleExport}
        onNewPrescription={() => setShowPatientSearchDialog(true)}
      />

      <PrescriptionFilterPanel
        statusOptions={statusOptions}
        statusFilter={statusFilter}
        onStatusFilterChange={withFilterReset(setStatusFilter)}
        issueDateFrom={issueDateFrom}
        issueDateTo={issueDateTo}
        onIssueDateFromChange={withFilterReset(setIssueDateFrom)}
        onIssueDateToChange={withFilterReset(setIssueDateTo)}
        expiryDateFrom={expiryDateFrom}
        expiryDateTo={expiryDateTo}
        onExpiryDateFromChange={withFilterReset(setExpiryDateFrom)}
        onExpiryDateToChange={withFilterReset(setExpiryDateTo)}
        patientIdFilter={patientIdFilter}
        onPatientIdFilterChange={withFilterReset(setPatientIdFilter)}
        providerIdFilter={providerIdFilter}
        onProviderIdFilterChange={withFilterReset(setProviderIdFilter)}
      />

      <PrescriptionGrid
        prescriptions={prescriptions}
        isLoading={isLoading}
        hasLoadedOnce={hasLoadedOnceRef.current}
        error={error}
        onRetry={() => fetchPrescriptions({ bypassCache: true })}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSort={handleSort}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
      />

      <PatientSearchSelectionDialog
        show={showPatientSearchDialog}
        onSelect={handlePatientSelected}
        onClose={() => setShowPatientSearchDialog(false)}
      />
    </PageContainer>
  );
}

export default PrescriptionListPage;
