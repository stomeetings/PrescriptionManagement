import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { ROLES } from '../../auth/roles.js';

// Mirrors the backend's usp_Patient_GetAll/Search sortBy support exactly (see
// PatientTable's COLUMNS comment) - Gender/Status have no sort branch in those stored
// procedures, so they're filters only, not offered here as sort options.
const SORT_OPTIONS = [
  { value: 'patientNumber', label: 'Patient Number' },
  { value: 'fullName', label: 'Full Name' },
  { value: 'dateOfBirth', label: 'Date of Birth' },
  { value: 'createdDate', label: 'Created Date' },
  { value: 'updatedDate', label: 'Last Updated' },
];

function PatientToolbar({
  searchTerm,
  onSearchTermChange,
  genderFilter,
  onGenderFilterChange,
  genderOptions,
  statusFilter,
  onStatusFilterChange,
  onClearFilters,
  hasActiveFilters,
  activeFilterCount,
  sortBy,
  sortDirection,
  onSortByChange,
  onToggleSortDirection,
  onRefresh,
}) {
  const { hasRole } = useAuth();
  const canCreate = hasRole(ROLES.SYSTEM_ADMINISTRATOR, ROLES.DOCTOR, ROLES.RECEPTIONIST);

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
                placeholder="Search by patient number, name, mobile, or NHI number..."
                value={searchTerm}
                onChange={(event) => onSearchTermChange(event.target.value)}
                aria-label="Search patients"
              />
            </div>
          </div>

          <div className="col-6 col-md-2">
            <select
              className="form-select"
              value={genderFilter}
              onChange={(event) => onGenderFilterChange(event.target.value)}
              aria-label="Filter by gender"
            >
              <option value="">All Genders</option>
              {genderOptions.map((gender) => (
                <option key={gender.code} value={gender.code}>
                  {gender.displayText}
                </option>
              ))}
            </select>
          </div>

          <div className="col-6 col-md-2">
            <select
              className="form-select"
              value={statusFilter}
              onChange={(event) => onStatusFilterChange(event.target.value)}
              aria-label="Filter by status"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="col-12 col-md-4 d-flex justify-content-md-end gap-2">
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
            {canCreate && (
              <Link to="/patients/create" className="btn btn-primary">
                <i className="bi bi-person-plus me-1" aria-hidden="true" />
                Create Patient
              </Link>
            )}
          </div>

          <div className="col-12 col-md-4">
            <div className="input-group">
              <label className="input-group-text bg-white" htmlFor="patientSortBySelect">
                Sort by
              </label>
              <select
                id="patientSortBySelect"
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
        </div>
      </div>
    </div>
  );
}

export default PatientToolbar;
