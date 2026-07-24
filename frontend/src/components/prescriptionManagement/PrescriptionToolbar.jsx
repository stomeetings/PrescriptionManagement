import { useAuth } from '../../auth/AuthContext.jsx';
import { ROLES } from '../../auth/roles.js';

// Prescription Management List's own toolbar - a different component from
// components/patientManagement/PrescriptionToolbar.jsx (the read-only info bar inside
// the Preview Dialog, Step 18.2). Same name, deliberately, since the task named it that;
// no collision because each lives in its own feature folder, matching this project's
// per-module component-folder convention (patientManagement/medicineManagement/
// userManagement/prescriptionManagement).
function PrescriptionToolbar({
  searchTerm,
  onSearchTermChange,
  onClearFilters,
  hasActiveFilters,
  activeFilterCount,
  onRefresh,
  onExport,
  onNewPrescription,
}) {
  const { hasRole } = useAuth();
  // Matches Generate Prescription's own established authorization tier
  // (patient-medications/api-spec.md: SYSTEM_ADMINISTRATOR, DOCTOR only) - this button is
  // just a new, real entry point into that same, already-role-restricted action.
  const canCreatePrescription = hasRole(ROLES.SYSTEM_ADMINISTRATOR, ROLES.DOCTOR);
  return (
    <div className="card border-0 shadow-sm rounded-3 mb-3">
      <div className="card-body">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-5">
            <div className="input-group">
              <span className="input-group-text bg-white">
                <i className="bi bi-search" aria-hidden="true" />
              </span>
              <input
                type="search"
                className="form-control"
                placeholder="Search by prescription number, patient, NHI, medicine, or provider..."
                value={searchTerm}
                onChange={(event) => onSearchTermChange(event.target.value)}
                aria-label="Search prescriptions"
              />
            </div>
          </div>

          <div className="col-12 col-md-7 d-flex justify-content-md-end gap-2 flex-wrap">
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
              <i className="bi bi-arrow-clockwise me-1" aria-hidden="true" />
              Refresh
            </button>
            {/* No export capability exists anywhere in this backend yet - a stub,
                matching this project's established "button exists before its own step"
                precedent, rather than a silently-broken control. */}
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onExport}
              title="Export will be available in a future release"
            >
              <i className="bi bi-download me-1" aria-hidden="true" />
              Export
            </button>
            {/* "New Prescription" must only ever select an EXISTING patient - it opens
                PatientSearchSelectionDialog (owned by PrescriptionListPage), never a
                "create patient" form and never a Medicine Master search. Selecting a
                patient there navigates straight to that patient's own Patient
                Medication grid, where Generate Prescription already lives. */}
            {canCreatePrescription && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={onNewPrescription}
                title="Search for an existing patient to generate a prescription from their medications"
              >
                <i className="bi bi-file-earmark-plus me-1" aria-hidden="true" />
                New Prescription
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PrescriptionToolbar;
