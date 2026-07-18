import PageContainer from '../../components/layout/PageContainer.jsx';

// Generic placeholder for every sidebar module that isn't built yet (Patients,
// Prescriptions, Medicines, Lookup Management, User Management, Reports, Settings).
// Real routing/active-highlight/breadcrumb behavior all still work correctly against
// these - only the page content itself is a stand-in.
function ComingSoonPage({ title }) {
  return (
    <PageContainer title={title}>
      <div className="card border-0 shadow-sm rounded-3">
        <div className="card-body text-center py-5">
          <i className="bi bi-cone-striped display-4 text-muted" aria-hidden="true" />
          <h2 className="h5 mt-3">{title} is coming soon</h2>
          <p className="text-muted mb-0">This module hasn't been built yet.</p>
        </div>
      </div>
    </PageContainer>
  );
}

export default ComingSoonPage;
