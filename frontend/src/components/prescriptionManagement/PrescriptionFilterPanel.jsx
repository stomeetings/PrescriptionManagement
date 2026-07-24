// Structured filters, separate from PrescriptionToolbar's search box + action buttons
// (this step's own component split). Status options come from the real seeded
// PrescriptionStatus lookup (DRAFT/PENDING/PROCESSING/SENT/DISPENSED/CANCELLED/FAILED/
// EXPIRED) - there is no separate "Ready For Review"/"Finalized" status row, so those
// labels from this task's literal wording are not offered here (see
// usp_Prescription_Search's own comment / the Step 18.8 Finalize reconciliation:
// "Finalized" is the PENDING status). Provider/Patient are plain numeric-id inputs, not
// dropdowns - see PrescriptionFilterRequest's own comment for why a Provider picker
// isn't built here (GET /api/users is Administrator-only and would 403 for most roles).
function PrescriptionFilterPanel({
  statusOptions,
  statusFilter,
  onStatusFilterChange,
  issueDateFrom,
  issueDateTo,
  onIssueDateFromChange,
  onIssueDateToChange,
  expiryDateFrom,
  expiryDateTo,
  onExpiryDateFromChange,
  onExpiryDateToChange,
  patientIdFilter,
  onPatientIdFilterChange,
  providerIdFilter,
  onProviderIdFilterChange,
}) {
  return (
    <div className="card border-0 shadow-sm rounded-3 mb-3">
      <div className="card-body">
        <div className="row g-2 align-items-end">
          <div className="col-6 col-md-2">
            <label htmlFor="prescriptionStatusFilter" className="form-label small text-muted mb-1">
              Status
            </label>
            <select
              id="prescriptionStatusFilter"
              className="form-select"
              value={statusFilter}
              onChange={(event) => onStatusFilterChange(event.target.value)}
              aria-label="Filter by status"
            >
              <option value="">All Statuses</option>
              {statusOptions.map((status) => (
                <option key={status.code} value={status.code}>
                  {status.displayText}
                </option>
              ))}
            </select>
          </div>

          <div className="col-6 col-md-2">
            <label htmlFor="prescriptionIssueDateFrom" className="form-label small text-muted mb-1">
              Issue Date From
            </label>
            <input
              id="prescriptionIssueDateFrom"
              type="date"
              className="form-control"
              value={issueDateFrom}
              onChange={(event) => onIssueDateFromChange(event.target.value)}
              aria-label="Issue date from"
            />
          </div>
          <div className="col-6 col-md-2">
            <label htmlFor="prescriptionIssueDateTo" className="form-label small text-muted mb-1">
              Issue Date To
            </label>
            <input
              id="prescriptionIssueDateTo"
              type="date"
              className="form-control"
              value={issueDateTo}
              onChange={(event) => onIssueDateToChange(event.target.value)}
              aria-label="Issue date to"
            />
          </div>

          <div className="col-6 col-md-2">
            <label htmlFor="prescriptionExpiryDateFrom" className="form-label small text-muted mb-1">
              Expiry Date From
            </label>
            <input
              id="prescriptionExpiryDateFrom"
              type="date"
              className="form-control"
              value={expiryDateFrom}
              onChange={(event) => onExpiryDateFromChange(event.target.value)}
              aria-label="Expiry date from"
            />
          </div>
          <div className="col-6 col-md-2">
            <label htmlFor="prescriptionExpiryDateTo" className="form-label small text-muted mb-1">
              Expiry Date To
            </label>
            <input
              id="prescriptionExpiryDateTo"
              type="date"
              className="form-control"
              value={expiryDateTo}
              onChange={(event) => onExpiryDateToChange(event.target.value)}
              aria-label="Expiry date to"
            />
          </div>

          <div className="col-6 col-md-1">
            <label htmlFor="prescriptionPatientIdFilter" className="form-label small text-muted mb-1">
              Patient ID
            </label>
            <input
              id="prescriptionPatientIdFilter"
              type="number"
              min="1"
              className="form-control"
              value={patientIdFilter}
              onChange={(event) => onPatientIdFilterChange(event.target.value)}
              aria-label="Filter by patient ID"
            />
          </div>
          <div className="col-6 col-md-1">
            <label htmlFor="prescriptionProviderIdFilter" className="form-label small text-muted mb-1">
              Provider ID
            </label>
            <input
              id="prescriptionProviderIdFilter"
              type="number"
              min="1"
              className="form-control"
              value={providerIdFilter}
              onChange={(event) => onProviderIdFilterChange(event.target.value)}
              aria-label="Filter by provider ID"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default PrescriptionFilterPanel;
