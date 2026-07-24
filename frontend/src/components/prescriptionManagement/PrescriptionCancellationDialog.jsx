import { useEffect, useRef, useState } from 'react';
import PrescriptionStatusBadge from './PrescriptionStatusBadge.jsx';
import { getPrescriptionDetails, cancelPrescription } from '../../api/prescriptionApi.js';
import { parseApiError } from '../../api/parseApiError.js';

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

// The six Cancellation Types this feature defines - codes match the backend's
// CK_PrescriptionCancellation_CancellationType exactly.
const CANCELLATION_TYPES = [
  { code: 'CLINICAL_DECISION', label: 'Clinical Decision' },
  { code: 'ENTERED_IN_ERROR', label: 'Entered In Error' },
  { code: 'DUPLICATE_PRESCRIPTION', label: 'Duplicate Prescription' },
  { code: 'PATIENT_REQUEST', label: 'Patient Request' },
  { code: 'PROVIDER_REQUEST', label: 'Provider Request' },
  { code: 'OTHER', label: 'Other' },
];

// Self-contained, like PrescriptionReprintDialog/PrescriptionRenewalDialog - fetches the
// prescription's own detail on open (Number/Patient/Medication Count/Issue Date/Current
// Status) rather than requiring the caller to already have it, so this dialog works
// identically from the Details page or the List row. Cancellation Type/Reason/Comments
// are all required (task's own literal "Require" list) - the backend cascades every
// currently ACTIVE item to CANCELLED and leaves Superseded/Dispensed items untouched;
// nothing here is deleted, only status changes.
function PrescriptionCancellationDialog({ show, prescriptionId, onCancelled, onClose }) {
  const [prescription, setPrescription] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [cancellationType, setCancellationType] = useState('');
  const [reason, setReason] = useState('');
  const [comments, setComments] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const typeSelectRef = useRef(null);

  useEffect(() => {
    if (!show) {
      return;
    }

    setCancellationType('');
    setReason('');
    setComments('');
    setFieldErrors({});
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
      typeSelectRef.current?.focus();
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

  function validate() {
    const errors = {};
    if (!cancellationType) {
      errors.cancellationType = 'Cancellation type is required.';
    }
    if (!reason.trim()) {
      errors.reason = 'Reason is required.';
    }
    if (!comments.trim()) {
      errors.comments = 'Comments are required.';
    }
    return errors;
  }

  async function handleCancelPrescription() {
    if (isSubmitting) {
      return;
    }

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitError('');
    setIsSubmitting(true);

    try {
      const result = await cancelPrescription(prescriptionId, {
        cancellationType,
        reason: reason.trim(),
        comments: comments.trim(),
      });
      onCancelled(result);
    } catch (cancelError) {
      const { generalMessage } = parseApiError(cancelError);
      setSubmitError(generalMessage || 'Unable to cancel this prescription. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!show) {
    return null;
  }

  return (
    <>
      <div className="modal d-block" tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="prescriptionCancellationDialogTitle">
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="prescriptionCancellationDialogTitle">
                Cancel Prescription
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
                    <dt className="col-5 text-muted">Medication Count</dt>
                    <dd className="col-7">{prescription.medicationCount}</dd>
                    <dt className="col-5 text-muted">Issue Date</dt>
                    <dd className="col-7">{formatDate(prescription.issueDate)}</dd>
                    <dt className="col-5 text-muted">Current Status</dt>
                    <dd className="col-7">
                      <PrescriptionStatusBadge status={prescription.status} />
                    </dd>
                  </dl>

                  <div className="alert alert-warning py-2 mb-3" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true" />
                    Every currently active medication on this prescription will be cancelled. This cannot be undone.
                  </div>

                  <div className="mb-3">
                    <label htmlFor="cancellationType" className="form-label">
                      Cancellation Type <span className="text-danger">*</span>
                    </label>
                    <select
                      id="cancellationType"
                      ref={typeSelectRef}
                      className={`form-select ${fieldErrors.cancellationType ? 'is-invalid' : ''}`}
                      value={cancellationType}
                      onChange={(event) => {
                        setCancellationType(event.target.value);
                        if (fieldErrors.cancellationType) {
                          setFieldErrors((current) => ({ ...current, cancellationType: undefined }));
                        }
                      }}
                      disabled={isSubmitting}
                      aria-required="true"
                      aria-invalid={Boolean(fieldErrors.cancellationType)}
                    >
                      <option value="">Select a reason type…</option>
                      {CANCELLATION_TYPES.map((type) => (
                        <option key={type.code} value={type.code}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.cancellationType && <div className="invalid-feedback">{fieldErrors.cancellationType}</div>}
                  </div>

                  <div className="mb-3">
                    <label htmlFor="cancellationReason" className="form-label">
                      Reason <span className="text-danger">*</span>
                    </label>
                    <textarea
                      id="cancellationReason"
                      className={`form-control ${fieldErrors.reason ? 'is-invalid' : ''}`}
                      rows={2}
                      value={reason}
                      onChange={(event) => {
                        setReason(event.target.value);
                        if (fieldErrors.reason) {
                          setFieldErrors((current) => ({ ...current, reason: undefined }));
                        }
                      }}
                      disabled={isSubmitting}
                      aria-required="true"
                      aria-invalid={Boolean(fieldErrors.reason)}
                      placeholder="e.g. Patient no longer requires this medication"
                    />
                    {fieldErrors.reason && <div className="invalid-feedback">{fieldErrors.reason}</div>}
                  </div>

                  <div className="mb-1">
                    <label htmlFor="cancellationComments" className="form-label">
                      Comments <span className="text-danger">*</span>
                    </label>
                    <textarea
                      id="cancellationComments"
                      className={`form-control ${fieldErrors.comments ? 'is-invalid' : ''}`}
                      rows={2}
                      value={comments}
                      onChange={(event) => {
                        setComments(event.target.value);
                        if (fieldErrors.comments) {
                          setFieldErrors((current) => ({ ...current, comments: undefined }));
                        }
                      }}
                      disabled={isSubmitting}
                      aria-required="true"
                      aria-invalid={Boolean(fieldErrors.comments)}
                      placeholder="Additional detail for the audit record"
                    />
                    {fieldErrors.comments && <div className="invalid-feedback">{fieldErrors.comments}</div>}
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
                Close
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleCancelPrescription}
                disabled={isSubmitting || isLoadingDetails || Boolean(loadError)}
              >
                {isSubmitting ? <span className="spinner-border spinner-border-sm me-1" aria-hidden="true" /> : null}
                Cancel Prescription
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}

export default PrescriptionCancellationDialog;
