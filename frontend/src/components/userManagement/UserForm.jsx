import { useEffect, useState } from 'react';
import { ROLE_OPTIONS } from '../../auth/roles.js';

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  phoneNumber: '',
  roleCode: '',
  temporaryPassword: '',
  isActive: true,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';

function generateRandomPassword() {
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += PASSWORD_ALPHABET[Math.floor(Math.random() * PASSWORD_ALPHABET.length)];
  }
  return result;
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : '—';
}

function validate(form, mode) {
  const errors = {};

  if (!form.firstName.trim()) errors.firstName = 'First name is required.';
  if (!form.lastName.trim()) errors.lastName = 'Last name is required.';

  if (mode === 'create' && !form.username.trim()) {
    errors.username = 'Username is required.';
  }

  if (!form.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_PATTERN.test(form.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  if (!form.roleCode) {
    errors.roleCode = 'Role is required.';
  }

  if (mode === 'create') {
    if (!form.temporaryPassword) {
      errors.temporaryPassword = 'Temporary password is required.';
    } else if (form.temporaryPassword.length < 8) {
      errors.temporaryPassword = 'Password must be at least 8 characters.';
    }
  }

  return errors;
}

// Shared by CreateUserPage (mode="create") and EditUserPage (mode="edit") so field
// layout, validation, and styling live in exactly one place. Server-side Username/Email
// uniqueness has no separate "check while typing" endpoint - it's only ever validated
// by the actual Create/Update submission (a 409 response), surfaced by the parent page
// as fieldErrors, not by this form checking ahead of time.
function UserForm({ mode, initialValues, onSubmit, onCancel, isSubmitting, fieldErrors: serverFieldErrors, onDirtyChange }) {
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, ...initialValues }));
  const [clientFieldErrors, setClientFieldErrors] = useState({});

  const fieldErrors = { ...clientFieldErrors, ...serverFieldErrors };
  const isEdit = mode === 'edit';

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

  function handleGeneratePassword() {
    updateField('temporaryPassword', generateRandomPassword());
  }

  function handleSubmit(event) {
    event.preventDefault();

    const errors = validate(form, mode);
    setClientFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="row g-3">
        <div className="col-12 col-md-6">
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

        <div className="col-12 col-md-6">
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

        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            type="text"
            className={`form-control ${fieldErrors.username ? 'is-invalid' : ''}`}
            value={form.username}
            onChange={(event) => updateField('username', event.target.value)}
            disabled={isSubmitting || isEdit}
            readOnly={isEdit}
            maxLength={100}
            autoComplete="off"
          />
          {isEdit && <div className="form-text">Username cannot be changed.</div>}
          {fieldErrors.username && <div className="invalid-feedback d-block">{fieldErrors.username}</div>}
        </div>

        <div className="col-12 col-md-6">
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

        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="phoneNumber">
            Phone Number
          </label>
          <input
            id="phoneNumber"
            type="tel"
            className={`form-control ${fieldErrors.phoneNumber ? 'is-invalid' : ''}`}
            value={form.phoneNumber}
            onChange={(event) => updateField('phoneNumber', event.target.value)}
            disabled={isSubmitting}
            maxLength={20}
          />
          {fieldErrors.phoneNumber && <div className="invalid-feedback d-block">{fieldErrors.phoneNumber}</div>}
        </div>

        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="roleCode">
            Role
          </label>
          <select
            id="roleCode"
            className={`form-select ${fieldErrors.roleCode ? 'is-invalid' : ''}`}
            value={form.roleCode}
            onChange={(event) => updateField('roleCode', event.target.value)}
            disabled={isSubmitting}
          >
            <option value="">Select a role...</option>
            {ROLE_OPTIONS.map((role) => (
              <option key={role.code} value={role.code}>
                {role.label}
              </option>
            ))}
          </select>
          {fieldErrors.roleCode && <div className="invalid-feedback d-block">{fieldErrors.roleCode}</div>}
        </div>

        {!isEdit && (
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="temporaryPassword">
              Temporary Password
            </label>
            <div className="input-group">
              <input
                id="temporaryPassword"
                type="text"
                className={`form-control ${fieldErrors.temporaryPassword ? 'is-invalid' : ''}`}
                value={form.temporaryPassword}
                onChange={(event) => updateField('temporaryPassword', event.target.value)}
                disabled={isSubmitting}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={handleGeneratePassword}
                disabled={isSubmitting}
              >
                Generate
              </button>
            </div>
            {fieldErrors.temporaryPassword && (
              <div className="invalid-feedback d-block">{fieldErrors.temporaryPassword}</div>
            )}
            <div className="form-text">The user must change this password at their next login.</div>
          </div>
        )}

        <div className="col-12 col-md-6 d-flex align-items-end">
          <div className="form-check form-switch">
            <input
              id="isActive"
              type="checkbox"
              role="switch"
              className="form-check-input"
              checked={form.isActive}
              onChange={(event) => updateField('isActive', event.target.checked)}
              disabled={isSubmitting}
            />
            <label className="form-check-label" htmlFor="isActive">
              Active
            </label>
          </div>
        </div>

        {isEdit && (
          <>
            <div className="col-12 col-md-6">
              <label className="form-label">Created Date</label>
              <input type="text" className="form-control" value={formatDateTime(initialValues.createdDate)} readOnly disabled />
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label">Last Login</label>
              <input
                type="text"
                className="form-control"
                value={formatDateTime(initialValues.lastLoginDate)}
                readOnly
                disabled
              />
            </div>
          </>
        )}
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

export default UserForm;
