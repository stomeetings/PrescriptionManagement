import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { ROLES } from '../../auth/roles.js';
import PatientMedicationPrescriptionBadge from '../prescriptionManagement/PatientMedicationPrescriptionBadge.jsx';

// Sortable column headers: 'medicineName'/'startDate' (and 'createdDate', not a column
// here at all - see PatientMedicationToolbar's Sort-by dropdown) are sent to the server.
// 'genericName'/'dose'/'frequency'/'endDate'/'status' have no ORDER BY branch in either
// usp_PatientMedication_GetCurrent or usp_PatientMedication_Search - PatientMedicationTab
// sorts those client-side, current-page-only (see its SERVER_SORTABLE_BY_ENDPOINT
// comment) - a known, documented limitation until a future backend step adds real sort
// branches for them.
const COLUMNS = [
  { key: 'medicineName', label: 'Medicine', sortable: true },
  { key: 'genericName', label: 'Generic Name', sortable: true },
  { key: 'strength', label: 'Strength', sortable: false },
  { key: 'dosageForm', label: 'Dosage Form', sortable: false },
  { key: 'route', label: 'Route', sortable: false },
  { key: 'dose', label: 'Dose', sortable: true },
  { key: 'frequency', label: 'Frequency', sortable: true },
  { key: 'quantity', label: 'Quantity', sortable: false },
  { key: 'startDate', label: 'Start Date', sortable: true },
  { key: 'endDate', label: 'End Date', sortable: true },
  { key: 'prn', label: 'PRN', sortable: false },
  { key: 'status', label: 'Status', sortable: true },
  // No ORDER BY branch either (a computed CASE expression, not a real column) - and only
  // usp_PatientMedication_GetCurrent populates it at all (Patient Medication and
  // Prescription Synchronization's own deliberate scope trim); blank for Search results.
  { key: 'prescriptionLinkStatus', label: 'Prescription', sortable: false },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

function SkeletonRows({ columnCount, rowCount = 5 }) {
  return (
    <>
      {Array.from({ length: rowCount }, (_, rowIndex) => (
        <tr key={rowIndex} aria-hidden="true">
          {Array.from({ length: columnCount }, (_, cellIndex) => (
            <td key={cellIndex}>
              <span className="placeholder col-8" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function PatientMedicationTable({
  medications,
  isLoading,
  hasLoadedOnce,
  error,
  onRetry,
  sortBy,
  sortDirection,
  onSort,
  hasActiveFilters,
  onClearFilters,
  onAddMedication,
  page,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  selectedIds,
  onToggleSelected,
  onToggleSelectAll,
  onStop,
  onResume,
  loadingResumeRowId,
}) {
  const { hasRole } = useAuth();
  const canEdit = hasRole(ROLES.SYSTEM_ADMINISTRATOR, ROLES.DOCTOR);

  // +1 for the leading checkbox column, +1 for the trailing Actions column.
  const columnCount = COLUMNS.length + 2;

  const selectableIds = medications.filter((medication) => medication.status?.code === 'ACTIVE').map((m) => m.patientMedicationId);
  const allSelectableChecked = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));

  const showSkeleton = isLoading && !hasLoadedOnce;
  const showRefreshOverlay = isLoading && hasLoadedOnce;

  function handleHeaderKeyDown(event, column) {
    if (!column.sortable) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSort(column.key);
    }
  }

  function ariaSortFor(column) {
    if (!column.sortable || sortBy !== column.key) {
      return 'none';
    }
    return sortDirection === 'asc' ? 'ascending' : 'descending';
  }

  return (
    <div className="card border-0 shadow-sm rounded-3">
      <div className="visually-hidden" aria-live="polite" role="status">
        {showSkeleton && 'Loading patient medications…'}
        {showRefreshOverlay && 'Refreshing patient medication list…'}
        {!isLoading && error && `Error loading patient medications: ${error}`}
        {!isLoading && !error && `Showing ${medications.length} of ${totalCount} patient medications.`}
      </div>

      <div className="position-relative">
        {showRefreshOverlay && (
          <div
            className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)', zIndex: 2 }}
          >
            <span className="spinner-border text-primary" aria-hidden="true" />
          </div>
        )}

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <caption className="visually-hidden">List of this patient's medications, sortable and paginated</caption>
            <thead className="table-light">
              <tr>
                <th scope="col">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={allSelectableChecked}
                    onChange={() => onToggleSelectAll(selectableIds)}
                    disabled={selectableIds.length === 0}
                    aria-label="Select all active medications on this page"
                  />
                </th>
                {COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    role={column.sortable ? 'button' : undefined}
                    tabIndex={column.sortable ? 0 : undefined}
                    onClick={column.sortable ? () => onSort(column.key) : undefined}
                    onKeyDown={(event) => handleHeaderKeyDown(event, column)}
                    aria-sort={ariaSortFor(column)}
                    className={column.sortable ? 'user-select-none' : undefined}
                    style={column.sortable ? { cursor: 'pointer' } : undefined}
                  >
                    {column.label}
                    {column.sortable && sortBy === column.key && (
                      <i
                        className={`bi ${sortDirection === 'asc' ? 'bi-caret-up-fill' : 'bi-caret-down-fill'} ms-1 small`}
                        aria-hidden="true"
                      />
                    )}
                  </th>
                ))}
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {showSkeleton && <SkeletonRows columnCount={columnCount} />}

              {!isLoading && error && (
                <tr>
                  <td colSpan={columnCount} className="text-center py-5">
                    <i className="bi bi-exclamation-triangle text-danger me-2" aria-hidden="true" />
                    <span className="text-danger">{error}</span>
                    <div className="mt-3">
                      <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onRetry}>
                        <i className="bi bi-arrow-clockwise me-1" aria-hidden="true" />
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {!showSkeleton && !error && medications.length === 0 && (
                <tr>
                  <td colSpan={columnCount} className="text-center text-muted py-5">
                    <div className="mb-2">No medications found for this patient.</div>
                    {hasActiveFilters ? (
                      <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClearFilters}>
                        Clear Filters
                      </button>
                    ) : (
                      <button type="button" className="btn btn-primary btn-sm" onClick={onAddMedication}>
                        <i className="bi bi-plus-lg me-1" aria-hidden="true" />
                        Add Medication
                      </button>
                    )}
                  </td>
                </tr>
              )}

              {!showSkeleton &&
                !error &&
                medications.map((medication) => {
                  const isActive = medication.status?.code === 'ACTIVE';
                  const isStopped = medication.status?.code === 'STOPPED';

                  return (
                    <tr key={medication.patientMedicationId}>
                      <td>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selectedIds.has(medication.patientMedicationId)}
                          onChange={() => onToggleSelected(medication.patientMedicationId)}
                          disabled={!isActive}
                          title={isActive ? undefined : 'Only active medications can be selected'}
                          aria-label={`Select ${medication.medicineName} for prescription generation`}
                        />
                      </td>
                      <td>{medication.medicineName}</td>
                      <td>{medication.genericName}</td>
                      <td>{medication.strength}</td>
                      <td>{medication.dosageForm?.displayText}</td>
                      <td>{medication.route?.displayText}</td>
                      <td>
                        {medication.dose} {medication.doseUnit?.displayText}
                      </td>
                      <td>{medication.frequency?.displayText}</td>
                      <td>{medication.quantity}</td>
                      <td>{formatDate(medication.startDate)}</td>
                      <td>{formatDate(medication.endDate)}</td>
                      <td>
                        {medication.prn ? (
                          <span className="badge rounded-pill text-bg-info">PRN</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <span className={`badge rounded-pill text-bg-${isActive ? 'success' : 'secondary'}`}>
                          {medication.status?.displayText}
                        </span>
                      </td>
                      <td>
                        <PatientMedicationPrescriptionBadge status={medication.prescriptionLinkStatus} />
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <Link
                            to={`/patients/${medication.patientId}/medications/${medication.patientMedicationId}`}
                            className="btn btn-sm btn-outline-secondary"
                            title="View"
                            aria-label={`View ${medication.medicineName}`}
                          >
                            <i className="bi bi-eye" aria-hidden="true" />
                          </Link>
                          {canEdit && isActive ? (
                            <Link
                              to={`/patients/${medication.patientId}/medications/${medication.patientMedicationId}/edit`}
                              className="btn btn-sm btn-outline-secondary"
                              title="Edit"
                              aria-label={`Edit ${medication.medicineName}`}
                            >
                              <i className="bi bi-pencil" aria-hidden="true" />
                            </Link>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              disabled
                              title={
                                !isActive
                                  ? 'A stopped medication is read-only and cannot be edited'
                                  : 'You do not have permission to edit patient medications'
                              }
                              aria-label={`Edit ${medication.medicineName} (unavailable)`}
                            >
                              <i className="bi bi-pencil" aria-hidden="true" />
                            </button>
                          )}
                          {isActive && canEdit && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-warning"
                              onClick={() => onStop(medication)}
                              title="Stop Medication"
                              aria-label={`Stop ${medication.medicineName}`}
                            >
                              <i className="bi bi-stop-circle" aria-hidden="true" />
                            </button>
                          )}
                          {isStopped && canEdit && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success"
                              onClick={() => onResume(medication)}
                              disabled={loadingResumeRowId === medication.patientMedicationId}
                              title="Resume Medication"
                              aria-label={`Resume ${medication.medicineName}`}
                            >
                              {loadingResumeRowId === medication.patientMedicationId ? (
                                <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                              ) : (
                                <i className="bi bi-play-circle" aria-hidden="true" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {!showSkeleton && !error && medications.length > 0 && (
        <div className="card-footer bg-white border-0 d-flex flex-wrap justify-content-between align-items-center gap-2 py-3">
          <div className="d-flex align-items-center gap-3">
            <span className="text-muted small">
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount} · Page{' '}
              {page} of {totalPages}
            </span>

            <div className="d-flex align-items-center gap-1">
              <label htmlFor="patientMedicationPageSizeSelect" className="form-label small text-muted mb-0">
                Rows per page
              </label>
              <select
                id="patientMedicationPageSizeSelect"
                className="form-select form-select-sm w-auto"
                value={pageSize}
                onChange={(event) => onPageSizeChange(Number(event.target.value))}
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <nav aria-label="Patient medication list pagination">
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                <button
                  type="button"
                  className="page-link"
                  onClick={() => onPageChange(1)}
                  aria-label="First page"
                  disabled={page === 1}
                >
                  First
                </button>
              </li>
              <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                <button
                  type="button"
                  className="page-link"
                  onClick={() => onPageChange(page - 1)}
                  aria-label="Previous page"
                  disabled={page === 1}
                >
                  Previous
                </button>
              </li>
              <li className="page-item active">
                <span className="page-link" aria-current="page">
                  {page}
                </span>
              </li>
              <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                <button
                  type="button"
                  className="page-link"
                  onClick={() => onPageChange(page + 1)}
                  aria-label="Next page"
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </li>
              <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                <button
                  type="button"
                  className="page-link"
                  onClick={() => onPageChange(totalPages)}
                  aria-label="Last page"
                  disabled={page === totalPages}
                >
                  Last
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
}

export default PatientMedicationTable;
