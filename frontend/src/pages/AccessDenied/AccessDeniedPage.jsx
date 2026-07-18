import { Link } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer.jsx';

function AccessDeniedPage() {
  return (
    <PageContainer title="Access Denied">
      <div className="card border-0 shadow-sm rounded-3">
        <div className="card-body text-center py-5">
          <i className="bi bi-shield-lock display-1 text-danger" aria-hidden="true" />
          <h2 className="h4 mt-3">Access Denied</h2>
          <p className="text-muted">You don't have permission to view this page.</p>
          <Link to="/dashboard" className="btn btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}

export default AccessDeniedPage;
