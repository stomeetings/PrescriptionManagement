import { useEffect } from 'react';

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

// Confirmation dialog for the Stop Medication action, reusable from both the Patient
// Medication List (row action) and Patient Medication Details page. No Stop Date/Stop
// Reason/Notes inputs: the approved backend contract's StopMedicationRequest is
// intentionally empty (api-spec.md section 4.9) - EndDate is always stamped as today
// server-side, and no StopReason/Notes column exists in the schema. Collecting those
// fields here would mean silently discarding whatever the clinician typed, which is
// worse than not offering them at all; this was raised and confirmed with the user
// before building this component. Bootstrap .modal visuals via plain React state,
// matching ConfirmDialog's established precedent (no bootstrap.bundle.js).
function PatientMedicationStopDialog({ show, medication, onConfirm, onCancel, isProcessing, error }) {
  useEffect(() => {
    if (!show) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (isProcessing) {
        return;
      }
      if (event.key === 'Escape') {
        onCancel();
      } else if (event.key === 'Enter') {
        onConfirm();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [show, isProcessing, onCancel, onConfirm]);

  if (!show || !medication) {
    return null;
  }

  const isStillActive = medication.status?.code === 'ACTIVE';

  return (
    <>
      <div className="modal d-block" tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="stopMedicationDialogTitle">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="stopMedicationDialogTitle">
                Stop Medication
              </h5>
              <button type="button" className="btn-close" onClick={onCancel} disabled={isProcessing} aria-label="Close" />
            </div>

            <div className="modal-body">
              {!isStillActive && (
                <div className="alert alert-warning d-flex align-items-center gap-2" role="alert">
                  <i className="bi bi-exclamation-triangle" aria-hidden="true" />
                  This medication is no longer active and cannot be stopped.
                </div>
              )}

              {error && (
                <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
                  <i className="bi bi-exclamation-triangle" aria-hidden="true" />
                  {error}
                </div>
              )}

              <dl className="row mb-0">
                <dt className="col-sm-4">Patient</dt>
                <dd className="col-sm-8">{medication.patientFullName}</dd>

                <dt className="col-sm-4">Medicine Code</dt>
                <dd className="col-sm-8">{medication.medicineCode}</dd>

                <dt className="col-sm-4">Medicine Name</dt>
                <dd className="col-sm-8">{medication.medicineName}</dd>

                <dt className="col-sm-4">Strength</dt>
                <dd className="col-sm-8">{medication.strength}</dd>

                <dt className="col-sm-4">Dose</dt>
                <dd className="col-sm-8">
                  {medication.dose} {medication.doseUnit?.displayText}
                </dd>

                <dt className="col-sm-4">Frequency</dt>
                <dd className="col-sm-8">{medication.frequency?.displayText}</dd>

                <dt className="col-sm-4">Start Date</dt>
                <dd className="col-sm-8">{formatDate(medication.startDate)}</dd>
              </dl>

              <p className="text-muted small mb-0 mt-3">
                Stopping this medication marks it inactive and read-only - it is not deleted, and remains visible in
                this patient's medication history.
              </p>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onCancel} disabled={isProcessing}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-warning"
                onClick={onConfirm}
                disabled={isProcessing || !isStillActive}
              >
                {isProcessing ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                    Stopping...
                  </>
                ) : (
                  'Stop Medication'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}

export default PatientMedicationStopDialog;
