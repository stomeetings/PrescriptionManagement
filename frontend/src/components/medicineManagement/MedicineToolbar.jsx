import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { ROLES } from '../../auth/roles.js';

// Mirrors the backend's usp_Medicine_GetAll/Search sortBy support (extended in Step
// 12.6 to add strength/manufacturer sort branches) - Dosage Form/Route/Status/
// Controlled Drug have no sort branch in those stored procedures, so they're filters
// only, not offered here as sort options.
const SORT_OPTIONS = [
  { value: 'medicineCode', label: 'Medicine Code' },
  { value: 'medicineName', label: 'Medicine Name' },
  { value: 'genericName', label: 'Generic Name' },
  { value: 'brandName', label: 'Brand Name' },
  { value: 'strength', label: 'Strength' },
  { value: 'manufacturer', label: 'Manufacturer' },
  { value: 'createdDate', label: 'Created Date' },
];

function MedicineToolbar({
  searchTerm,
  onSearchTermChange,
  dosageFormFilter,
  onDosageFormFilterChange,
  dosageFormOptions,
  routeFilter,
  onRouteFilterChange,
  routeOptions,
  statusFilter,
  onStatusFilterChange,
  controlledDrugFilter,
  onControlledDrugFilterChange,
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
  const canCreate = hasRole(ROLES.SYSTEM_ADMINISTRATOR);

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
                placeholder="Search by code, name, generic name, brand, manufacturer, or ATC code..."
                value={searchTerm}
                onChange={(event) => onSearchTermChange(event.target.value)}
                aria-label="Search medicines"
              />
            </div>
          </div>

          <div className="col-6 col-md-2">
            <select
              className="form-select"
              value={dosageFormFilter}
              onChange={(event) => onDosageFormFilterChange(event.target.value)}
              aria-label="Filter by dosage form"
            >
              <option value="">All Dosage Forms</option>
              {dosageFormOptions.map((form) => (
                <option key={form.code} value={form.code}>
                  {form.displayText}
                </option>
              ))}
            </select>
          </div>

          <div className="col-6 col-md-2">
            <select
              className="form-select"
              value={routeFilter}
              onChange={(event) => onRouteFilterChange(event.target.value)}
              aria-label="Filter by route"
            >
              <option value="">All Routes</option>
              {routeOptions.map((route) => (
                <option key={route.code} value={route.code}>
                  {route.displayText}
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

          <div className="col-6 col-md-2">
            <select
              className="form-select"
              value={controlledDrugFilter}
              onChange={(event) => onControlledDrugFilterChange(event.target.value)}
              aria-label="Filter by controlled drug"
            >
              <option value="">All Medicines</option>
              <option value="true">Controlled Drug Only</option>
              <option value="false">Non-Controlled Only</option>
            </select>
          </div>

          <div className="col-12 col-md-6 d-flex justify-content-md-end gap-2">
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
              <Link to="/medicines/create" className="btn btn-primary">
                <i className="bi bi-capsule me-1" aria-hidden="true" />
                Create Medicine
              </Link>
            )}
          </div>

          <div className="col-12 col-md-6">
            <div className="input-group">
              <label className="input-group-text bg-white" htmlFor="medicineSortBySelect">
                Sort by
              </label>
              <select
                id="medicineSortBySelect"
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

export default MedicineToolbar;
