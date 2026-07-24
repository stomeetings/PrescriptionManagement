import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { ROLES } from '../../auth/roles.js';

// Offers every column PatientMedicationTable's headers can sort by, plus 'createdDate'
// (not a displayed column at all) - mirrors PatientToolbar/MedicineToolbar's identical
// precedent of a "Sort by" dropdown covering columns beyond what's visible in the table.
// 'genericName'/'dose'/'frequency'/'endDate'/'status' have no server-side ORDER BY
// branch in usp_PatientMedication_GetCurrent/Search (only medicineName/startDate do,
// createdDate only via Search) - PatientMedicationTab sorts those client-side,
// current-page-only, a documented limitation rather than a silent gap.
const SORT_OPTIONS = [
  { value: 'medicineName', label: 'Medicine Name' },
  { value: 'genericName', label: 'Generic Name' },
  { value: 'startDate', label: 'Start Date' },
  { value: 'endDate', label: 'End Date' },
  { value: 'dose', label: 'Dose' },
  { value: 'frequency', label: 'Frequency' },
  { value: 'status', label: 'Status' },
  { value: 'createdDate', label: 'Created Date' },
];

function PatientMedicationToolbar({
  patientId,
  searchTerm,
  onSearchTermChange,
  statusFilter,
  onStatusFilterChange,
  prnFilter,
  onPrnFilterChange,
  startDateFrom,
  onStartDateFromChange,
  startDateTo,
  onStartDateToChange,
  endDateFrom,
  onEndDateFromChange,
  endDateTo,
  onEndDateToChange,
  onClearFilters,
  hasActiveFilters,
  activeFilterCount,
  sortBy,
  sortDirection,
  onSortByChange,
  onToggleSortDirection,
  onRefresh,
  selectedActiveCount,
  onGeneratePrescription,
}) {
  const { hasRole } = useAuth();
  const canManage = hasRole(ROLES.SYSTEM_ADMINISTRATOR, ROLES.DOCTOR);

  return (
    <div className="card border-0 shadow-sm rounded-3 mb-3">
      <div className="card-body">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-4">
            <div className="input-group">
              <span className="input-group-text bg-white">
                <i className="bi bi-search" aria-hidden="true" />
              </span>
              <input
                type="search"
                className="form-control"
                placeholder="Search by medicine name or generic name..."
                value={searchTerm}
                onChange={(event) => onSearchTermChange(event.target.value)}
                aria-label="Search patient medications"
              />
            </div>
            {/* usp_PatientMedication_Search's @SearchTerm only matches Patient name and
                Medicine Name/Generic Name - Medicine Code, Brand Name, and Instructions
                are not matched server-side today (no such capability exists in the
                approved backend), so they're deliberately left out of the placeholder
                text above rather than implying they work. */}
          </div>

          <div className="col-6 col-md-2">
            <select
              className="form-select"
              value={statusFilter}
              onChange={(event) => onStatusFilterChange(event.target.value)}
              aria-label="Filter by medication status"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Current</option>
              <option value="STOPPED">Stopped</option>
            </select>
          </div>

          <div className="col-6 col-md-2">
            <select
              className="form-select"
              value={prnFilter}
              onChange={(event) => onPrnFilterChange(event.target.value)}
              aria-label="Filter by PRN"
            >
              <option value="">PRN: All</option>
              <option value="true">PRN Only</option>
              <option value="false">Non-PRN Only</option>
            </select>
          </div>

          <div className="col-12 col-md-4 d-flex justify-content-md-end gap-2 flex-wrap">
            <button
              type="button"
              className="btn btn-outline-secondary position-relative"
              onClick={onClearFilters}
              disabled={!hasActiveFilters}
            >
              Clear Filters
              {activeFilterCount > 0 && (
                <span className="badge rounded-pill text-bg-primary ms-1" aria-label={`${activeFilterCount} active filters`}>
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={onRefresh} aria-label="Refresh list">
              <i className="bi bi-arrow-clockwise" aria-hidden="true" />
            </button>
          </div>

          <div className="col-12 col-md-3">
            <div className="input-group">
              <span className="input-group-text bg-white">Start</span>
              <input
                type="date"
                className="form-control"
                value={startDateFrom}
                onChange={(event) => onStartDateFromChange(event.target.value)}
                aria-label="Start date from"
              />
              <span className="input-group-text bg-white">to</span>
              <input
                type="date"
                className="form-control"
                value={startDateTo}
                onChange={(event) => onStartDateToChange(event.target.value)}
                aria-label="Start date to"
              />
            </div>
          </div>

          <div className="col-12 col-md-3">
            <div className="input-group">
              <span className="input-group-text bg-white">End</span>
              <input
                type="date"
                className="form-control"
                value={endDateFrom}
                onChange={(event) => onEndDateFromChange(event.target.value)}
                aria-label="End date from"
              />
              <span className="input-group-text bg-white">to</span>
              <input
                type="date"
                className="form-control"
                value={endDateTo}
                onChange={(event) => onEndDateToChange(event.target.value)}
                aria-label="End date to"
              />
            </div>
          </div>

          <div className="col-12 col-md-6">
            <div className="input-group">
              <label className="input-group-text bg-white" htmlFor="patientMedicationSortBySelect">
                Sort by
              </label>
              <select
                id="patientMedicationSortBySelect"
                className="form-select"
                value={sortBy}
                onChange={(event) => onSortByChange(event.target.value)}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onToggleSortDirection}
                aria-label={`Sort ${sortDirection === 'asc' ? 'ascending' : 'descending'}, click to toggle`}
                title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
              >
                <i className={`bi ${sortDirection === 'asc' ? 'bi-sort-up' : 'bi-sort-down'}`} aria-hidden="true" />
              </button>
            </div>
          </div>

          {canManage && (
            <div className="col-12 d-flex justify-content-md-end gap-2 flex-wrap">
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={onGeneratePrescription}
                disabled={selectedActiveCount === 0}
                title={
                  selectedActiveCount === 0
                    ? 'Select at least one active medication to generate a prescription'
                    : undefined
                }
              >
                <i className="bi bi-file-earmark-medical me-1" aria-hidden="true" />
                Generate Prescription
                {selectedActiveCount > 0 && (
                  <span className="badge rounded-pill text-bg-light text-primary ms-2">{selectedActiveCount}</span>
                )}
              </button>

              <Link to={`/patients/${patientId}/medications/add`} className="btn btn-primary">
                <i className="bi bi-plus-lg me-1" aria-hidden="true" />
                Add Medication
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PatientMedicationToolbar;
