// Literal warning + Continue/Cancel, matching this feature's own exact mockup text - no
// info dump of Prescription Number/Patient/Provider/etc. (that belongs to the Details
// page's own cards, not repeated here) and no Reason input (neither this dialog's own
// spec nor the "After Success" mockup shows one) - Reason is a fixed, honest string
// ("Patient medication updated via Edit Patient Medication") set by the caller, since
// the real clinical reasoning is already captured as a structured before/after diff in
// PrescriptionItemAmendment, not free text a user types here.
function PrescriptionItemAmendmentDialog({ show, isProcessing, onContinue, onCancel }) {
  if (!show) {
    return null;
  }

  return (
    <>
      <div className="modal d-block" tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="prescriptionItemAmendmentDialogTitle">
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="prescriptionItemAmendmentDialogTitle">
                Active Prescription Item
              </h5>
              <button type="button" className="btn-close" onClick={onCancel} aria-label="Close" disabled={isProcessing} />
            </div>
            <div className="modal-body">
              <div className="alert alert-warning mb-0" role="alert">
                <p className="mb-2">This medication is part of an active prescription (or more than one).</p>
                <p className="mb-1">Updating this medication will:</p>
                <ul className="mb-2">
                  <li>Supersede every active prescription item for this medication</li>
                  <li>Generate a new SCID</li>
                  <li>Create a single replacement prescription containing ONLY this medication</li>
                  <li>Keep all other medications on those prescriptions unaffected</li>
                  <li>Cancel any original prescription that no longer has any active medication left on it</li>
                </ul>
                <p className="mb-0 fw-semibold">Continue?</p>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onCancel} disabled={isProcessing}>
                Cancel
              </button>
              <button type="button" className="btn btn-warning" onClick={onContinue} disabled={isProcessing}>
                {isProcessing ? <span className="spinner-border spinner-border-sm me-1" aria-hidden="true" /> : null}
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}

export default PrescriptionItemAmendmentDialog;
