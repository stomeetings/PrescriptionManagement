import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PatientMedicationToolbar from './PatientMedicationToolbar.jsx';
import PatientMedicationTable from './PatientMedicationTable.jsx';
import PatientMedicationStopDialog from './PatientMedicationStopDialog.jsx';
import PatientMedicationResumeDialog from './PatientMedicationResumeDialog.jsx';
import PrescriptionPreviewDialog from './PrescriptionPreviewDialog.jsx';
import {
  getCurrentPatientMedications,
  searchPatientMedications,
  stopPatientMedication,
  getPatientMedicationById,
  resumePatientMedication,
  generatePrescription,
} from '../../api/patientMedicationApi.js';
import { parseApiError } from '../../api/parseApiError.js';
import { useNotification } from '../notifications/NotificationContext.jsx';

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_SORT_BY = 'startDate';
const DEFAULT_SORT_DIRECTION = 'desc';
const SEARCH_DEBOUNCE_MS = 400;

// usp_PatientMedication_GetCurrent supports only these two sortBy values.
// usp_PatientMedication_Search additionally supports 'createdDate' (its own default).
// Neither procedure has an ORDER BY branch for 'genericName'/'dose'/'frequency'/
// 'endDate'/'status' - all five are still offered as sortable per this step's task, but
// PatientMedicationTab sorts them client-side, current-page-only, below - a documented
// limitation, not a bug, until a future backend step adds real sort branches for them.
const GET_CURRENT_SORTABLE_COLUMNS = new Set(['medicineName', 'startDate']);
const SEARCH_SORTABLE_COLUMNS = new Set(['medicineName', 'startDate', 'createdDate']);
const CLIENT_ONLY_SORT_COLUMNS = new Set(['genericName', 'dose', 'frequency', 'endDate', 'status']);

