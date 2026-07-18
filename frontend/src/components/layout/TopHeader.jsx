import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';

// Bootstrap's dropdown *visuals* (the `.dropdown-menu.show` class pair) are used here,
// but the open/close behavior is plain React state, not Bootstrap's JS bundle - mixing
// React's declarative rendering with Bootstrap's imperative DOM manipulation is a
// common source of bugs, so this app never loads bootstrap.bundle.js.
function TopHeader({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
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
    <header
      className="d-flex align-items-center justify-content-between bg-white border-bottom px-3"
      style={{ height: 56, position: 'sticky', top: 0, zIndex: 1040 }}
    >
      <div className="d-flex align-items-center gap-2">
        <button
          type="button"
          className="btn btn-light btn-sm border-0"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <i className="bi bi-list fs-4" aria-hidden="true" />
        </button>

        <i className="bi bi-capsule-pill fs-3 text-primary" aria-hidden="true" />
        <span className="fw-semibold fs-5 d-none d-sm-inline">Prescription Management</span>
      </div>

      <div className="d-flex align-items-center gap-2">
        <button type="button" className="btn btn-light btn-sm border-0 position-relative" aria-label="Notifications">
          <i className="bi bi-bell fs-5" aria-hidden="true" />
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
            <span className="visually-hidden">New notifications</span>
          </span>
        </button>

        <div className="position-relative">
          <button
            type="button"
            className="btn btn-light btn-sm border-0 d-flex align-items-center gap-2"
            onClick={() => setIsProfileMenuOpen((open) => !open)}
          >
            <i className="bi bi-person-circle fs-4" aria-hidden="true" />
            {user && (
              <span className="d-none d-md-flex flex-column text-start lh-1">
                <span className="fw-semibold small">{user.fullName}</span>
                <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                  {user.role?.displayText}
                </span>
              </span>
            )}
            <i className="bi bi-caret-down-fill small" aria-hidden="true" />
          </button>

          <ul
            className={`dropdown-menu dropdown-menu-end mt-2 ${isProfileMenuOpen ? 'show' : ''}`}
            style={{ right: 0 }}
          >
            <li>
              <h6 className="dropdown-header">{user?.fullName}</h6>
            </li>
            <li>
              <span className="dropdown-item-text text-muted small">{user?.role?.displayText}</span>
            </li>
            <li>
              <hr className="dropdown-divider" />
            </li>
            <li>
              <button type="button" className="dropdown-item" onClick={handleLogout} disabled={isLoggingOut}>
                <i className="bi bi-box-arrow-right me-2" aria-hidden="true" />
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </li>
          </ul>
        </div>

        <button
          type="button"
          className="btn btn-outline-primary btn-sm d-none d-sm-inline-flex align-items-center gap-1"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <span className="spinner-border spinner-border-sm" aria-hidden="true" />
          ) : (
            <i className="bi bi-box-arrow-right" aria-hidden="true" />
          )}
          Logout
        </button>
      </div>
    </header>
  );
}

export default TopHeader;
