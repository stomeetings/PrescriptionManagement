import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext.jsx';
import { ROLES } from '../../auth/roles.js';
import PageContainer from '../../components/layout/PageContainer.jsx';
import SummaryCard from '../../components/dashboard/SummaryCard.jsx';
import PatientSummaryTable from '../../components/dashboard/PatientSummaryTable.jsx';
import { getPatients } from '../../api/patientsApi.js';
import { searchPrescriptions } from '../../api/prescriptionApi.js';
import { getMedicines } from '../../api/medicinesApi.js';
import { getUsers } from '../../api/usersApi.js';
import { parseApiError } from '../../api/parseApiError.js';

const RECENT_PATIENTS_PAGE_SIZE = 50;

// "Active Prescriptions" = still moving through the pipeline (Finalized but not yet a
// terminal outcome) - PENDING/PROCESSING/SENT. Matches the same status vocabulary used
// throughout Prescription Management (Draft/Cancelled/Dispensed/Failed/Expired are all
// excluded, each for its own reason: Draft isn't prescribed yet, the other four are
// already-resolved outcomes).
const ACTIVE_PRESCRIPTION_STATUSES = ['PENDING', 'PROCESSING', 'SENT'];

function mapPatientForSummary(patient) {
  return {
    id: patient.patientId,
    patientId: patient.patientNumber,
    fullName: patient.fullName,
    gender: patient.gender?.displayText || '—',
    phone: patient.mobileNumber || '—',
    status: patient.isActive ? 'Active' : 'Inactive',
  };
}

function DashboardPage() {
  const { user, hasRole } = useAuth();
  // GET /api/users is Administrator-only (UsersController's class-level [Authorize]) -
  // fetching it as any other role would 403 the whole Promise.all, so the Users card is
  // simply never requested/shown for non-Administrators, rather than shown broken.
  const canViewUserCount = hasRole(ROLES.SYSTEM_ADMINISTRATOR);

  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState('');
  const [totalPatients, setTotalPatients] = useState(null);
  const [activePrescriptions, setActivePrescriptions] = useState(null);
  const [totalMedicines, setTotalMedicines] = useState(null);
  const [totalUsers, setTotalUsers] = useState(null);

  const [recentPatients, setRecentPatients] = useState([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [patientsError, setPatientsError] = useState('');

  // Every card's number is a paged list's own totalCount - pageSize: 1, since the
  // dashboard only ever needs the count, not the page of items itself. No dedicated
  // "dashboard stats" backend endpoint exists (or is needed) - each module's existing
  // GetAll/Search endpoint already returns totalCount for free.
  const loadSummary = useCallback(async () => {
    setIsLoadingSummary(true);
    setSummaryError('');

    try {
      const [patientsResult, prescriptionResults, medicinesResult, usersResult] = await Promise.all([
        getPatients({ page: 1, pageSize: 1, sortBy: 'createdDate', sortDirection: 'desc' }),
        Promise.all(
          ACTIVE_PRESCRIPTION_STATUSES.map((statusCode) =>
            searchPrescriptions({ statusCode, page: 1, pageSize: 1, sortBy: 'createdDate', sortDirection: 'desc' }),
          ),
        ),
        getMedicines({ page: 1, pageSize: 1, sortBy: 'createdDate', sortDirection: 'desc' }),
        canViewUserCount ? getUsers({ page: 1, pageSize: 1, sortBy: 'createdDate', sortDirection: 'desc' }) : Promise.resolve(null),
      ]);

      setTotalPatients(patientsResult.totalCount);
      setActivePrescriptions(prescriptionResults.reduce((sum, result) => sum + result.totalCount, 0));
      setTotalMedicines(medicinesResult.totalCount);
      setTotalUsers(usersResult ? usersResult.totalCount : null);
    } catch (fetchError) {
      const { generalMessage } = parseApiError(fetchError);
      setSummaryError(generalMessage || 'Unable to load dashboard summary. Please try again.');
    } finally {
      setIsLoadingSummary(false);
    }
  }, [canViewUserCount]);

  const loadRecentPatients = useCallback(async () => {
    setIsLoadingPatients(true);
    setPatientsError('');

    try {
      const result = await getPatients({
        page: 1,
        pageSize: RECENT_PATIENTS_PAGE_SIZE,
        sortBy: 'createdDate',
        sortDirection: 'desc',
      });
      setRecentPatients(result.items.map(mapPatientForSummary));
    } catch (fetchError) {
      const { generalMessage } = parseApiError(fetchError);
      setPatientsError(generalMessage || 'Unable to load recent patients. Please try again.');
    } finally {
      setIsLoadingPatients(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadRecentPatients();
  }, [loadRecentPatients]);

  const summaryCards = [
    { label: 'Total Patients', value: totalPatients, icon: 'bi-people', accent: 'primary' },
    { label: 'Active Prescriptions', value: activePrescriptions, icon: 'bi-file-earmark-medical', accent: 'success' },
    { label: 'Total Medicines', value: totalMedicines, icon: 'bi-capsule', accent: 'warning' },
    ...(canViewUserCount ? [{ label: 'Users', value: totalUsers, icon: 'bi-person-badge', accent: 'info' }] : []),
  ];

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

      {summaryError && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center mb-4" role="alert">
          <span>{summaryError}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={loadSummary}>
            <i className="bi bi-arrow-clockwise me-1" aria-hidden="true" />
            Retry
          </button>
        </div>
      )}

      {!summaryError && (
        <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-3 mb-4">
          {summaryCards.map((card) => (
            <div className="col" key={card.label}>
              <SummaryCard {...card} value={isLoadingSummary ? '…' : card.value} />
            </div>
          ))}
        </div>
      )}

      <PatientSummaryTable
        patients={recentPatients}
        isLoading={isLoadingPatients}
        error={patientsError}
        onRetry={loadRecentPatients}
      />
    </PageContainer>
  );
}

export default DashboardPage;
