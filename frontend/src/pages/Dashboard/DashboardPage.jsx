import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext.jsx';
import AppNavbar from '../../components/layout/AppNavbar.jsx';

// Visual placeholders only for future modules - no routes/functionality behind these
// yet, per this step's scope.
const MODULES = [
  { title: 'Dashboard', icon: 'bi-speedometer2' },
  { title: 'Patients', icon: 'bi-people' },
  { title: 'Prescriptions', icon: 'bi-file-earmark-medical' },
  { title: 'Medicines', icon: 'bi-capsule' },
  { title: 'Lookup Management', icon: 'bi-list-check' },
  { title: 'Reports', icon: 'bi-bar-chart-line' },
  { title: 'Settings', icon: 'bi-gear' },
];

function useCurrentDateTime() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  return now;
}

function DashboardPage() {
  const { user } = useAuth();
  const now = useCurrentDateTime();

  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      <AppNavbar />

      <main className="container-fluid flex-grow-1 py-4">
        <div className="row mb-4">
          <div className="col-12">
            <h1 className="h3">Welcome{user ? `, ${user.fullName}` : ''}!</h1>
            <p className="text-muted mb-0">
              {now.toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              {' – '}
              {now.toLocaleTimeString()}
            </p>
          </div>
        </div>

        {user && (
          <div className="row mb-4">
            <div className="col-12 col-md-8 col-lg-6">
              <div className="card shadow-sm">
                <div className="card-body">
                  <h2 className="h6 text-uppercase text-muted mb-3">Your Profile</h2>
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

        <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-4">
          {MODULES.map((module) => (
            <div className="col" key={module.title}>
              <div className="card h-100 text-center shadow-sm">
                <div className="card-body d-flex flex-column align-items-center justify-content-center py-4">
                  <i className={`bi ${module.icon} fs-1 text-primary mb-3`} aria-hidden="true" />
                  <h3 className="h6 mb-1">{module.title}</h3>
                  <span className="badge text-bg-secondary">Coming soon</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default DashboardPage;
