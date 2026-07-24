import { useEffect, useState } from 'react';
import { getLookupCategory } from '../../api/lookupsApi.js';

const EMPTY_FORM = {
  medicineCode: '',
  medicineName: '',
  genericName: '',
  brandName: '',
  strength: '',
  medicineFormCode: '',
  medicineRouteCode: '',
  manufacturer: '',
  atcCode: '',
  isControlledDrug: false,
  notes: '',
};

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : '—';
}

function validate(form) {
  const errors = {};

  if (!form.medicineCode.trim()) {
    errors.medicineCode = 'Medicine Code is required.';
  }

  if (!form.medicineName.trim()) {
    errors.medicineName = 'Medicine Name is required.';
  }

  if (!form.genericName.trim()) {
    errors.genericName = 'Generic Name is required.';
  }

  if (!form.strength.trim()) {
    errors.strength = 'Strength is required.';
  }

  if (!form.medicineFormCode) {
    errors.medicineFormCode = 'Dosage Form is required.';
  }

  if (!form.medicineRouteCode) {
    errors.medicineRouteCode = 'Route is required.';
  }

  return errors;
}

// Shared by CreateMedicinePage (mode="create") and EditMedicinePage (mode="edit", Step
// 12.3) so field layout, validation, and styling live in exactly one place - mirrors
// PatientForm's identical create/edit split. MedicineCode is only ever editable in
// Create mode: once assigned it becomes a read-only value in Edit mode, matching the
// backend's own immutability rule (business spec section 5.5). Medicine Code/Name/
// Strength/Dosage Form uniqueness is not checked live while typing - the backend's
// usp_Medicine_CheckMedicineCodeExists/usp_Medicine_CheckDuplicateMedicine procedures
// are advisory-only and have no wired "check while typing" endpoint on the frontend
// (same precedent as PatientForm's NHI/PatientNumber handling) - both are only ever
// actually enforced by the Create/Update submission itself (a 409 response), surfaced
// here as fieldErrors.
function MedicineForm({ mode, initialValues, onSubmit, onCancel, isSubmitting, fieldErrors: serverFieldErrors, onDirtyChange }) {
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, ...initialValues }));
  const [clientFieldErrors, setClientFieldErrors] = useState({});
  const [dosageFormOptions, setDosageFormOptions] = useState([]);
  const [routeOptions, setRouteOptions] = useState([]);

  const fieldErrors = { ...clientFieldErrors, ...serverFieldErrors };
  const isEdit = mode === 'edit';

  useEffect(() => {
    let isMounted = true;

    Promise.all([getLookupCategory('medicineform'), getLookupCategory('medicineroute')])
      .then(([formCategory, routeCategory]) => {
        if (isMounted) {
          setDosageFormOptions(formCategory.values ?? []);
          setRouteOptions(routeCategory.values ?? []);
        }
      })
      .catch(() => {
        // Non-fatal: the Dosage Form/Route selects just show only the placeholder
        // option if this fails - it must not block the rest of the form from being
        // usable.
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
    const isDirty = Object.keys(EMPTY_FORM).some((key) => form[key] !== baseline[key]);
    onDirtyChange(isDirty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleReset() {
    setForm({ ...EMPTY_FORM, ...initialValues });
    setClientFieldErrors({});
  }

  function handleSubmit(event) {
    event.preventDefault();

    const errors = validate(form);
    setClientFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {isEdit && initialValues.isActive !== undefined && (
        <div className="row g-3 mb-2">
          <div className="col-12 col-md-3">
            <label className="form-label d-block">Status</label>
            {/* Read-only here by design (same resolution already made for
                PatientForm/Step 9.3): this form cannot change Active Status -
                usp_Medicine_Update/UpdateMedicineRequest structurally exclude IsActive,
                and the only mechanism that can change it (Activate/Deactivate) is out
                of scope for this page. Use the Medicine List's Activate/Deactivate
                actions instead. */}
            <div>
              <span className={`badge rounded-pill text-bg-${initialValues.isActive ? 'success' : 'secondary'}`}>
                {initialValues.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div className="col-12 col-md-3">
            <label className="form-label">Created Date</label>
            <input type="text" className="form-control" value={formatDateTime(initialValues.createdDate)} readOnly disabled />
          </div>

          <div className="col-12 col-md-3">
            <label className="form-label">Created By</label>
            <input type="text" className="form-control" value={initialValues.createdBy || '—'} readOnly disabled />
          </div>

          <div className="col-12 col-md-3">
            <label className="form-label">Updated Date</label>
            <input type="text" className="form-control" value={formatDateTime(initialValues.updatedDate)} readOnly disabled />
          </div>

          <div className="col-12 col-md-3">
            <label className="form-label">Updated By</label>
            <input type="text" className="form-control" value={initialValues.updatedBy || '—'} readOnly disabled />
          </div>
        </div>
      )}

      <h2 className="h6 text-uppercase text-muted mb-3">Medicine Details</h2>
      <div className="row g-3">
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="medicineCode">
            Medicine Code
          </label>
          <input
            id="medicineCode"
            type="text"
            className={`form-control ${fieldErrors.medicineCode ? 'is-invalid' : ''}`}
            value={form.medicineCode}
            onChange={(event) => updateField('medicineCode', event.target.value)}
            disabled={isSubmitting || isEdit}
            readOnly={isEdit}
            maxLength={20}
            autoComplete="off"
          />
          {isEdit && <div className="form-text">Medicine Code cannot be changed.</div>}
          {fieldErrors.medicineCode && <div className="invalid-feedback d-block">{fieldErrors.medicineCode}</div>}
        </div>

        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="medicineName">
            Medicine Name
          </label>
          <input
            id="medicineName"
            type="text"
            className={`form-control ${fieldErrors.medicineName ? 'is-invalid' : ''}`}
            value={form.medicineName}
            onChange={(event) => updateField('medicineName', event.target.value)}
            disabled={isSubmitting}
            maxLength={200}
          />
          {fieldErrors.medicineName && <div className="invalid-feedback d-block">{fieldErrors.medicineName}</div>}
        </div>

        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="genericName">
            Generic Name
          </label>
          <input
            id="genericName"
            type="text"
            className={`form-control ${fieldErrors.genericName ? 'is-invalid' : ''}`}
            value={form.genericName}
            onChange={(event) => updateField('genericName', event.target.value)}
            disabled={isSubmitting}
            maxLength={200}
          />
          {fieldErrors.genericName && <div className="invalid-feedback d-block">{fieldErrors.genericName}</div>}
        </div>

        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="brandName">
            Brand Name
          </label>
          <input
            id="brandName"
            type="text"
            className="form-control"
            value={form.brandName}
            onChange={(event) => updateField('brandName', event.target.value)}
            disabled={isSubmitting}
            maxLength={200}
          />
        </div>

        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="strength">
            Strength
          </label>
          <input
            id="strength"
            type="text"
            className={`form-control ${fieldErrors.strength ? 'is-invalid' : ''}`}
            value={form.strength}
            onChange={(event) => updateField('strength', event.target.value)}
            disabled={isSubmitting}
            maxLength={50}
            placeholder="e.g. 500 mg"
          />
          {fieldErrors.strength && <div className="invalid-feedback d-block">{fieldErrors.strength}</div>}
        </div>

        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="medicineFormCode">
            Dosage Form
          </label>
          <select
            id="medicineFormCode"
            className={`form-select ${fieldErrors.medicineFormCode ? 'is-invalid' : ''}`}
            value={form.medicineFormCode}
            onChange={(event) => updateField('medicineFormCode', event.target.value)}
            disabled={isSubmitting}
          >
            <option value="">Select a dosage form...</option>
            {dosageFormOptions.map((form_) => (
              <option key={form_.code} value={form_.code}>
                {form_.displayText}
              </option>
            ))}
          </select>
          {fieldErrors.medicineFormCode && <div className="invalid-feedback d-block">{fieldErrors.medicineFormCode}</div>}
        </div>

        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="medicineRouteCode">
            Route
          </label>
          <select
            id="medicineRouteCode"
            className={`form-select ${fieldErrors.medicineRouteCode ? 'is-invalid' : ''}`}
            value={form.medicineRouteCode}
            onChange={(event) => updateField('medicineRouteCode', event.target.value)}
            disabled={isSubmitting}
          >
            <option value="">Select a route...</option>
            {routeOptions.map((route) => (
              <option key={route.code} value={route.code}>
                {route.displayText}
              </option>
            ))}
          </select>
          {fieldErrors.medicineRouteCode && <div className="invalid-feedback d-block">{fieldErrors.medicineRouteCode}</div>}
        </div>

        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="manufacturer">
            Manufacturer
          </label>
          <input
            id="manufacturer"
            type="text"
            className="form-control"
            value={form.manufacturer}
            onChange={(event) => updateField('manufacturer', event.target.value)}
            disabled={isSubmitting}
            maxLength={200}
          />
        </div>

        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="atcCode">
            ATC Code
          </label>
          <input
            id="atcCode"
            type="text"
            className="form-control"
            value={form.atcCode}
            onChange={(event) => updateField('atcCode', event.target.value)}
            disabled={isSubmitting}
            maxLength={20}
          />
          <div className="form-text">WHO Anatomical Therapeutic Chemical code, if known.</div>
        </div>

        <div className="col-12 col-md-4 d-flex align-items-end">
          <div className="form-check">
            <input
              id="isControlledDrug"
              type="checkbox"
              className="form-check-input"
              checked={form.isControlledDrug}
              onChange={(event) => updateField('isControlledDrug', event.target.checked)}
              disabled={isSubmitting}
            />
            <label className="form-check-label" htmlFor="isControlledDrug">
              Controlled Drug
            </label>
          </div>
        </div>
      </div>

      <h2 className="h6 text-uppercase text-muted mb-3 mt-4">Notes</h2>
      <div className="row g-3">
        <div className="col-12">
          <label className="form-label" htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            className="form-control"
            rows={3}
            value={form.notes}
            onChange={(event) => updateField('notes', event.target.value)}
            disabled={isSubmitting}
            maxLength={4000}
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
          <button type="button" className="btn btn-outline-secondary" onClick={handleReset} disabled={isSubmitting}>
            Reset
          </button>
        )}
        <button type="button" className="btn btn-link" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default MedicineForm;
