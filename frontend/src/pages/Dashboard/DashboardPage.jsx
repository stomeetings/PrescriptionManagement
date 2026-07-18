import { useAuth } from '../../auth/AuthContext.jsx';
import PageContainer from '../../components/layout/PageContainer.jsx';
import SummaryCard from '../../components/dashboard/SummaryCard.jsx';
import PatientSummaryTable from '../../components/dashboard/PatientSummaryTable.jsx';
import { MOCK_PATIENTS } from '../../data/mockPatients.js';

// Mock values only - no Patients/Prescriptions/Medicines/User Management backend
// modules exist yet. Swap for real API-backed counts once those modules land.
const SUMMARY_CARDS = [
  { label: 'Total Patients', value: 128, icon: 'bi-people', accent: 'primary' },
  { label: 'Active Prescriptions', value: 34, icon: 'bi-file-earmark-medical', accent: 'success' },
  { label: 'Total Medicines', value: 76, icon: 'bi-capsule', accent: 'warning' },
  { label: 'Users', value: 12, icon: 'bi-person-badge', accent: 'info' },
];

function DashboardPage() {
  const { user } = useAuth();

  return (
    <PageContainer title="Dashboard">
      <div className="mb-4">
        <h2 className="h4">Welcome{user ? `, ${user.fullName}` : ''}!</h2>
      </div>

      {user && (
        <div className="row mb-4">
          <div className="col-12 col-md-8 col-lg-6">
            <div className="card border-0 shadow-sm rounded-3">
              <div className="card-body">
                <h3 className="h6 text-uppercase text-muted mb-3">Your Profile</h3>
                <dl className="row mb-0">
                  <dt className="col-sm-4">Full Name</dt>
                  <dd className="col-sm-8">{user.fullName}</dd>

                  {user.username && (
                    <>
                      <dt className="col-sm-4">Username</dt>
                      <dd className="col-sm-8">{user.username}</dd>
                    </>
                  )}

                  <dt className="col-sm-4">Role</dt>
                  <dd className="col-sm-8">{user.role?.displayText}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-3 mb-4">
        {SUMMARY_CARDS.map((card) => (
          <div className="col" key={card.label}>
            <SummaryCard {...card} />
          </div>
        ))}
      </div>

      <PatientSummaryTable patients={MOCK_PATIENTS} />
    </PageContainer>
  );
}

export default DashboardPage;
