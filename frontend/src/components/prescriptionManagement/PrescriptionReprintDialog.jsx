import { useEffect, useRef, useState } from 'react';
import PrescriptionStatusBadge from './PrescriptionStatusBadge.jsx';
import { getPrescriptionDetails, reprintPrescription } from '../../api/prescriptionApi.js';
import { parseApiError } from '../../api/parseApiError.js';

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

// Self-contained, like PrescriptionVersionHistoryDialog - fetches the prescription's own
// detail on open (Number/Patient/Provider/IssueDate/FinalizedDate/Version/Previous Print
// Count) rather than requiring the caller (Details page or List row) to already have it
// in hand, so this dialog works identically from either entry point. On a successful
// reprint, this dialog does not print anything itself - it hands the already-fetched
// Xhtml back to the caller via onReprinted, which opens the existing PrescriptionPreviewModal
// (same iframe/print machinery as the regular Print action, Step 18.3/27) - "the original
// XHTML must be reused, not regenerated" is satisfied by literally reusing that same
// component, not by this dialog building its own printing path. Copies is recorded for
// the audit trail (CopyCount) but not looped as N separate window.print() calls - no
// browser API triggers multiple physical copies from JS; the browser's own native print
// dialog already offers a copy count control.
function PrescriptionReprintDialog({ show, prescriptionId, onReprinted, onClose }) {
  const [prescription, setPrescription] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [reason, setReason] = useState('');
  const [copies, setCopies] = useState(1);
  const [preview, setPreview] = useState(true);
  const [reasonError, setReasonError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const dialogRef = useRef(null);
  const reasonInputRef = useRef(null);

  useEffect(() => {
    if (!show) {
      return;
    }

    setReason('');
    setCopies(1);
    setPreview(true);
    setReasonError('');
    setSubmitError('');
    setPrescription(null);
    setLoadError('');
    setIsLoadingDetails(true);

    getPrescriptionDetails(prescriptionId)
      .then(setPrescription)
      .catch((fetchError) => {
        const { generalMessage } = parseApiError(fetchError);
        setLoadError(generalMessage || 'Unable to load this prescription. Please try again.');
      })
      .finally(() => setIsLoadingDetails(false));
  }, [show, prescriptionId]);

  useEffect(() => {
    if (show && !isLoadingDetails && !loadError) {
      reasonInputRef.current?.focus();
    }
  }, [show, isLoadingDetails, loadError]);

  useEffect(() => {
    if (!show) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [show, isSubmitting, onClose]);

  async function handlePrint() {
    if (isSubmitting) {
      return;
    }

    if (!reason.trim()) {
      setReasonError('Reason for reprint is required.');
      reasonInputRef.current?.focus();
      return;
    }

    setReasonError('');
    setSubmitError('');
    setIsSubmitting(true);

    try {
      await reprintPrescription(prescriptionId, { reason: reason.trim(), copies, preview });
      onReprinted({ xhtml: prescription.xhtml, autoPrint: !preview });
    } catch (reprintError) {
      const { generalMessage } = parseApiError(reprintError);
      setSubmitError(generalMessage || 'Unable to reprint this prescription. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!show) {
    return null;
  }

  return (
    <>
      <div className="modal d-block" tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="prescriptionReprintDialogTitle">
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content" ref={dialogRef}>
            <div className="modal-header">
              <h5 className="modal-title" id="prescriptionReprintDialogTitle">
                Reprint Prescription
              </h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" disabled={isSubmitting} />
            </div>

            <div className="modal-body">
              {isLoadingDetails && (
                <div className="d-flex justify-content-center py-4">
                  <span className="spinner-border" role="status" aria-hidden="true" />
                  <span className="visually-hidden">Loading prescription…</span>
                </div>
              )}

              {!isLoadingDetails && loadError && (
                <div className="alert alert-danger mb-0" role="alert">
                  {loadError}
                </div>
              )}

              {!isLoadingDetails && !loadError && prescription && (
                <>
                  <dl className="row mb-3">
                    <dt className="col-5 text-muted">Prescription Number</dt>
                    <dd className="col-7">{prescription.prescriptionNumber}</dd>
                    <dt className="col-5 text-muted">Patient</dt>
                    <dd className="col-7">{prescription.patient?.fullName}</dd>
                    <dt className="col-5 text-muted">Provider</dt>
                    <dd className="col-7">{prescription.provider?.fullName}</dd>
                    <dt className="col-5 text-muted">Issue Date</dt>
                    <dd className="col-7">{formatDate(prescription.issueDate)}</dd>
                    <dt className="col-5 text-muted">Finalized Date</dt>
                    <dd className="col-7">{formatDate(prescription.finalizedDate)}</dd>
                    <dt className="col-5 text-muted">Current Version</dt>
                    <dd className="col-7">{prescription.versionNumber ?? '—'}</dd>
                    <dt className="col-5 text-muted">Previous Print Count</dt>
                    <dd className="col-7">{prescription.printCount}</dd>
                    <dt className="col-5 text-muted">Status</dt>
                    <dd className="col-7">
                      <PrescriptionStatusBadge status={prescription.status} />
                    </dd>
                  </dl>

                  <div className="mb-3">
                    <label htmlFor="reprintReason" className="form-label">
                      Reason for Reprint <span className="text-danger">*</span>
                    </label>
                    <textarea
                      id="reprintReason"
                      ref={reasonInputRef}
                      className={`form-control ${reasonError ? 'is-invalid' : ''}`}
                      rows={2}
                      value={reason}
                      onChange={(event) => {
                        setReason(event.target.value);
                        if (reasonError) {
                          setReasonError('');
                        }
                      }}
                      disabled={isSubmitting}
                      aria-required="true"
                      aria-invalid={Boolean(reasonError)}
                      aria-describedby={reasonError ? 'reprintReasonError' : undefined}
                      placeholder="e.g. Lost Original"
                    />
                    {reasonError && (
                      <div id="reprintReasonError" className="invalid-feedback">
                        {reasonError}
                      </div>
                    )}
                  </div>

                  <div className="row g-3 align-items-center mb-1">
                    <div className="col-auto">
                      <label htmlFor="reprintCopies" className="form-label mb-0">
                        Copies
                      </label>
                    </div>
                    <div className="col-auto">
                      <input
                        id="reprintCopies"
                        type="number"
                        min="1"
                        max="5"
                        className="form-control"
                        style={{ width: '5rem' }}
                        value={copies}
                        onChange={(event) => setCopies(Math.min(5, Math.max(1, Number(event.target.value) || 1)))}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="form-check">
                    <input
                      id="reprintPreview"
                      type="checkbox"
                      className="form-check-input"
                      checked={preview}
                      onChange={(event) => setPreview(event.target.checked)}
                      disabled={isSubmitting}
                    />
                    <label className="form-check-label" htmlFor="reprintPreview">
                      Preview before printing
                    </label>
                  </div>

                  {submitError && (
                    <div className="alert alert-danger mt-3 mb-0" role="alert">
                      {submitError}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePrint}
                disabled={isSubmitting || isLoadingDetails || Boolean(loadError)}
                aria-label="Confirm reprint and print"
              >
                {isSubmitting ? <span className="spinner-border spinner-border-sm me-1" aria-hidden="true" /> : null}
                Print
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}

export default PrescriptionReprintDialog;
