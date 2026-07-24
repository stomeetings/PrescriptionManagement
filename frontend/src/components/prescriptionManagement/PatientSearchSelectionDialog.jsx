import { useEffect, useState } from 'react';
import { searchPatients } from '../../api/patientsApi.js';
import { parseApiError } from '../../api/parseApiError.js';

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

const RESULT_PAGE_SIZE = 20;

// "New Prescription" must only ever pick an EXISTING patient - it must never let a user
// create a patient or search the Medicine Master from the Prescription module (mandatory,
// application-wide rule). This dialog is the only entry point into that workflow: search
// by NHI/First Name/Last Name/Date of Birth (discrete, independently-combinable fields -
// not the Patient List page's single free-text box), pick one result, and the caller
// navigates straight to that patient's own Patient Medication grid - there is no "create
// patient" affordance anywhere in this component. status is hard-locked to Active (never
// exposed as a filter) - an inactive patient cannot receive a new prescription (matches
// PatientDetailsPage's own "Inactive patients cannot receive new prescriptions" rule and
// MedicineSearchDialog's identical status: 'Active' precedent), so this dialog never even
// shows a patient who couldn't proceed.
// No full pager is built for the results - capped at RESULT_PAGE_SIZE with a "refine your
// search" hint if there are more, since a modal picker's job is to narrow down to one
// specific patient, not browse a paginated list (that's what the Patient List page is for).
function PatientSearchSelectionDialog({ show, onSelect, onClose }) {
  const [nhi, setNhi] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [results, setResults] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (!show) {
      return;
    }

    setNhi('');
    setFirstName('');
    setLastName('');
    setDateOfBirth('');
    setHasSearched(false);
    setIsSearching(false);
    setSearchError('');
    setResults([]);
    setTotalCount(0);
    setValidationError('');
  }, [show]);

  useEffect(() => {
    if (!show) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isSearching) {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [show, isSearching, onClose]);

  async function handleSearch(event) {
    event.preventDefault();

    if (!nhi.trim() && !firstName.trim() && !lastName.trim() && !dateOfBirth) {
      setValidationError('Enter at least one search field.');
      return;
    }

    setValidationError('');
    setSearchError('');
    setIsSearching(true);
    setHasSearched(true);

    try {
      const result = await searchPatients({
        nhi: nhi.trim() || null,
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
        dateOfBirth: dateOfBirth || null,
        status: 'Active',
        page: 1,
        pageSize: RESULT_PAGE_SIZE,
        sortBy: 'lastName',
        sortDirection: 'asc',
      });
      setResults(result.items);
      setTotalCount(result.totalCount);
    } catch (fetchError) {
      const { generalMessage } = parseApiError(fetchError);
      setSearchError(generalMessage || 'Unable to search patients. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }

  function handleClear() {
    setNhi('');
    setFirstName('');
    setLastName('');
    setDateOfBirth('');
    setValidationError('');
  }

  if (!show) {
    return null;
  }

  return (
    <>
      <div className="modal d-block" tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="patientSearchSelectionDialogTitle">
        <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="patientSearchSelectionDialogTitle">
                Select Patient
              </h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
            </div>

            <div className="modal-body">
              <p className="text-muted small">
                Search for the patient to prescribe for. A prescription can only be generated from an existing patient's
                own medications.
              </p>

              <form onSubmit={handleSearch}>
                <div className="row g-2 mb-1">
                  <div className="col-12 col-md-3">
                    <label htmlFor="patientSearchNhi" className="form-label small text-muted mb-1">
                      NHI
                    </label>
                    <input
                      id="patientSearchNhi"
                      type="text"
                      className="form-control"
                      value={nhi}
                      onChange={(event) => setNhi(event.target.value)}
                    />
                  </div>
                  <div className="col-12 col-md-3">
                    <label htmlFor="patientSearchFirstName" className="form-label small text-muted mb-1">
                      First Name
                    </label>
                    <input
                      id="patientSearchFirstName"
                      type="text"
                      className="form-control"
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                    />
                  </div>
                  <div className="col-12 col-md-3">
                    <label htmlFor="patientSearchLastName" className="form-label small text-muted mb-1">
                      Last Name
                    </label>
                    <input
                      id="patientSearchLastName"
                      type="text"
                      className="form-control"
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                    />
                  </div>
                  <div className="col-12 col-md-3">
                    <label htmlFor="patientSearchDob" className="form-label small text-muted mb-1">
                      Date of Birth
                    </label>
                    <input
                      id="patientSearchDob"
                      type="date"
                      className="form-control"
                      value={dateOfBirth}
                      onChange={(event) => setDateOfBirth(event.target.value)}
                    />
                  </div>
                </div>

                {validationError && (
                  <div className="alert alert-warning py-2 mb-2" role="alert">
                    {validationError}
                  </div>
                )}

                <div className="d-flex gap-2 mb-3">
                  <button type="submit" className="btn btn-primary" disabled={isSearching}>
                    {isSearching ? <span className="spinner-border spinner-border-sm me-1" aria-hidden="true" /> : <i className="bi bi-search me-1" aria-hidden="true" />}
                    Search
                  </button>
                  <button type="button" className="btn btn-outline-secondary" onClick={handleClear} disabled={isSearching}>
                    Clear
                  </button>
                </div>
              </form>

              {searchError && (
                <div className="alert alert-danger mb-3" role="alert">
                  {searchError}
                </div>
              )}

              {hasSearched && !isSearching && !searchError && (
                <>
                  {results.length === 0 ? (
                    <p className="text-muted mb-0">No active patients matched your search.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead>
                          <tr>
                            <th scope="col">Patient Number</th>
                            <th scope="col">Name</th>
                            <th scope="col">NHI</th>
                            <th scope="col">Date of Birth</th>
                            <th scope="col" className="text-end">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.map((patient) => (
                            <tr key={patient.patientId}>
                              <td>{patient.patientNumber}</td>
                              <td>{patient.fullName}</td>
                              <td>{patient.nhiNumber || '—'}</td>
                              <td>{formatDate(patient.dateOfBirth)}</td>
                              <td className="text-end">
                                <button type="button" className="btn btn-sm btn-primary" onClick={() => onSelect(patient)}>
                                  Select
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {totalCount > RESULT_PAGE_SIZE && (
                        <p className="text-muted small mt-2 mb-0">
                          Showing {RESULT_PAGE_SIZE} of {totalCount} matches — refine your search to narrow the results.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}

export default PatientSearchSelectionDialog;
