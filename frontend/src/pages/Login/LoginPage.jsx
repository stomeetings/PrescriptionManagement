import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { parseApiError } from '../../api/parseApiError.js';
import { useAuth } from '../../auth/AuthContext.jsx';

function validate(username, password) {
  const errors = {};

  if (!username.trim()) {
    errors.username = 'Username is required.';
  }

  if (!password.trim()) {
    errors.password = 'Password is required.';
  }

  return errors;
}

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const redirectTo = location.state?.from?.pathname ?? '/dashboard';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setGeneralError('');

    const clientErrors = validate(username, password);
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await login(username, password);

      navigate(redirectTo, { replace: true });
    } catch (error) {
      const { generalMessage, fieldErrors: apiFieldErrors } = parseApiError(error);

      setGeneralError(generalMessage ?? '');
      setFieldErrors(apiFieldErrors);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <div className="card shadow-sm" style={{ width: '24rem' }}>
        <div className="card-body p-4">
          <h1 className="h4 mb-4 text-center">Sign In</h1>

          {generalError && (
            <div className="alert alert-danger" role="alert">
              {generalError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="username" className="form-label">
                Username
              </label>
              <input
                id="username"
                type="text"
                className={`form-control ${fieldErrors.username ? 'is-invalid' : ''}`}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                disabled={isSubmitting}
                autoComplete="username"
              />
              {fieldErrors.username && <div className="invalid-feedback">{fieldErrors.username}</div>}
            </div>

            <div className="mb-4">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                className={`form-control ${fieldErrors.password ? 'is-invalid' : ''}`}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting}
                autoComplete="current-password"
              />
              {fieldErrors.password && <div className="invalid-feedback">{fieldErrors.password}</div>}
            </div>

            <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
