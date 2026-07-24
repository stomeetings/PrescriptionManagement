import { useEffect, useRef, useState } from 'react';
import { searchMedicines } from '../../api/medicinesApi.js';
import { parseApiError } from '../../api/parseApiError.js';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 400;

const SORT_OPTIONS = [
  { value: 'medicineName', label: 'Medicine Name' },
  { value: 'medicineCode', label: 'Medicine Code' },
  { value: 'genericName', label: 'Generic Name' },
  { value: 'brandName', label: 'Brand Name' },
];

// Reusable across any future "pick a medicine" flow (not just Add Patient Medication) -
// searches Medicine Code/Name/Generic Name/Brand Name via the existing
// POST /api/medicines/search endpoint, hardcoding status: 'Active' so inactive medicines
// can never be selected (this task's own requirement - not exposed as a togglable
// filter). Bootstrap .modal visuals via plain React state, matching ConfirmDialog's
// established precedent (no bootstrap.bundle.js).
function MedicineSearchDialog({ show, onSelect, onCancel }) {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('medicineName');
  const [sortDirection, setSortDirection] = useState('asc');
  const [page, setPage] = useState(1);

  const [medicines, setMedicines] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const abortControllerRef = useRef(null);

  // Reset all dialog-local state every time it's reopened, so a previous search doesn't
  // linger the next time this dialog is used (e.g. after "Change Medicine").
  useEffect(() => {
    if (show) {
      setSearchInput('');
      setDebouncedSearchTerm('');
      setSortBy('medicineName');
      setSortDirection('asc');
      setPage(1);
    }
  }, [show]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearchTerm(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    if (!show) {
      return undefined;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError('');

    searchMedicines({
      searchTerm: debouncedSearchTerm.trim() || null,
      status: 'Active',
      page,
      pageSize: PAGE_SIZE,
      sortBy,
      sortDirection,
      signal: controller.signal,
    })
      .then((result) => {
        setMedicines(result.items);
        setTotalCount(result.totalCount);
        setTotalPages(result.totalPages);
      })
      .catch((fetchError) => {
        if (fetchError?.code === 'ERR_CANCELED') {
          return;
        }
        const { generalMessage } = parseApiError(fetchError);
        setError(generalMessage || 'Unable to search medicines. Please try again.');
      })
      .finally(() => {
        if (abortControllerRef.current === controller) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [show, debouncedSearchTerm, sortBy, sortDirection, page]);

  if (!show) {
    return null;
  }

  return (
    <>
      <div className="modal d-block" tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="medicineSearchDialogTitle">
        <div className="modal-dialog modal-lg modal-dialog-scrollable" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="medicineSearchDialogTitle">
                Select Medicine
              </h5>
              <button type="button" className="btn-close" onClick={onCancel} aria-label="Close" />
            </div>

            <div className="modal-body">
              <div className="row g-2 align-items-center mb-3">
                <div className="col-12 col-md-8">
                  <div className="input-group">
                    <span className="input-group-text bg-white">
                      <i className="bi bi-search" aria-hidden="true" />
                    </span>
                    <input
                      type="search"
                      className="form-control"
                      placeholder="Search by medicine code, name, generic name, or brand name..."
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      aria-label="Search medicines"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="col-12 col-md-4">
                  <div className="input-group">
                    <label className="input-group-text bg-white" htmlFor="medicineSearchSortBy">
                      Sort by
                    </label>
                    <select
                      id="medicineSearchSortBy"
                      className="form-select"
                      value={sortBy}
                      onChange={(event) => {
                        setSortBy(event.target.value);
                        setPage(1);
                      }}
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
                      onClick={() => {
                        setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
                        setPage(1);
                      }}
                      aria-label={`Sort ${sortDirection === 'asc' ? 'ascending' : 'descending'}, click to toggle`}
                      title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                    >
                      <i className={`bi ${sortDirection === 'asc' ? 'bi-sort-up' : 'bi-sort-down'}`} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <caption className="visually-hidden">Active medicines matching your search</caption>
                  <thead className="table-light">
                    <tr>
                      <th scope="col">Code</th>
                      <th scope="col">Medicine Name</th>
                      <th scope="col">Generic Name</th>
                      <th scope="col">Brand Name</th>
                      <th scope="col">Strength</th>
                      <th scope="col">Form</th>
                      <th scope="col">Route</th>
                      <th scope="col">
                        <span className="visually-hidden">Select</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading && (
                      <tr>
                        <td colSpan={8} className="text-center py-4">
                          <span className="spinner-border spinner-border-sm text-primary me-2" aria-hidden="true" />
                          Searching…
                        </td>
                      </tr>
                    )}

                    {!isLoading && error && (
                      <tr>
                        <td colSpan={8} className="text-center text-danger py-4">
                          <i className="bi bi-exclamation-triangle me-2" aria-hidden="true" />
                          {error}
                        </td>
                      </tr>
                    )}

                    {!isLoading && !error && medicines.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center text-muted py-4">
                          No active medicines found.
                        </td>
                      </tr>
                    )}

                    {!isLoading &&
                      !error &&
                      medicines.map((medicine) => (
                        <tr key={medicine.medicineId}>
                          <td>{medicine.medicineCode}</td>
                          <td>{medicine.medicineName}</td>
                          <td>{medicine.genericName}</td>
                          <td>{medicine.brandName || '—'}</td>
                          <td>{medicine.strength}</td>
                          <td>{medicine.medicineForm?.displayText}</td>
                          <td>{medicine.medicineRoute?.displayText}</td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() => onSelect(medicine)}
                              aria-label={`Select ${medicine.medicineName}`}
                            >
                              Select
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {!isLoading && !error && medicines.length > 0 && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <span className="text-muted small">
                    Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
                  </span>

                  <nav aria-label="Medicine search results pagination">
                    <ul className="pagination pagination-sm mb-0">
                      <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                        <button
                          type="button"
                          className="page-link"
                          onClick={() => setPage((current) => current - 1)}
                          aria-label="Previous page"
                          disabled={page === 1}
                        >
                          Previous
                        </button>
                      </li>
                      <li className="page-item active">
                        <span className="page-link" aria-current="page">
                          {page} of {totalPages}
                        </span>
                      </li>
                      <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                        <button
                          type="button"
                          className="page-link"
                          onClick={() => setPage((current) => current + 1)}
                          aria-label="Next page"
                          disabled={page === totalPages}
                        >
                          Next
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}

export default MedicineSearchDialog;
