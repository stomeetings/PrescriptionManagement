import { Link } from 'react-router-dom';

// PhoneNumber deliberately excluded from sortability - the backend's usp_User_GetAll/
// Search only support sorting by these 7 fields (see the stored procedures' ORDER BY
// CASE branches); offering a sort affordance the server can't actually honor would be
// a broken control, not a real feature.
const COLUMNS = [
  { key: 'fullName', label: 'Full Name', sortable: true },
  { key: 'username', label: 'Username', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'phoneNumber', label: 'Phone', sortable: false },
  { key: 'role', label: 'Role', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'lastLoginDate', label: 'Last Login', sortable: true },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : '—';
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

function UserTable({
  users,
  isLoading,
  error,
  onRetry,
  sortBy,
  sortDirection,
  onSort,
  onActivate,
  onDeactivate,
  onResetPassword,
  currentUserAccountId,
  page,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) {
  const columnCount = COLUMNS.length + 1;

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
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <caption className="visually-hidden">List of system users, sortable and paginated</caption>
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
            {isLoading && <SkeletonRows columnCount={columnCount} />}

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

            {!isLoading && !error && users.length === 0 && (
              <tr>
                <td colSpan={columnCount} className="text-center text-muted py-5">
                  No users match your search.
                </td>
              </tr>
            )}

            {!isLoading &&
              !error &&
              users.map((user) => (
                <tr key={user.userAccountId}>
                  <td>{user.fullName}</td>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>{user.phoneNumber || '—'}</td>
                  <td>{user.role?.displayText}</td>
                  <td>
                    <span className={`badge rounded-pill text-bg-${user.isActive ? 'success' : 'secondary'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{formatDateTime(user.lastLoginDate)}</td>
                  <td>
                    <div className="d-flex gap-1">
                      <Link
                        to={`/user-management/${user.userAccountId}`}
                        className="btn btn-sm btn-outline-secondary"
                        title="View"
                        aria-label={`View ${user.fullName}`}
                      >
                        <i className="bi bi-eye" aria-hidden="true" />
                      </Link>
                      <Link
                        to={`/user-management/${user.userAccountId}/edit`}
                        className="btn btn-sm btn-outline-secondary"
                        title="Edit"
                        aria-label={`Edit ${user.fullName}`}
                      >
                        <i className="bi bi-pencil" aria-hidden="true" />
                      </Link>
                      {user.isActive ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-warning"
                          onClick={() => onDeactivate(user)}
                          disabled={user.userAccountId === currentUserAccountId}
                          title={
                            user.userAccountId === currentUserAccountId
                              ? 'You cannot deactivate your own account'
                              : 'Deactivate'
                          }
                          aria-label={`Deactivate ${user.fullName}`}
                        >
                          <i className="bi bi-person-dash" aria-hidden="true" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success"
                          onClick={() => onActivate(user)}
                          title="Activate"
                          aria-label={`Activate ${user.fullName}`}
                        >
                          <i className="bi bi-person-check" aria-hidden="true" />
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => onResetPassword(user)}
                        title="Reset Password"
                        aria-label={`Reset password for ${user.fullName}`}
                      >
                        <i className="bi bi-key" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!isLoading && !error && users.length > 0 && (
        <div className="card-footer bg-white border-0 d-flex flex-wrap justify-content-between align-items-center gap-2 py-3">
          <div className="d-flex align-items-center gap-3">
            <span className="text-muted small">
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount} · Page{' '}
              {page} of {totalPages}
            </span>

            <div className="d-flex align-items-center gap-1">
              <label htmlFor="pageSizeSelect" className="form-label small text-muted mb-0">
                Rows per page
              </label>
              <select
                id="pageSizeSelect"
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

          <nav aria-label="User list pagination">
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

export default UserTable;
