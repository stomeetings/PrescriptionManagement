import PrescriptionReplacementTimeline from './PrescriptionReplacementTimeline.jsx';

function Field({ label, value, valueClassName }) {
  return (
    <div className="col-6">
      <div className="text-muted small">{label}</div>
      <div className={`fw-semibold ${valueClassName || ''}`}>{value}</div>
    </div>
  );
}

// The "After Success" display - matches this feature's own exact mockup content
// (Medication updated successfully / Replacement Prescription .../ New SCID .../
// Original Prescription .../ Remains Active / Affected Item / Marked as Superseded).
// result is an AmendPrescriptionItemResponse from POST /api/prescriptions/items/amend.
// A single Patient Medication can be ACTIVE on more than one Prescription at once, so
// result.originalPrescriptions is a list (one entry per prescription that had an item
// superseded) - each one is shown as its own card, since each has its own Old SCID and
// its own resulting status (still Active, or Cancelled if that was its last remaining
// active item - see usp_PrescriptionItem_Amend's own auto-cancel rule). Exactly one
// Replacement Prescription is still created regardless of how many originals there were.
function ReplacementPrescriptionSummary({ result, onDone }) {
  const originalPrescriptions = result.originalPrescriptions || [];

  return (
    <>
      <div className="modal d-block" tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="replacementPrescriptionSummaryTitle">
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="replacementPrescriptionSummaryTitle">
                <i className="bi bi-check-circle-fill text-success me-2" aria-hidden="true" />
                Medication updated successfully.
              </h5>
            </div>
            <div className="modal-body">
              <div className="row g-3 mb-3">
                <Field label="Replacement Prescription" value={result.replacementPrescription.prescriptionNumber} />
                <Field label="New SCID" value={result.newScid} />
              </div>

              <div className="text-muted small mb-2">
                {originalPrescriptions.length > 1 ? 'Original Prescriptions' : 'Original Prescription'}
              </div>
              {originalPrescriptions.map((original) => {
                const isCancelled = original.status?.code === 'CANCELLED';
                return (
                  <div key={original.prescriptionId} className="border rounded-3 p-2 mb-2">
                    <div className="row g-3">
                      <Field label="Prescription Number" value={original.prescriptionNumber} />
                      <Field label="Old SCID" value={original.oldScid} />
                      <Field
                        label="Status"
                        value={original.status?.displayText}
                        valueClassName={isCancelled ? 'text-danger' : 'text-success'}
                      />
                    </div>
                  </div>
                );
              })}

              <div className="mt-2">
                <div className="text-muted small">{originalPrescriptions.length > 1 ? 'Affected Items' : 'Affected Item'}</div>
                <div className="fw-semibold">
                  Marked as <span className="badge rounded-pill text-bg-secondary">Superseded</span>
                </div>
              </div>

              <div className="mt-3">
                <PrescriptionReplacementTimeline />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-primary" onClick={onDone} autoFocus>
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}

export default ReplacementPrescriptionSummary;
