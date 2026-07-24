import { useEffect, useState } from 'react';
import { getLookupCategory } from '../../api/lookupsApi.js';

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

function todayAsDateInputValue() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString().slice(0, 10);
}

// Pre-populates every editable field from the stopped source record's current values -
// matches api-spec.md section 4.10's "editable defaults" design. Always sent explicitly
// (never omitted) since an unchanged value has the same effect as the API's own
// COALESCE(override, source) behavior, without this dialog needing to track which
// fields the clinician actually touched.
function buildInitialForm(medication) {
  return {
    doseUnitCode: medication?.doseUnit?.code || '',
    frequencyCode: medication?.frequency?.code || '',
    durationUnitCode: medication?.durationUnit?.code || '',
    dose: medication?.dose ?? '',
    duration: medication?.duration ?? '',
    quantity: medication?.quantity ?? '',
    instructions: medication?.instructions || '',
    prn: medication?.prn ?? false,
    resumeDate: todayAsDateInputValue(),
    clinicalNotes: medication?.clinicalNotes || '',
  };
}

function validate(form, medication) {
  const errors = {};

  if (form.dose === '' || form.dose === null) {
    errors.dose = 'Dose is required.';
  } else if (Number(form.dose) < 0) {
    errors.dose = 'Dose cannot be negative.';
  }

  if (!form.doseUnitCode) {
    errors.doseUnitCode = 'Dose unit is required.';
  }

  if (!form.frequencyCode) {
    errors.frequencyCode = 'Frequency is required.';
  }

  if (form.duration === '' || form.duration === null) {
    errors.duration = 'Duration is required.';
  } else if (Number(form.duration) < 0) {
    errors.duration = 'Duration cannot be negative.';
  }

  if (!form.durationUnitCode) {
    errors.durationUnitCode = 'Duration unit is required.';
  }

  if (form.quantity === '' || form.quantity === null) {
    errors.quantity = 'Quantity is required.';
  } else if (Number(form.quantity) < 0) {
    errors.quantity = 'Quantity cannot be negative.';
  }

  if (!form.instructions.trim()) {
    errors.instructions = 'Instructions are required.';
  }

  if (!form.resumeDate) {
    errors.resumeDate = 'Resume date is required.';
  } else if (medication?.stoppedDate) {
    // Client-side-only safeguard: the approved backend (usp_PatientMedication_Resume /
    // PatientMedicationService.ResumeAsync) does not actually enforce "resume date after
    // stop date" today - flagged here rather than silently assumed, since this task
    // explicitly asks for the check and a clinician-facing guard is still worth having
    // even though the server wouldn't reject a violation of it.
    const resumeDate = new Date(form.resumeDate);
    const stoppedDate = new Date(medication.stoppedDate);
    if (resumeDate <= stoppedDate) {
      errors.resumeDate = 'Resume date must be after the stop date.';
    }
  }

  return errors;
}