function applyClientSort(items, sortBy, sortDirection) {
  if (!CLIENT_ONLY_SORT_COLUMNS.has(sortBy)) {
    return items;
  }

  const sorted = [...items].sort((a, b) => {
    let comparison;

    switch (sortBy) {
      case 'endDate': {
        const aTime = a.endDate ? new Date(a.endDate).getTime() : Infinity;
        const bTime = b.endDate ? new Date(b.endDate).getTime() : Infinity;
        comparison = aTime - bTime;
        break;
      }
      case 'dose':
        comparison = (a.dose ?? 0) - (b.dose ?? 0);
        break;
      case 'genericName':
        comparison = (a.genericName || '').localeCompare(b.genericName || '');
        break;
      case 'frequency':
        comparison = (a.frequency?.displayText || '').localeCompare(b.frequency?.displayText || '');
        break;
      default:
        comparison = (a.status?.displayText || '').localeCompare(b.status?.displayText || '');
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  return sorted;
}

// Owns all Patient Medications tab state/fetching, matching this project's established
// "no context per module, local state in the component that owns the feature" pattern
// (see PatientListPage). Lives inside PatientDetailsPage's Medications tab, not its own
// route - unlike PatientListPage's dedicated /patients route, this tab's query params
// attach to the shared /patients/:patientId URL. Tab selection itself (Overview vs
// Medications) is not part of the URL - see PatientDetailsPage's own activeTab state -
// so a hard refresh always lands back on Overview even though these params survive in
// the address bar, ready for the moment the user clicks back onto this tab.
function PatientMedicationTab({ patientId }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showSuccess, showError, showWarning } = useNotification();

  const [stopTarget, setStopTarget] = useState(null);
  const [isStopping, setIsStopping] = useState(false);
  const [stopError, setStopError] = useState('');

  const [resumeTarget, setResumeTarget] = useState(null);
  const [loadingResumeRowId, setLoadingResumeRowId] = useState(null);
  const [isResuming, setIsResuming] = useState(false);
  const [resumeError, setResumeError] = useState('');

  const [showPrescriptionPreview, setShowPrescriptionPreview] = useState(false);
  const [prescriptionDraft, setPrescriptionDraft] = useState(null);
  const [isGeneratingPrescription, setIsGeneratingPrescription] = useState(false);
  const [isRefreshingPrescription, setIsRefreshingPrescription] = useState(false);
  const [prescriptionError, setPrescriptionError] = useState('');

  // "Cache the latest preview until the draft [selection] changes" (Step 18.2's own
  // Performance requirement) - keyed by the exact set of selected Patient Medication
  // IDs, so reopening the dialog with an unchanged selection reuses the last response
  // instead of calling the API again. Cleared/bypassed only by an explicit Refresh
  // Preview click.
  const prescriptionCacheRef = useRef({ key: null, data: null });

  // Every piece of list state is seeded from the URL on first render, so a page
  // refresh restores exactly what the user had before - mirrors PatientListPage's
  // identical URL-state pattern.
  const [page, setPage] = useState(() => Number(searchParams.get('page')) || 1);
  const [pageSize, setPageSize] = useState(() => Number(searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE);
  const [sortBy, setSortBy] = useState(() => searchParams.get('sortBy') || DEFAULT_SORT_BY);
  const [sortDirection, setSortDirection] = useState(() => searchParams.get('sortDirection') || DEFAULT_SORT_DIRECTION);

  const [searchInput, setSearchInput] = useState(() => searchParams.get('search') || '');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(() => searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || '');
  const [prnFilter, setPrnFilter] = useState(() => searchParams.get('prn') || '');
  const [startDateFrom, setStartDateFrom] = useState(() => searchParams.get('startDateFrom') || '');
  const [startDateTo, setStartDateTo] = useState(() => searchParams.get('startDateTo') || '');
  const [endDateFrom, setEndDateFrom] = useState(() => searchParams.get('endDateFrom') || '');
  const [endDateTo, setEndDateTo] = useState(() => searchParams.get('endDateTo') || '');

  const [medications, setMedications] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedIds, setSelectedIds] = useState(new Set());

  const cacheRef = useRef(new Map());
  const hasLoadedOnceRef = useRef(false);
  const abortControllerRef = useRef(null);

  const hasActiveFilters = Boolean(
    searchInput.trim() || statusFilter || prnFilter || startDateFrom || startDateTo || endDateFrom || endDateTo,
  );
  const hasServerFilters = Boolean(
    debouncedSearchTerm.trim() || statusFilter || prnFilter || startDateFrom || startDateTo || endDateFrom || endDateTo,
  );
  const activeFilterCount = [statusFilter, prnFilter, startDateFrom, startDateTo, endDateFrom, endDateTo].filter(
    Boolean,
  ).length;

  const selectedActiveCount = useMemo(
    () =>
      medications.filter((medication) => selectedIds.has(medication.patientMedicationId) && medication.status?.code === 'ACTIVE')
        .length,
    [medications, selectedIds],
  );

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearchTerm(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [searchInput]);

  // Keeps the URL query string in sync with every piece of list state, using
  // `replace: true` so typing/paging/sorting doesn't spam the browser history - mirrors
  // PatientListPage's identical pattern. Default values are omitted from the URL
  // entirely, so a tab with no search/filter activity keeps a clean "/patients/:id"
  // address.
  useEffect(() => {
    const params = {};

    if (debouncedSearchTerm.trim()) params.search = debouncedSearchTerm.trim();
    if (statusFilter) params.status = statusFilter;
    if (prnFilter) params.prn = prnFilter;
    if (startDateFrom) params.startDateFrom = startDateFrom;
    if (startDateTo) params.startDateTo = startDateTo;
    if (endDateFrom) params.endDateFrom = endDateFrom;
    if (endDateTo) params.endDateTo = endDateTo;
    if (page !== 1) params.page = String(page);
    if (pageSize !== DEFAULT_PAGE_SIZE) params.pageSize = String(pageSize);
    if (sortBy !== DEFAULT_SORT_BY) params.sortBy = sortBy;
    if (sortDirection !== DEFAULT_SORT_DIRECTION) params.sortDirection = sortDirection;

    setSearchParams(params, { replace: true });
    // setSearchParams identity is stable enough across renders for this purpose, and
    // including it would re-run this effect on every render for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm, statusFilter, prnFilter, startDateFrom, startDateTo, endDateFrom, endDateTo, page, pageSize, sortBy, sortDirection]);

  const fetchMedications = useCallback(
    async ({ bypassCache = false } = {}) => {
      const cacheKey = JSON.stringify({
        patientId,
        page,
        pageSize,
        sortBy,
        sortDirection,
        debouncedSearchTerm,
        statusFilter,
        prnFilter,
        startDateFrom,
        startDateTo,
        endDateFrom,
        endDateTo,
      });

      abortControllerRef.current?.abort();
      abortControllerRef.current = null;

      if (!bypassCache && cacheRef.current.has(cacheKey)) {
        const cached = cacheRef.current.get(cacheKey);
        setMedications(cached.items);
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

      // 'createdDate' is only ever supported by usp_PatientMedication_Search (its own
      // default sort), never by usp_PatientMedication_GetCurrent - so sorting by
      // Created Date forces the Search endpoint even with no other filter active,
      // rather than silently falling back to a client-side sort of GetCurrent's
      // unrelated default order.
      const useSearchEndpoint = hasServerFilters || sortBy === 'createdDate';
      const serverSortableColumns = useSearchEndpoint ? SEARCH_SORTABLE_COLUMNS : GET_CURRENT_SORTABLE_COLUMNS;
      const effectiveSortBy = serverSortableColumns.has(sortBy) ? sortBy : DEFAULT_SORT_BY;
      const effectiveSortDirection = serverSortableColumns.has(sortBy) ? sortDirection : DEFAULT_SORT_DIRECTION;

      try {
        const result = useSearchEndpoint
          ? await searchPatientMedications({
              patientId: Number(patientId),
              searchTerm: debouncedSearchTerm.trim() || null,
              statusCode: statusFilter || null,
              isPrn: prnFilter === '' ? null : prnFilter === 'true',
              startDateFrom: startDateFrom || null,
              startDateTo: startDateTo || null,
              endDateFrom: endDateFrom || null,
              endDateTo: endDateTo || null,
              page,
              pageSize,
              sortBy: effectiveSortBy,
              sortDirection: effectiveSortDirection,
              signal: controller.signal,
            })
          : await getCurrentPatientMedications({
              patientId,
              page,
              pageSize,
              sortBy: effectiveSortBy,
              sortDirection: effectiveSortDirection,
              signal: controller.signal,
            });

        const items = applyClientSort(result.items, sortBy, sortDirection);

        cacheRef.current.set(cacheKey, { items, totalCount: result.totalCount, totalPages: result.totalPages });
        setMedications(items);
        setTotalCount(result.totalCount);
        setTotalPages(result.totalPages);
        hasLoadedOnceRef.current = true;
      } catch (fetchError) {
        if (fetchError?.code === 'ERR_CANCELED') {
          return;
        }

        const { generalMessage } = parseApiError(fetchError);
        setError(generalMessage || 'Unable to load patient medications. Please try again.');
        hasLoadedOnceRef.current = true;
      } finally {
        if (abortControllerRef.current === controller) {
          setIsLoading(false);
        }
      }
    },
    [
      patientId,
      page,
      pageSize,
      sortBy,
      sortDirection,
      debouncedSearchTerm,
      statusFilter,
      prnFilter,
      startDateFrom,
      startDateTo,
      endDateFrom,
      endDateTo,
      hasServerFilters,
    ],
  );

  useEffect(() => {
    fetchMedications();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchMedications]);

  function handleSort(column) {
    if (column === sortBy) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
    setPage(1);
  }

  function handleStatusFilterChange(value) {
    setStatusFilter(value);
    setPage(1);
  }

  function handlePrnFilterChange(value) {
    setPrnFilter(value);
    setPage(1);
  }

  function handleStartDateFromChange(value) {
    setStartDateFrom(value);
    setPage(1);
  }

  function handleStartDateToChange(value) {
    setStartDateTo(value);
    setPage(1);
  }

  function handleEndDateFromChange(value) {
    setEndDateFrom(value);
    setPage(1);
  }

  function handleEndDateToChange(value) {
    setEndDateTo(value);
    setPage(1);
  }

  function handleClearFilters() {
    setSearchInput('');
    setDebouncedSearchTerm('');
    setStatusFilter('');
    setPrnFilter('');
    setStartDateFrom('');
    setStartDateTo('');
    setEndDateFrom('');
    setEndDateTo('');
    setPage(1);
  }

  function handlePageSizeChange(newPageSize) {
    setPageSize(newPageSize);
    setPage(1);
  }

  function handleRefresh() {
    cacheRef.current.clear();
    fetchMedications({ bypassCache: true });
  }

  function handleToggleSelected(patientMedicationId) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(patientMedicationId)) {
        next.delete(patientMedicationId);
      } else {
        next.add(patientMedicationId);
      }
      return next;
    });
  }

  function handleToggleSelectAll(selectableIds) {
    setSelectedIds((current) => {
      const allChecked = selectableIds.length > 0 && selectableIds.every((id) => current.has(id));
      const next = new Set(current);

      if (allChecked) {
        selectableIds.forEach((id) => next.delete(id));
      } else {
        selectableIds.forEach((id) => next.add(id));
      }

      return next;
    });
  }

  function handleAddMedication() {
    navigate(`/patients/${patientId}/medications/add`);
  }

  function handleStopRequest(medication) {
    setStopError('');
    setStopTarget(medication);
  }

  async function handleConfirmStop() {
    if (!stopTarget) {
      return;
    }

    setIsStopping(true);
    setStopError('');

    try {
      await stopPatientMedication(stopTarget.patientMedicationId);

      setStopTarget(null);
      showSuccess(`${stopTarget.medicineName} was stopped.`);

      cacheRef.current.clear();
      await fetchMedications({ bypassCache: true });
    } catch (stopErrorResponse) {
      const { generalMessage } = parseApiError(stopErrorResponse);
      const message = generalMessage || 'Unable to stop this medication. Please try again.';

      // Shown inside the dialog (not just a toast) so the clinician sees exactly why
      // the Stop attempt failed (e.g. already stopped by someone else) without the
      // dialog closing out from under them.
      setStopError(message);
      showError(message);
    } finally {
      setIsStopping(false);
    }
  }

  // PatientMedicationSummaryResponse (this tab's row shape) has no stoppedDate field
  // (Detail-only, per api-spec.md section 6) - the Resume dialog's "Previous Medication"
  // section needs it, so the full detail is fetched fresh before opening the dialog,
  // regardless of what's already on screen.
  async function handleResumeRequest(medication) {
    setResumeError('');
    setLoadingResumeRowId(medication.patientMedicationId);

    try {
      const detail = await getPatientMedicationById(medication.patientMedicationId);
      setResumeTarget(detail);
    } catch (fetchError) {
      const { generalMessage } = parseApiError(fetchError);
      showError(generalMessage || 'Unable to load this medication. Please try again.');
    } finally {
      setLoadingResumeRowId(null);
    }
  }

  async function handleConfirmResume(formValues) {
    if (!resumeTarget) {
      return;
    }

    setIsResuming(true);
    setResumeError('');

    try {
      await resumePatientMedication(resumeTarget.patientMedicationId, {
        startDate: formValues.resumeDate,
        dose: Number(formValues.dose),
        doseUnitCode: formValues.doseUnitCode,
        frequencyCode: formValues.frequencyCode,
        duration: Number(formValues.duration),
        durationUnitCode: formValues.durationUnitCode,
        quantity: Number(formValues.quantity),
        instructions: formValues.instructions,
        prn: formValues.prn,
        clinicalNotes: formValues.clinicalNotes || null,
      });

      setResumeTarget(null);
      showSuccess(`${resumeTarget.medicineName} was resumed as a new active medication.`);

      cacheRef.current.clear();
      await fetchMedications({ bypassCache: true });
    } catch (resumeErrorResponse) {
      const { generalMessage } = parseApiError(resumeErrorResponse);
      const message = generalMessage || 'Unable to resume this medication. Please try again.';

      setResumeError(message);
      showError(message);
    } finally {
      setIsResuming(false);
    }
  }

  function selectedIdsSortedArray() {
    return Array.from(selectedIds).sort((a, b) => a - b);
  }

  async function fetchPrescriptionDraft(idsArray) {
    const draft = await generatePrescription({
      patientId: Number(patientId),
      selectedPatientMedicationIds: idsArray,
    });

    prescriptionCacheRef.current = { key: JSON.stringify(idsArray), data: draft };
    setPrescriptionDraft(draft);

    // Non-fatal exclusion notices (e.g. a selection stopped between click and
    // generation) - api-spec.md section 4.8 rule 2 - surfaced as warnings, not errors,
    // since the draft itself still generated successfully.
    (draft.validationMessages || []).forEach((message) => showWarning(message));

    return draft;
  }

  async function handleGeneratePrescription() {
    const idsArray = selectedIdsSortedArray();
    const cacheKey = JSON.stringify(idsArray);

    setShowPrescriptionPreview(true);
    setPrescriptionError('');

    // Reuse the cached response when the selection hasn't changed since the last
    // generation - only an explicit Refresh Preview click bypasses this.
    if (prescriptionCacheRef.current.key === cacheKey && prescriptionCacheRef.current.data) {
      setPrescriptionDraft(prescriptionCacheRef.current.data);
      return;
    }

    setIsGeneratingPrescription(true);
    setPrescriptionDraft(null);

    try {
      await fetchPrescriptionDraft(idsArray);
    } catch (fetchError) {
      const { generalMessage } = parseApiError(fetchError);
      setPrescriptionError(generalMessage || 'Unable to generate the prescription preview. Please try again.');
    } finally {
      setIsGeneratingPrescription(false);
    }
  }

  async function handleRefreshPrescriptionPreview() {
    setIsRefreshingPrescription(true);
    setPrescriptionError('');

    try {
      await fetchPrescriptionDraft(selectedIdsSortedArray());
    } catch (fetchError) {
      const { generalMessage } = parseApiError(fetchError);
      setPrescriptionError(generalMessage || 'Unable to refresh the prescription preview. Please try again.');
    } finally {
      setIsRefreshingPrescription(false);
    }
  }

  function handleClosePrescriptionPreview() {
    setShowPrescriptionPreview(false);
  }

  return (
    <div>
      <PatientMedicationToolbar
        patientId={patientId}
        searchTerm={searchInput}
        onSearchTermChange={setSearchInput}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        prnFilter={prnFilter}
        onPrnFilterChange={handlePrnFilterChange}
        startDateFrom={startDateFrom}
        onStartDateFromChange={handleStartDateFromChange}
        startDateTo={startDateTo}
        onStartDateToChange={handleStartDateToChange}
        endDateFrom={endDateFrom}
        onEndDateFromChange={handleEndDateFromChange}
        endDateTo={endDateTo}
        onEndDateToChange={handleEndDateToChange}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
        activeFilterCount={activeFilterCount}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSortByChange={(value) => handleSort(value)}
        onToggleSortDirection={() => {
          setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
          setPage(1);
        }}
        onRefresh={handleRefresh}
        selectedActiveCount={selectedActiveCount}
        onGeneratePrescription={handleGeneratePrescription}
      />

      <PatientMedicationTable
        medications={medications}
        isLoading={isLoading}
        hasLoadedOnce={hasLoadedOnceRef.current}
        error={error}
        onRetry={() => fetchMedications({ bypassCache: true })}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSort={handleSort}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
        onAddMedication={handleAddMedication}
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        selectedIds={selectedIds}
        onToggleSelected={handleToggleSelected}
        onToggleSelectAll={handleToggleSelectAll}
        onStop={handleStopRequest}
        onResume={handleResumeRequest}
        loadingResumeRowId={loadingResumeRowId}
      />

      <PatientMedicationStopDialog
        show={Boolean(stopTarget)}
        medication={stopTarget}
        onConfirm={handleConfirmStop}
        onCancel={() => setStopTarget(null)}
        isProcessing={isStopping}
        error={stopError}
      />

      <PatientMedicationResumeDialog
        show={Boolean(resumeTarget)}
        medication={resumeTarget}
        onConfirm={handleConfirmResume}
        onCancel={() => setResumeTarget(null)}
        isProcessing={isResuming}
        error={resumeError}
      />

      <PrescriptionPreviewDialog
        show={showPrescriptionPreview}
        draft={prescriptionDraft}
        isLoading={isGeneratingPrescription}
        isRefreshing={isRefreshingPrescription}
        error={prescriptionError}
        onRefreshPreview={handleRefreshPrescriptionPreview}
        onClose={handleClosePrescriptionPreview}
      />
    </div>
  );
}

export default PatientMedicationTab;
