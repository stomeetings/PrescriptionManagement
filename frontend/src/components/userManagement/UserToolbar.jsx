import { Link } from 'react-router-dom';
import { ROLE_OPTIONS } from '../../auth/roles.js';

// Mirrors the backend's usp_User_GetAll/Search sortBy support exactly (see UserTable's
// COLUMNS comment). "Created Date" has no visible column in the table, so it's only
// reachable through this dropdown - not from clicking a column header.
const SORT_OPTIONS = [
  { value: 'fullName', label: 'Full Name' },
  { value: 'username', label: 'Username' },
  { value: 'email', label: 'Email' },
  { value: 'role', label: 'Role' },
  { value: 'status', label: 'Status' },
  { value: 'createdDate', label: 'Created Date' },
  { value: 'lastLoginDate', label: 'Last Login' },
];

function UserToolbar({
  searchTerm,
  onSearchTermChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  onClearFilters,
  hasActiveFilters,
  sortBy,
  sortDirection,
  onSortByChange,
  onToggleSortDirection,
  onRefresh,
}) {
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
                placeholder="Search by name, username, or email..."
                value={searchTerm}
                onChange={(event) => onSearchTermChange(event.target.value)}
                aria-label="Search users"
              />
            </div>
          </div>

          <div className="col-6 col-md-2">
            <select
              className="form-select"
              value={roleFilter}
              onChange={(event) => onRoleFilterChange(event.target.value)}
              aria-label="Filter by role"
            >
              <option value="">All Roles</option>
              {ROLE_OPTIONS.map((role) => (
                <option key={role.code} value={role.code}>
                  {role.label}
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
              className="btn btn-outline-secondary"
              onClick={onClearFilters}
              disabled={!hasActiveFilters}
            >
              Clear Filters
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={onRefresh} aria-label="Refresh list">
              <i className="bi bi-arrow-clockwise" aria-hidden="true" />
            </button>
            <Link to="/user-management/create" className="btn btn-primary">
              <i className="bi bi-person-plus me-1" aria-hidden="true" />
              Create User
            </Link>
          </div>

          <div className="col-12 col-md-4">
            <div className="input-group">
              <label className="input-group-text bg-white" htmlFor="sortBySelect">
                Sort by
              </label>
              <select
                id="sortBySelect"
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

export default UserToolbar;
