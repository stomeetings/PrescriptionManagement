import { Link } from 'react-router-dom';

function AccessDeniedPage() {
  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <div className="text-center">
        <i className="bi bi-shield-lock display-1 text-danger" aria-hidden="true" />
        <h1 className="h3 mt-3">Access Denied</h1>
        <p className="text-muted">You don't have permission to view this page.</p>
        <Link to="/dashboard" className="btn btn-primary">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default AccessDeniedPage;
