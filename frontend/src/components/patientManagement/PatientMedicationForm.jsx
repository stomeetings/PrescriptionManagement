import { useEffect, useRef, useState } from 'react';
import { getLookupCategory } from '../../api/lookupsApi.js';
import MedicineSearchDialog from './MedicineSearchDialog.jsx';
import SelectedMedicineCard from './SelectedMedicineCard.jsx';

const EMPTY_FORM = {
  doseUnitCode: '',
  frequencyCode: '',
  durationUnitCode: '',
  dose: '',
  duration: '',
  quantity: '',
  instructions: '',
  prn: false,
  startDate: '',
  endDate: '',
  clinicalNotes: '',
};

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : '—';
}

function validate(form, selectedMedicine) {
  const errors = {};

  if (!selectedMedicine) {
    errors.medicine = 'Select a medicine before saving.';
  }

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

  if (!form.startDate) {
    errors.startDate = 'Start date is required.';
  }

  if (form.startDate && form.endDate) {
    const startDate = new Date(form.startDate);
    const endDate = new Date(form.endDate);
    if (endDate < startDate) {
      errors.endDate = 'End date cannot be before start date.';
    }
  }

  return errors;
}

// Shared by AddPatientMedicationPage (mode="create", Step 12) and a future
// EditPatientMedicationPage (mode="edit", Step 13) - field layout, validation, and
// styling live in exactly one place, mirroring PatientForm/UserForm's identical
// create/edit split. In edit mode, Medicine selection is not offered at all
// (SelectedMedicineCard's allowChange=false): PatientId/MedicineId are immutable once a
// Patient Medication is created (api-spec.md section 4.7).
function PatientMedicationForm({
  mode,
  initialValues,
  selectedMedicine: initialSelectedMedicine,
  onSubmit,
  onCancel,
  isSubmitting,
  fieldErrors: serverFieldErrors,
  onDirtyChange,
}) {
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, ...initialValues }));
  const [selectedMedicine, setSelectedMedicine] = useState(initialSelectedMedicine || null);
  const [showMedicineSearch, setShowMedicineSearch] = useState(false);
  const [clientFieldErrors, setClientFieldErrors] = useState({});

  const [doseUnitOptions, setDoseUnitOptions] = useState([]);
  const [frequencyOptions, setFrequencyOptions] = useState([]);
  const [durationUnitOptions, setDurationUnitOptions] = useState([]);

  // Tracks which button triggered the current submit ('save' vs 'saveAndAddAnother') -
  // read once inside handleSubmit and passed to onSubmit, so the parent page can decide
  // whether to navigate away or reset the form for another entry.
  const submitIntentRef = useRef('save');

  const fieldErrors = { ...clientFieldErrors, ...serverFieldErrors };
  const isEdit = mode === 'edit';

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
        // fails - it must not block the rest of the form from being usable.
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!onDirtyChange) {
      return;
    }

    const baseline = { ...EMPTY_FORM, ...initialValues };
    const isDirty =
      Object.keys(EMPTY_FORM).some((key) => form[key] !== baseline[key]) ||
      selectedMedicine?.medicineId !== (initialSelectedMedicine?.medicineId ?? null);
    onDirtyChange(isDirty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, selectedMedicine]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSelectMedicine(medicine) {
    setSelectedMedicine(medicine);
    setShowMedicineSearch(false);
    setClientFieldErrors((current) => {
      const next = { ...current };
      delete next.medicine;
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const errors = validate(form, selectedMedicine);
    setClientFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    const intent = submitIntentRef.current;
    submitIntentRef.current = 'save';

    // onSubmit resolves to true/false (never throws - the parent page owns showing the
    // error notification/field errors on failure) so this form can tell whether to reset
    // itself for "Save & Add Another" or leave the current values on screen after a
    // failed save.
    const succeeded = await onSubmit(form, selectedMedicine, intent);

    if (succeeded && intent === 'saveAndAddAnother') {
      setForm({ ...EMPTY_FORM });
      setSelectedMedicine(null);
      setClientFieldErrors({});
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {isEdit && initialValues.patientNumber && (
        <div className="row g-3 mb-2">
          <div className="col-12 col-md-4">
            <label className="form-label">Patient</label>
            <input
              type="text"
              className="form-control"
              value={`${initialValues.patientNumber} — ${initialValues.patientFullName}`}
              readOnly
              disabled
            />
          </div>

          <div className="col-12 col-md-4">
            <label className="form-label">Created By</label>
            <input type="text" className="form-control" value={initialValues.createdBy || '—'} readOnly disabled />
          </div>

          <div className="col-12 col-md-4">
            <label className="form-label">Created Date</label>
            <input type="text" className="form-control" value={formatDateTime(initialValues.createdDate)} readOnly disabled />
          </div>
        </div>
      )}

      <h2 className="h6 text-uppercase text-muted mb-3">Medicine</h2>

      {!isEdit && !selectedMedicine && (
        <div className="mb-3">
          <button
            type="button"
            className={`btn btn-outline-primary ${fieldErrors.medicine ? 'border-danger' : ''}`}
            onClick={() => setShowMedicineSearch(true)}
            disabled={isSubmitting}
          >
            <i className="bi bi-search me-1" aria-hidden="true" />
            Select Medicine
          </button>
          {fieldErrors.medicine && <div className="text-danger small mt-1">{fieldErrors.medicine}</div>}
        </div>
      )}

      <SelectedMedicineCard
        medicine={selectedMedicine}
        allowChange={!isEdit}
        onChangeMedicine={() => setShowMedicineSearch(true)}
      />

      <h2 className="h6 text-uppercase text-muted mb-3 mt-4">Dosage</h2>
      <div className="row g-3">
        <div className="col-12 col-md-3">
          <label className="form-label" htmlFor="dose">
            Dose
          </label>
          <input
            id="dose"
            type="number"
            step="0.001"
            min="0"
            className={`form-control ${fieldErrors.dose ? 'is-invalid' : ''}`}
            value={form.dose}
            onChange={(event) => updateField('dose', event.target.value)}
            disabled={isSubmitting}
          />
          {fieldErrors.dose && <div className="invalid-feedback d-block">{fieldErrors.dose}</div>}
        </div>

        <div className="col-12 col-md-3">
          <label className="form-label" htmlFor="doseUnitCode">
            Dose Unit
          </label>
          <select
            id="doseUnitCode"
            className={`form-select ${fieldErrors.doseUnitCode ? 'is-invalid' : ''}`}
            value={form.doseUnitCode}
            onChange={(event) => updateField('doseUnitCode', event.target.value)}
            disabled={isSubmitting}
          >
            <option value="">Select...</option>
            {doseUnitOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.displayText}
              </option>
            ))}
          </select>
          {fieldErrors.doseUnitCode && <div className="invalid-feedback d-block">{fieldErrors.doseUnitCode}</div>}
        </div>

        <div className="col-12 col-md-3">
          <label className="form-label" htmlFor="frequencyCode">
            Frequency
          </label>
          <select
            id="frequencyCode"
            className={`form-select ${fieldErrors.frequencyCode ? 'is-invalid' : ''}`}
            value={form.frequencyCode}
            onChange={(event) => updateField('frequencyCode', event.target.value)}
            disabled={isSubmitting}
          >
            <option value="">Select...</option>
            {frequencyOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.displayText}
              </option>
            ))}
          </select>
          {fieldErrors.frequencyCode && <div className="invalid-feedback d-block">{fieldErrors.frequencyCode}</div>}
        </div>

        <div className="col-12 col-md-3 d-flex align-items-end">
          <div className="form-check mb-2">
            <input
              id="prn"
              type="checkbox"
              className="form-check-input"
              checked={form.prn}
              onChange={(event) => updateField('prn', event.target.checked)}
              disabled={isSubmitting}
            />
            <label className="form-check-label" htmlFor="prn">
              PRN (as needed)
            </label>
          </div>
        </div>

        <div className="col-12 col-md-3">
          <label className="form-label" htmlFor="duration">
            Duration
          </label>
          <input
            id="duration"
            type="number"
            step="1"
            min="0"
            className={`form-control ${fieldErrors.duration ? 'is-invalid' : ''}`}
            value={form.duration}
            onChange={(event) => updateField('duration', event.target.value)}
            disabled={isSubmitting}
          />
          {fieldErrors.duration && <div className="invalid-feedback d-block">{fieldErrors.duration}</div>}
        </div>

        <div className="col-12 col-md-3">
          <label className="form-label" htmlFor="durationUnitCode">
            Duration Unit
          </label>
          <select
            id="durationUnitCode"
            className={`form-select ${fieldErrors.durationUnitCode ? 'is-invalid' : ''}`}
            value={form.durationUnitCode}
            onChange={(event) => updateField('durationUnitCode', event.target.value)}
            disabled={isSubmitting}
          >
            <option value="">Select...</option>
            {durationUnitOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.displayText}
              </option>
            ))}
          </select>
          {fieldErrors.durationUnitCode && <div className="invalid-feedback d-block">{fieldErrors.durationUnitCode}</div>}
        </div>

        <div className="col-12 col-md-3">
          <label className="form-label" htmlFor="quantity">
            Quantity
          </label>
          <input
            id="quantity"
            type="number"
            step="0.01"
            min="0"
            className={`form-control ${fieldErrors.quantity ? 'is-invalid' : ''}`}
            value={form.quantity}
            onChange={(event) => updateField('quantity', event.target.value)}
            disabled={isSubmitting}
          />
          {fieldErrors.quantity && <div className="invalid-feedback d-block">{fieldErrors.quantity}</div>}
        </div>
      </div>

      <h2 className="h6 text-uppercase text-muted mb-3 mt-4">Course</h2>
      <div className="row g-3">
        <div className="col-12 col-md-3">
          <label className="form-label" htmlFor="startDate">
            Start Date
          </label>
          <input
            id="startDate"
            type="date"
            className={`form-control ${fieldErrors.startDate ? 'is-invalid' : ''}`}
            value={form.startDate}
            onChange={(event) => updateField('startDate', event.target.value)}
            disabled={isSubmitting}
          />
          {fieldErrors.startDate && <div className="invalid-feedback d-block">{fieldErrors.startDate}</div>}
        </div>

        <div className="col-12 col-md-3">
          <label className="form-label" htmlFor="endDate">
            End Date
          </label>
          <input
            id="endDate"
            type="date"
            className={`form-control ${fieldErrors.endDate ? 'is-invalid' : ''}`}
            value={form.endDate}
            onChange={(event) => updateField('endDate', event.target.value)}
            disabled={isSubmitting}
          />
          {fieldErrors.endDate && <div className="invalid-feedback d-block">{fieldErrors.endDate}</div>}
          <div className="form-text">Optional - leave blank if not yet known.</div>
        </div>
      </div>

      <h2 className="h6 text-uppercase text-muted mb-3 mt-4">Instructions &amp; Notes</h2>
      <div className="row g-3">
        <div className="col-12">
          <label className="form-label" htmlFor="instructions">
            Instructions
          </label>
          <textarea
            id="instructions"
            className={`form-control ${fieldErrors.instructions ? 'is-invalid' : ''}`}
            rows={2}
            value={form.instructions}
            onChange={(event) => updateField('instructions', event.target.value)}
            disabled={isSubmitting}
            maxLength={500}
          />
          {fieldErrors.instructions && <div className="invalid-feedback d-block">{fieldErrors.instructions}</div>}
        </div>

        <div className="col-12">
          <label className="form-label" htmlFor="clinicalNotes">
            Clinical Notes
          </label>
          <textarea
            id="clinicalNotes"
            className="form-control"
            rows={3}
            value={form.clinicalNotes}
            onChange={(event) => updateField('clinicalNotes', event.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="d-flex gap-2 mt-4">
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
              {isEdit ? 'Updating...' : 'Saving...'}
            </>
          ) : isEdit ? (
            'Update'
          ) : (
            'Save'
          )}
        </button>
        {!isEdit && (
          <button
            type="submit"
            className="btn btn-outline-primary"
            disabled={isSubmitting}
            onClick={() => {
              submitIntentRef.current = 'saveAndAddAnother';
            }}
          >
            Save &amp; Add Another
          </button>
        )}
        <button type="button" className="btn btn-link" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
      </div>

      <MedicineSearchDialog
        show={showMedicineSearch}
        onSelect={handleSelectMedicine}
        onCancel={() => setShowMedicineSearch(false)}
      />
    </form>
  );
}

export default PatientMedicationForm;
