function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

// Confirmation modal matching ConfirmDialog/PatientMedicationStopDialog's established
// plain-React .modal pattern (no bootstrap.bundle.js) - a dedicated component rather than
// reusing the generic ConfirmDialog, since this step's spec calls for a specific summary
// (Patient/Prescription Number/Medication Count/Issue Date/Expiry Date) that a bare
// yes/no confirm can't show. Finalizing is irreversible from this UI (no un-finalize
// action exists), so the warning is shown unconditionally, not just on a destructive
// variant.
function PrescriptionFinalizeConfirmDialog({ show, patientName, prescriptionNumber, medicationCount, issueDate, expiryDate, isFinalizing, onConfirm, onCancel }) {
  if (!show) {
    return null;
  }

  return (
    <>
      <div className="modal d-block" tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="prescriptionFinalizeConfirmTitle">
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="prescriptionFinalizeConfirmTitle">
                Finalize Prescription
              </h5>
              <button type="button" className="btn-close" onClick={onCancel} aria-label="Close" disabled={isFinalizing} />
            </div>
            <div className="modal-body">
              <dl className="row mb-3">
                <dt className="col-5 text-muted">Patient</dt>
                <dd className="col-7">{patientName || '—'}</dd>
                <dt className="col-5 text-muted">Prescription Number</dt>
                <dd className="col-7">{prescriptionNumber || '—'}</dd>
                <dt className="col-5 text-muted">Medication Count</dt>
                <dd className="col-7">{medicationCount}</dd>
                <dt className="col-5 text-muted">Issue Date</dt>
                <dd className="col-7">{formatDate(issueDate)}</dd>
                <dt className="col-5 text-muted">Expiry Date</dt>
                <dd className="col-7">{formatDate(expiryDate)}</dd>
              </dl>
              <div className="alert alert-warning mb-0" role="alert">
                <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true" />
                After finalization this prescription cannot be edited.
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onCancel} disabled={isFinalizing}>
                Cancel
              </button>
              <button type="button" className="btn btn-warning" onClick={onConfirm} disabled={isFinalizing}>
                {isFinalizing ? <span className="spinner-border spinner-border-sm me-1" aria-hidden="true" /> : null}
                Finalize
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}

export default PrescriptionFinalizeConfirmDialog;
