import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { ROLES } from '../../auth/roles.js';

// Gender/Mobile/NHI Number/Status have no sort branch in usp_Patient_GetAll/Search's
// ORDER BY CASE - offering a sort affordance the server can't actually honor would be a
// broken control, not a real feature (same reasoning as UserTable's PhoneNumber column).
// Last Updated (updatedDate) gained a sort branch in Step 9.6 specifically to support
// this column's sortability.
const COLUMNS = [
  { key: 'patientNumber', label: 'Patient Number', sortable: true },
  { key: 'fullName', label: 'Full Name', sortable: true },
  { key: 'dateOfBirth', label: 'Date of Birth', sortable: true },
  { key: 'age', label: 'Age', sortable: false },
  { key: 'gender', label: 'Gender', sortable: false },
  { key: 'mobileNumber', label: 'Mobile Number', sortable: false },
  { key: 'nhiNumber', label: 'NHI Number', sortable: false },
  { key: 'status', label: 'Status', sortable: false },
  { key: 'updatedDate', label: 'Last Updated', sortable: true },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : '—';
}

// Whole-years-old calculation - accounts for whether this year's birthday has
// occurred yet, not just a naive year subtraction.
function calculateAge(dateOfBirth) {
  if (!dateOfBirth) {
    return null;
  }

  const birthDate = new Date(dateOfBirth);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

  if (!hasHadBirthdayThisYear) {
    age -= 1;
  }

  return age;
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

function PatientTable({
  patients,
  isLoading,
  hasLoadedOnce,
  error,
  onRetry,
  sortBy,
  sortDirection,
  onSort,
  onActivate,
  onDeactivate,
  hasActiveFilters,
  onClearFilters,
  page,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) {
  const { hasRole } = useAuth();
  const canEdit = hasRole(ROLES.SYSTEM_ADMINISTRATOR, ROLES.DOCTOR, ROLES.RECEPTIONIST);
  const canActivateDeactivate = hasRole(ROLES.SYSTEM_ADMINISTRATOR);

  const columnCount = COLUMNS.length + 1;

  // First-ever load (nothing to show yet) gets the blank skeleton; a subsequent
  // refresh (new search/filter/sort/page while rows already exist) keeps those rows
  // on screen and layers a spinner overlay instead - existing data should never
  // disappear just because a new request is in flight.
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
      {/* aria-live region for screen readers - announces loading/result-count changes
          that are otherwise only conveyed visually (skeleton rows, overlay spinner). */}
      <div className="visually-hidden" aria-live="polite" role="status">
        {showSkeleton && 'Loading patients…'}
        {showRefreshOverlay && 'Refreshing patient list…'}
        {!isLoading && error && `Error loading patients: ${error}`}
        {!isLoading && !error && `Showing ${patients.length} of ${totalCount} patients.`}
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
            <caption className="visually-hidden">List of patients, sortable and paginated</caption>
            <thead className="table-light">
              <tr>
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

              {!showSkeleton && !error && patients.length === 0 && (
                <tr>
                  <td colSpan={columnCount} className="text-center text-muted py-5">
                    <div className="mb-2">No patients found.</div>
                    {hasActiveFilters && (
                      <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClearFilters}>
                        Clear Filters
                      </button>
                    )}
                  </td>
                </tr>
              )}

              {!showSkeleton &&
                !error &&
                patients.map((patient) => (
                <tr key={patient.patientId}>
                  <td>{patient.patientNumber}</td>
                  <td>{patient.fullName}</td>
                  <td>{formatDate(patient.dateOfBirth)}</td>
                  <td>{calculateAge(patient.dateOfBirth)}</td>
                  <td>{patient.gender?.displayText}</td>
                  <td>{patient.mobileNumber || '—'}</td>
                  <td>{patient.nhiNumber || '—'}</td>
                  <td>
                    <span className={`badge rounded-pill text-bg-${patient.isActive ? 'success' : 'secondary'}`}>
                      {patient.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{formatDateTime(patient.updatedDate)}</td>
                  <td>
                    <div className="d-flex gap-1">
                      <Link
                        to={`/patients/${patient.patientId}`}
                        className="btn btn-sm btn-outline-secondary"
                        title="View"
                        aria-label={`View ${patient.fullName}`}
                      >
                        <i className="bi bi-eye" aria-hidden="true" />
                      </Link>
                      {canEdit && (
                        <Link
                          to={`/patients/${patient.patientId}/edit`}
                          className="btn btn-sm btn-outline-secondary"
                          title="Edit"
                          aria-label={`Edit ${patient.fullName}`}
                        >
                          <i className="bi bi-pencil" aria-hidden="true" />
                        </Link>
                      )}
                      {canActivateDeactivate &&
                        (patient.isActive ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-warning"
                            onClick={() => onDeactivate(patient)}
                            title="Deactivate"
                            aria-label={`Deactivate ${patient.fullName}`}
                          >
                            <i className="bi bi-person-dash" aria-hidden="true" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success"
                            onClick={() => onActivate(patient)}
                            title="Activate"
                            aria-label={`Activate ${patient.fullName}`}
                          >
                            <i className="bi bi-person-check" aria-hidden="true" />
                          </button>
                        ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {!showSkeleton && !error && patients.length > 0 && (
        <div className="card-footer bg-white border-0 d-flex flex-wrap justify-content-between align-items-center gap-2 py-3">
          <div className="d-flex align-items-center gap-3">
            <span className="text-muted small">
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount} · Page{' '}
              {page} of {totalPages}
            </span>

            <div className="d-flex align-items-center gap-1">
              <label htmlFor="patientPageSizeSelect" className="form-label small text-muted mb-0">
                Rows per page
              </label>
              <select
                id="patientPageSizeSelect"
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

          <nav aria-label="Patient list pagination">
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

export default PatientTable;