// Confirmation dialog for the Resume Medication action, reusable from both the Patient
// Medication List (row action) and Patient Medication Details page. Resuming always
// creates a NEW Patient Medication record (see PatientMedicationResumeDialog's caller
// for the full reasoning) - the medicine itself is never editable here, matching
// PatientMedicationForm's identical read-only treatment in edit mode.
function PatientMedicationResumeDialog({ show, medication, onConfirm, onCancel, isProcessing, error }) {
  const [form, setForm] = useState(() => buildInitialForm(medication));
  const [clientFieldErrors, setClientFieldErrors] = useState({});

  const [doseUnitOptions, setDoseUnitOptions] = useState([]);
  const [frequencyOptions, setFrequencyOptions] = useState([]);
  const [durationUnitOptions, setDurationUnitOptions] = useState([]);

  const isStillStopped = medication?.status?.code === 'STOPPED';

  // Resets to fresh defaults every time the dialog is opened for a (possibly different)
  // medication, rather than carrying over a previous attempt's edits.
  useEffect(() => {
    if (show) {
      setForm(buildInitialForm(medication));
      setClientFieldErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, medication?.patientMedicationId]);

  useEffect(() => {
    let isMounted = true;

    Promise.all([getLookupCategory('doseunit'), getLookupCategory('frequency'), getLookupCategory('durationunit')])
      .then(([doseUnitCategory, frequencyCategory, durationUnitCategory]) => {
        if (isMounted) {
          setDoseUnitOptions(doseUnitCategory.values ?? []);
          setFrequencyOptions(frequencyCategory.values ?? []);
          setDurationUnitOptions(durationUnitCategory.values ?? []);
        }
      })
      .catch(() => {
        // Non-fatal: the three selects just show only their placeholder option if this
        // fails - it must not block the rest of the dialog from being usable.
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!show) {
      return undefined;
    }

    // Escape only - Enter is left to the <form>'s native submit behavior below, so a
    // clinician typing a newline into Clinical Notes (a textarea) doesn't accidentally
    // submit the dialog.
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isProcessing) {
        onCancel();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [show, isProcessing, onCancel]);

  if (!show || !medication) {
    return null;
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const errors = validate(form, medication);
    setClientFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    onConfirm(form);
  }

  return (
    <>
      <div className="modal d-block" tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="resumeMedicationDialogTitle">
        <div className="modal-dialog modal-lg modal-dialog-scrollable" role="document">
          <div className="modal-content">
            <form onSubmit={handleSubmit} noValidate>
              <div className="modal-header">
                <h5 className="modal-title" id="resumeMedicationDialogTitle">
                  Resume Medication
                </h5>
                <button type="button" className="btn-close" onClick={onCancel} disabled={isProcessing} aria-label="Close" />
              </div>

              <div className="modal-body">
                {!isStillStopped && (
                  <div className="alert alert-warning d-flex align-items-center gap-2" role="alert">
                    <i className="bi bi-exclamation-triangle" aria-hidden="true" />
                    This medication is no longer stopped and cannot be resumed.
                  </div>
                )}

                {error && (
                  <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
                    <i className="bi bi-exclamation-triangle" aria-hidden="true" />
                    {error}
                  </div>
                )}

                <h2 className="h6 text-uppercase text-muted mb-3">Patient &amp; Medicine</h2>
                <dl className="row mb-0">
                  <dt className="col-sm-4">Patient</dt>
                  <dd className="col-sm-8">{medication.patientFullName}</dd>

                  <dt className="col-sm-4">Medicine Code</dt>
                  <dd className="col-sm-8">{medication.medicineCode}</dd>

                  <dt className="col-sm-4">Medicine Name</dt>
                  <dd className="col-sm-8">{medication.medicineName}</dd>

                  <dt className="col-sm-4">Strength</dt>
                  <dd className="col-sm-8">{medication.strength}</dd>
                </dl>

                <h2 className="h6 text-uppercase text-muted mb-3 mt-4">Previous Medication</h2>
                <dl className="row mb-0">
                  <dt className="col-sm-4">Original Start Date</dt>
                  <dd className="col-sm-8">{formatDate(medication.startDate)}</dd>

                  <dt className="col-sm-4">Stop Date</dt>
                  <dd className="col-sm-8">{formatDate(medication.stoppedDate)}</dd>

                  <dt className="col-sm-4">Dose</dt>
                  <dd className="col-sm-8">
                    {medication.dose} {medication.doseUnit?.displayText}
                  </dd>

                  <dt className="col-sm-4">Frequency</dt>
                  <dd className="col-sm-8">{medication.frequency?.displayText}</dd>

                  <dt className="col-sm-4">Quantity</dt>
                  <dd className="col-sm-8">{medication.quantity}</dd>
                </dl>

                <h2 className="h6 text-uppercase text-muted mb-3 mt-4">New Course</h2>
                <div className="row g-3">
                  <div className="col-12 col-md-3">
                    <label className="form-label" htmlFor="resumeDose">
                      Dose
                    </label>
                    <input
                      id="resumeDose"
                      type="number"
                      step="0.001"
                      min="0"
                      className={`form-control ${clientFieldErrors.dose ? 'is-invalid' : ''}`}
                      value={form.dose}
                      onChange={(event) => updateField('dose', event.target.value)}
                      disabled={isProcessing}
                    />
                    {clientFieldErrors.dose && <div className="invalid-feedback d-block">{clientFieldErrors.dose}</div>}
                  </div>

                  <div className="col-12 col-md-3">
                    <label className="form-label" htmlFor="resumeDoseUnitCode">
                      Dose Unit
                    </label>
                    <select
                      id="resumeDoseUnitCode"
                      className={`form-select ${clientFieldErrors.doseUnitCode ? 'is-invalid' : ''}`}
                      value={form.doseUnitCode}
                      onChange={(event) => updateField('doseUnitCode', event.target.value)}
                      disabled={isProcessing}
                    >
                      <option value="">Select...</option>
                      {doseUnitOptions.map((option) => (
                        <option key={option.code} value={option.code}>
                          {option.displayText}
                        </option>
                      ))}
                    </select>
                    {clientFieldErrors.doseUnitCode && (
                      <div className="invalid-feedback d-block">{clientFieldErrors.doseUnitCode}</div>
                    )}
                  </div>

                  <div className="col-12 col-md-3">
                    <label className="form-label" htmlFor="resumeFrequencyCode">
                      Frequency
                    </label>
                    <select
                      id="resumeFrequencyCode"
                      className={`form-select ${clientFieldErrors.frequencyCode ? 'is-invalid' : ''}`}
                      value={form.frequencyCode}
                      onChange={(event) => updateField('frequencyCode', event.target.value)}
                      disabled={isProcessing}
                    >
                      <option value="">Select...</option>
                      {frequencyOptions.map((option) => (
                        <option key={option.code} value={option.code}>
                          {option.displayText}
                        </option>
                      ))}
                    </select>
                    {clientFieldErrors.frequencyCode && (
                      <div className="invalid-feedback d-block">{clientFieldErrors.frequencyCode}</div>
                    )}
                  </div>

                  <div className="col-12 col-md-3 d-flex align-items-end">
                    <div className="form-check mb-2">
                      <input
                        id="resumePrn"
                        type="checkbox"
                        className="form-check-input"
                        checked={form.prn}
                        onChange={(event) => updateField('prn', event.target.checked)}
                        disabled={isProcessing}
                      />
                      <label className="form-check-label" htmlFor="resumePrn">
                        PRN (as needed)
                      </label>
                    </div>
                  </div>

                  <div className="col-12 col-md-3">
                    <label className="form-label" htmlFor="resumeDuration">
                      Duration
                    </label>
                    <input
                      id="resumeDuration"
                      type="number"
                      step="1"
                      min="0"
                      className={`form-control ${clientFieldErrors.duration ? 'is-invalid' : ''}`}
                      value={form.duration}
                      onChange={(event) => updateField('duration', event.target.value)}
                      disabled={isProcessing}
                    />
                    {clientFieldErrors.duration && <div className="invalid-feedback d-block">{clientFieldErrors.duration}</div>}
                  </div>

                  <div className="col-12 col-md-3">
                    <label className="form-label" htmlFor="resumeDurationUnitCode">
                      Duration Unit
                    </label>
                    <select
                      id="resumeDurationUnitCode"
                      className={`form-select ${clientFieldErrors.durationUnitCode ? 'is-invalid' : ''}`}
                      value={form.durationUnitCode}
                      onChange={(event) => updateField('durationUnitCode', event.target.value)}
                      disabled={isProcessing}
                    >
                      <option value="">Select...</option>
                      {durationUnitOptions.map((option) => (
                        <option key={option.code} value={option.code}>
                          {option.displayText}
                        </option>
                      ))}
                    </select>
                    {clientFieldErrors.durationUnitCode && (
                      <div className="invalid-feedback d-block">{clientFieldErrors.durationUnitCode}</div>
                    )}
                  </div>

                  <div className="col-12 col-md-3">
                    <label className="form-label" htmlFor="resumeQuantity">
                      Quantity
                    </label>
                    <input
                      id="resumeQuantity"
                      type="number"
                      step="0.01"
                      min="0"
                      className={`form-control ${clientFieldErrors.quantity ? 'is-invalid' : ''}`}
                      value={form.quantity}
                      onChange={(event) => updateField('quantity', event.target.value)}
                      disabled={isProcessing}
                    />
                    {clientFieldErrors.quantity && <div className="invalid-feedback d-block">{clientFieldErrors.quantity}</div>}
                  </div>

                  <div className="col-12 col-md-3">
                    <label className="form-label" htmlFor="resumeDate">
                      Resume Date
                    </label>
                    <input
                      id="resumeDate"
                      type="date"
                      className={`form-control ${clientFieldErrors.resumeDate ? 'is-invalid' : ''}`}
                      value={form.resumeDate}
                      onChange={(event) => updateField('resumeDate', event.target.value)}
                      disabled={isProcessing}
                    />
                    {clientFieldErrors.resumeDate && (
                      <div className="invalid-feedback d-block">{clientFieldErrors.resumeDate}</div>
                    )}
                  </div>

                  <div className="col-12">
                    <label className="form-label" htmlFor="resumeInstructions">
                      Instructions
                    </label>
                    <textarea
                      id="resumeInstructions"
                      className={`form-control ${clientFieldErrors.instructions ? 'is-invalid' : ''}`}
                      rows={2}
                      value={form.instructions}
                      onChange={(event) => updateField('instructions', event.target.value)}
                      disabled={isProcessing}
                      maxLength={500}
                    />
                    {clientFieldErrors.instructions && (
                      <div className="invalid-feedback d-block">{clientFieldErrors.instructions}</div>
                    )}
                  </div>

                  <div className="col-12">
                    <label className="form-label" htmlFor="resumeClinicalNotes">
                      Clinical Notes
                    </label>
                    <textarea
                      id="resumeClinicalNotes"
                      className="form-control"
                      rows={2}
                      value={form.clinicalNotes}
                      onChange={(event) => updateField('clinicalNotes', event.target.value)}
                      disabled={isProcessing}
                    />
                  </div>
                </div>

                <p className="text-muted small mb-0 mt-3">
                  Resuming creates a new active medication record - the stopped record above remains unchanged in
                  this patient's medication history.
                </p>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={onCancel} disabled={isProcessing}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success" disabled={isProcessing || !isStillStopped}>
                  {isProcessing ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                      Resuming...
                    </>
                  ) : (
                    'Resume Medication'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}

export default PatientMedicationResumeDialog;
