import { useEffect, useState } from 'react';
import { getLookupCategory } from '../../api/lookupsApi.js';

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  preferredName: '',
  dateOfBirth: '',
  genderCode: '',
  mobileNumber: '',
  email: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  region: '',
  postalCode: '',
  country: '',
  nhiNumber: '',
  nzmcNumber: '',
  notes: '',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// No confirmed mobile-number format rule exists anywhere in the approved specs (all
// three explicitly leave it unresolved pending the system's NZ-only-vs-general locale
// scope decision) - mirrors PatientService's own interim server-side rule exactly
// (digits, spaces, "+", "-", parentheses, 7-20 characters), so client and server agree.
const MOBILE_PATTERN = /^[0-9+()\-\s]{7,20}$/;

// NZ NHI numbers are historically 3 letters followed by 4 digits (e.g. ABC1234) - the
// same shape used by the Patient Management seed data. Newer NHI numbers (issued since
// ~2020) add a check-letter suffix instead of the 4th digit; that variant is not
// validated here since none of the approved specs confirm which format this system
// targets - flagged as this form's own concrete choice, not a documented project rule.
const NHI_PATTERN = /^[A-Za-z]{3}[0-9]{4}$/;

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : '—';
}

function todayAsDateOnly() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function validate(form) {
  const errors = {};

  if (!form.firstName.trim()) {
    errors.firstName = 'First name is required.';
  }

  if (!form.lastName.trim()) {
    errors.lastName = 'Last name is required.';
  }

  if (!form.dateOfBirth) {
    errors.dateOfBirth = 'Date of birth is required.';
  } else {
    const dateOfBirth = new Date(form.dateOfBirth);
    dateOfBirth.setHours(0, 0, 0, 0);
    if (dateOfBirth > todayAsDateOnly()) {
      errors.dateOfBirth = 'Date of birth cannot be in the future.';
    }
  }

  if (!form.genderCode) {
    errors.genderCode = 'Gender is required.';
  }

  if (form.email.trim() && !EMAIL_PATTERN.test(form.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  if (form.mobileNumber.trim() && !MOBILE_PATTERN.test(form.mobileNumber.trim())) {
    errors.mobileNumber = 'Enter a valid mobile number.';
  }

  if (form.nhiNumber.trim() && !NHI_PATTERN.test(form.nhiNumber.trim())) {
    errors.nhiNumber = 'Enter a valid NHI number (3 letters followed by 4 digits, e.g. ABC1234).';
  }

  return errors;
}

// Shared by CreatePatientPage (mode="create") and EditPatientPage (mode="edit", Step
// 9.3) so field layout, validation, and styling live in exactly one place - mirrors
// UserForm's identical create/edit split. PatientNumber is never an editable field: it
// only ever appears as a read-only value once one exists (post-creation, i.e. in edit
// mode), matching the backend's own immutability rule.
function PatientForm({ mode, initialValues, onSubmit, onCancel, isSubmitting, fieldErrors: serverFieldErrors, onDirtyChange }) {
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, ...initialValues }));
  const [clientFieldErrors, setClientFieldErrors] = useState({});
  const [genderOptions, setGenderOptions] = useState([]);

  const fieldErrors = { ...clientFieldErrors, ...serverFieldErrors };
  const isEdit = mode === 'edit';

  useEffect(() => {
    let isMounted = true;

    getLookupCategory('gender')
      .then((category) => {
        if (isMounted) {
          setGenderOptions(category.values ?? []);
        }
      })
      .catch(() => {
        // Non-fatal: the Gender select just shows only the placeholder option if this
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
      {isEdit && initialValues.patientNumber && (
        <div className="row g-3 mb-2">
          <div className="col-12 col-md-3">
            <label className="form-label">Patient Number</label>
            <input type="text" className="form-control" value={initialValues.patientNumber} readOnly disabled />
          </div>

          <div className="col-12 col-md-3">
            <label className="form-label d-block">Status</label>
            {/* Read-only here by design (see Step 9.3's scoping decision) - this form
                cannot change Active Status: usp_Patient_Update/UpdatePatientRequest
                structurally exclude IsActive, and the only mechanism that can change it
                (Activate/Deactivate) is out of scope for this page. Use the Patient
                List's existing Activate/Deactivate actions instead. */}
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
            <label className="form-label">Last Updated</label>
            <input type="text" className="form-control" value={formatDateTime(initialValues.updatedDate)} readOnly disabled />
          </div>

          <div className="col-12 col-md-3">
            <label className="form-label">Updated By</label>
            <input type="text" className="form-control" value={initialValues.updatedBy || '—'} readOnly disabled />
          </div>
        </div>
      )}

      <h2 className="h6 text-uppercase text-muted mb-3">Personal Details</h2>
      <div className="row g-3">
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="firstName">
            First Name
          </label>
          <input
            id="firstName"
            type="text"
            className={`form-control ${fieldErrors.firstName ? 'is-invalid' : ''}`}
            value={form.firstName}
            onChange={(event) => updateField('firstName', event.target.value)}
            disabled={isSubmitting}
            maxLength={100}
          />
          {fieldErrors.firstName && <div className="invalid-feedback d-block">{fieldErrors.firstName}</div>}
        </div>

        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="lastName">
            Last Name
          </label>
          <input
            id="lastName"
            type="text"
            className={`form-control ${fieldErrors.lastName ? 'is-invalid' : ''}`}
            value={form.lastName}
            onChange={(event) => updateField('lastName', event.target.value)}
            disabled={isSubmitting}
            maxLength={100}
          />
          {fieldErrors.lastName && <div className="invalid-feedback d-block">{fieldErrors.lastName}</div>}
        </div>

        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="preferredName">
            Preferred Name
          </label>
          <input
            id="preferredName"
            type="text"
            className={`form-control ${fieldErrors.preferredName ? 'is-invalid' : ''}`}
            value={form.preferredName}
            onChange={(event) => updateField('preferredName', event.target.value)}
            disabled={isSubmitting}
            maxLength={100}
          />
          {fieldErrors.preferredName && <div className="invalid-feedback d-block">{fieldErrors.preferredName}</div>}
        </div>

        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="dateOfBirth">
            Date of Birth
          </label>
          <input
            id="dateOfBirth"
            type="date"
            className={`form-control ${fieldErrors.dateOfBirth ? 'is-invalid' : ''}`}
            value={form.dateOfBirth}
            onChange={(event) => updateField('dateOfBirth', event.target.value)}
            disabled={isSubmitting}
            max={new Date().toISOString().slice(0, 10)}
          />
          {fieldErrors.dateOfBirth && <div className="invalid-feedback d-block">{fieldErrors.dateOfBirth}</div>}
        </div>

        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="genderCode">
            Gender
          </label>
          <select
            id="genderCode"
            className={`form-select ${fieldErrors.genderCode ? 'is-invalid' : ''}`}
            value={form.genderCode}
            onChange={(event) => updateField('genderCode', event.target.value)}
            disabled={isSubmitting}
          >
            <option value="">Select a gender...</option>
            {genderOptions.map((gender) => (
              <option key={gender.code} value={gender.code}>
                {gender.displayText}
              </option>
            ))}
          </select>
          {fieldErrors.genderCode && <div className="invalid-feedback d-block">{fieldErrors.genderCode}</div>}
        </div>
      </div>

      <h2 className="h6 text-uppercase text-muted mb-3 mt-4">Contact Details</h2>
      <div className="row g-3">
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="mobileNumber">
            Mobile Number
          </label>
          <input
            id="mobileNumber"
            type="tel"
            className={`form-control ${fieldErrors.mobileNumber ? 'is-invalid' : ''}`}
            value={form.mobileNumber}
            onChange={(event) => updateField('mobileNumber', event.target.value)}
            disabled={isSubmitting}
            maxLength={20}
          />
          {fieldErrors.mobileNumber && <div className="invalid-feedback d-block">{fieldErrors.mobileNumber}</div>}
        </div>

        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className={`form-control ${fieldErrors.email ? 'is-invalid' : ''}`}
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
            disabled={isSubmitting}
            maxLength={256}
          />
          {fieldErrors.email && <div className="invalid-feedback d-block">{fieldErrors.email}</div>}
        </div>
      </div>

      <h2 className="h6 text-uppercase text-muted mb-3 mt-4">Address</h2>
      <div className="row g-3">
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="addressLine1">
            Address Line 1
          </label>
          <input
            id="addressLine1"
            type="text"
            className="form-control"
            value={form.addressLine1}
            onChange={(event) => updateField('addressLine1', event.target.value)}
            disabled={isSubmitting}
            maxLength={200}
          />
        </div>

        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="addressLine2">
            Address Line 2
          </label>
          <input
            id="addressLine2"
            type="text"
            className="form-control"
            value={form.addressLine2}
            onChange={(event) => updateField('addressLine2', event.target.value)}
            disabled={isSubmitting}
            maxLength={200}
          />
        </div>

        <div className="col-12 col-md-3">
          <label className="form-label" htmlFor="city">
            City
          </label>
          <input
            id="city"
            type="text"
            className="form-control"
            value={form.city}
            onChange={(event) => updateField('city', event.target.value)}
            disabled={isSubmitting}
            maxLength={100}
          />
        </div>

        <div className="col-12 col-md-3">
          <label className="form-label" htmlFor="region">
            State / Region
          </label>
          <input
            id="region"
            type="text"
            className="form-control"
            value={form.region}
            onChange={(event) => updateField('region', event.target.value)}
            disabled={isSubmitting}
            maxLength={100}
          />
        </div>

        <div className="col-12 col-md-3">
          <label className="form-label" htmlFor="postalCode">
            Postal Code
          </label>
          <input
            id="postalCode"
            type="text"
            className="form-control"
            value={form.postalCode}
            onChange={(event) => updateField('postalCode', event.target.value)}
            disabled={isSubmitting}
            maxLength={20}
          />
        </div>

        <div className="col-12 col-md-3">
          <label className="form-label" htmlFor="country">
            Country
          </label>
          <input
            id="country"
            type="text"
            className="form-control"
            value={form.country}
            onChange={(event) => updateField('country', event.target.value)}
            disabled={isSubmitting}
            maxLength={100}
          />
        </div>
      </div>

      <h2 className="h6 text-uppercase text-muted mb-3 mt-4">Healthcare Identifiers</h2>
      <div className="row g-3">
        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="nhiNumber">
            NHI Number
          </label>
          <input
            id="nhiNumber"
            type="text"
            className={`form-control ${fieldErrors.nhiNumber ? 'is-invalid' : ''}`}
            value={form.nhiNumber}
            onChange={(event) => updateField('nhiNumber', event.target.value)}
            disabled={isSubmitting}
            maxLength={20}
          />
          {fieldErrors.nhiNumber && <div className="invalid-feedback d-block">{fieldErrors.nhiNumber}</div>}
        </div>

        <div className="col-12 col-md-4">
          <label className="form-label" htmlFor="nzmcNumber">
            NZMC Number
          </label>
          <input
            id="nzmcNumber"
            type="text"
            className="form-control"
            value={form.nzmcNumber}
            onChange={(event) => updateField('nzmcNumber', event.target.value)}
            disabled={isSubmitting}
            maxLength={20}
          />
          <div className="form-text">Only applicable if this patient is also a registered practitioner.</div>
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

export default PatientForm;
