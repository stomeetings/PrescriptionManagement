import { Link } from 'react-router-dom';

// The "After Success" display for a renewal - the new prescription is a DRAFT, not
// finalized yet, so this points the doctor at its own Details page to continue the
// workflow's remaining steps (Preview/Print/Finalize) rather than treating renewal
// itself as the end of the process.
function PrescriptionRenewalSummary({ result, onClose }) {
  return (
    <>
      <div className="modal d-block" tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="prescriptionRenewalSummaryTitle">
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="prescriptionRenewalSummaryTitle">
                <i className="bi bi-check-circle-fill text-success me-2" aria-hidden="true" />
                Renewal draft created.
              </h5>
            </div>
            <div className="modal-body">
              <dl className="row mb-3">
                <dt className="col-5 text-muted">New Prescription Number</dt>
                <dd className="col-7">{result.newPrescriptionNumber}</dd>
                <dt className="col-5 text-muted">Status</dt>
                <dd className="col-7">
                  <span className="badge rounded-pill text-bg-secondary">Draft</span>
                </dd>
              </dl>
              <div className="alert alert-info mb-0" role="status">
                <i className="bi bi-info-circle me-2" aria-hidden="true" />
                Review this draft, then Preview, Print, and Finalize it from its own Prescription Details page.
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                Close
              </button>
              <Link to={`/prescriptions/${result.draftPrescriptionId}`} className="btn btn-primary">
                Go to Draft
              </Link>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}

export default PrescriptionRenewalSummary;
