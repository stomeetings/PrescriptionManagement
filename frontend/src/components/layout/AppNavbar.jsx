import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';

// Shared header for authenticated pages - not specific to the Dashboard, so any
// future protected page (Patients, Prescriptions, ...) can reuse it as-is.
function AppNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
    }
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container-fluid">
        <span className="navbar-brand mb-0 h1">Prescription Management</span>

        <div className="d-flex align-items-center ms-auto text-white">
          {user && (
            <span className="me-3 d-none d-sm-inline">
              Signed in as <strong>{user.fullName}</strong>
            </span>
          )}
          <button
            type="button"
            className="btn btn-outline-light btn-sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" aria-hidden="true" />
                Logging out...
              </>
            ) : (
              <>
                <i className="bi bi-box-arrow-right me-1" aria-hidden="true" />
                Logout
              </>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}

export default AppNavbar;
