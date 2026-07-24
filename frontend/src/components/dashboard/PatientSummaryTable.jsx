import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const PAGE_SIZE = 5;

const COLUMNS = [
  { key: 'patientId', label: 'Patient ID' },
  { key: 'fullName', label: 'Full Name' },
  { key: 'gender', label: 'Gender' },
  { key: 'phone', label: 'Phone' },
  { key: 'status', label: 'Status' },
];

// Real recent-patients data now (DashboardPage fetches the latest patients and maps
// them into this shape - patientId is the display PatientNumber string, id is the real
// numeric PatientId the View/Edit actions route with). Search/sort/pagination stay
// client-side over whatever page of patients was fetched - this is a dashboard widget
// showing the most recent patients, not a replacement for the full Patient List/Search
// page.
function PatientSummaryTable({ patients, isLoading, error, onRetry }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState('patientId');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return patients;
    }

    return patients.filter((patient) =>
      [patient.patientId, patient.fullName, patient.phone].some((field) =>
        String(field || '').toLowerCase().includes(term),
      ),
    );
  }, [patients, searchTerm]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const comparison = String(a[sortKey]).localeCompare(String(b[sortKey]));
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return copy;
  }, [filtered, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleSort(key) {
    if (key === sortKey) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  }

  function handleSearchChange(event) {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  }

  return (
    <div className="card border-0 shadow-sm rounded-3">
      <div className="card-header bg-white border-0 pt-3">
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
          <h2 className="h6 mb-0">Patient Summary</h2>
          <div className="input-group" style={{ maxWidth: 280 }}>
            <span className="input-group-text bg-white">
              <i className="bi bi-search" aria-hidden="true" />
            </span>
            <input
              type="search"
              className="form-control"
              placeholder="Search patients..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="card-body">
          <div className="alert alert-danger d-flex justify-content-between align-items-center mb-0" role="alert">
            <span>{error}</span>
            {onRetry && (
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={onRetry}>
                <i className="bi bi-arrow-clockwise me-1" aria-hidden="true" />
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {!error && isLoading && (
        <div className="card-body text-center py-4">
          <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
          Loading recent patients…
        </div>
      )}

      {!error && !isLoading && (
      <>
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  role="button"
                  onClick={() => handleSort(column.key)}
                  className="user-select-none"
                >
                  {column.label}
                  {sortKey === column.key && (
                    <i
                      className={`bi ${sortDirection === 'asc' ? 'bi-caret-up-fill' : 'bi-caret-down-fill'} ms-1 small`}
                      aria-hidden="true"
                    />
                  )}
                </th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="text-center text-muted py-4">
                  No patients match your search.
                </td>
              </tr>
            )}

            {paginated.map((patient) => (
              <tr key={patient.patientId}>
                <td>{patient.patientId}</td>
                <td>{patient.fullName}</td>
                <td>{patient.gender}</td>
                <td>{patient.phone}</td>
                <td>
                  <span
                    className={`badge rounded-pill text-bg-${patient.status === 'Active' ? 'success' : 'secondary'}`}
                  >
                    {patient.status}
                  </span>
                </td>
                <td>
                  <Link to={`/patients/${patient.id}`} className="btn btn-sm btn-outline-secondary me-1" title="View Patient">
                    <i className="bi bi-eye" aria-hidden="true" />
                  </Link>
                  <Link to={`/patients/${patient.id}/edit`} className="btn btn-sm btn-outline-secondary" title="Edit Patient">
                    <i className="bi bi-pencil" aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card-footer bg-white border-0 d-flex justify-content-between align-items-center pb-3">
        <span className="text-muted small">
          Showing {paginated.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}-
          {Math.min(safePage * PAGE_SIZE, sorted.length)} of {sorted.length}
        </span>

        <nav aria-label="Patient summary pagination">
          <ul className="pagination pagination-sm mb-0">
            <li className={`page-item ${safePage === 1 ? 'disabled' : ''}`}>
              <button type="button" className="page-link" onClick={() => setCurrentPage(safePage - 1)}>
                Previous
              </button>
            </li>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
              <li key={page} className={`page-item ${page === safePage ? 'active' : ''}`}>
                <button type="button" className="page-link" onClick={() => setCurrentPage(page)}>
                  {page}
                </button>
              </li>
            ))}
            <li className={`page-item ${safePage === totalPages ? 'disabled' : ''}`}>
              <button type="button" className="page-link" onClick={() => setCurrentPage(safePage + 1)}>
                Next
              </button>
            </li>
          </ul>
        </nav>
      </div>
      </>
      )}
    </div>
  );
}

export default PatientSummaryTable;
