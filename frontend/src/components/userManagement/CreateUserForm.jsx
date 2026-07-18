import { useState } from 'react';
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

function validate(form) {
  const errors = {};

  if (!form.firstName.trim()) errors.firstName = 'First name is required.';
  if (!form.lastName.trim()) errors.lastName = 'Last name is required.';
  if (!form.username.trim()) errors.username = 'Username is required.';

  if (!form.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_PATTERN.test(form.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  if (!form.roleCode) {
    errors.roleCode = 'Role is required.';
  }

  if (!form.temporaryPassword) {
    errors.temporaryPassword = 'Temporary password is required.';
  } else if (form.temporaryPassword.length < 8) {
    errors.temporaryPassword = 'Password must be at least 8 characters.';
  }

  return errors;
}

// Server-side uniqueness validation (Username/Email) has no separate "check while
// typing" endpoint - the backend's usp_User_CheckUsernameExists/CheckEmailExists procs
// are only used internally by UserService, never exposed via the API. Uniqueness is
// therefore validated by the actual Create submission (a 409 response), surfaced by
// the parent page as fieldErrors, not by this form checking ahead of time.
function CreateUserForm({ onSubmit, onCancel, isSubmitting, fieldErrors: serverFieldErrors }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [clientFieldErrors, setClientFieldErrors] = useState({});

  const fieldErrors = { ...clientFieldErrors, ...serverFieldErrors };

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleReset() {
    setForm(EMPTY_FORM);
    setClientFieldErrors({});
  }

  function handleGeneratePassword() {
    updateField('temporaryPassword', generateRandomPassword());
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
            disabled={isSubmitting}
            maxLength={100}
            autoComplete="off"
          />
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
      </div>

      <div className="d-flex gap-2 mt-4">
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
              Saving...
            </>
          ) : (
            'Save'
          )}
        </button>
        <button type="button" className="btn btn-outline-secondary" onClick={handleReset} disabled={isSubmitting}>
          Reset
        </button>
        <button type="button" className="btn btn-link" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default CreateUserForm;
