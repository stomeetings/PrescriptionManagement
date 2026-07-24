import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer.jsx';
import PatientProfileCard from '../../components/patientManagement/PatientProfileCard.jsx';
import PatientInformationSection from '../../components/patientManagement/PatientInformationSection.jsx';
import PatientMedicationTab from '../../components/patientManagement/PatientMedicationTab.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import { activatePatient, deactivatePatient, getPatientById } from '../../api/patientsApi.js';
import { parseApiError } from '../../api/parseApiError.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useNotification } from '../../components/notifications/NotificationContext.jsx';
import { ROLES } from '../../auth/roles.js';

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : '—';
}

// Whole-years-old calculation - matches PatientTable's identical helper (kept as its
// own copy here rather than a shared util, consistent with this project's preference
// for explicit repetition over premature shared abstractions).
function calculateAge(dateOfBirth) {
  if (!dateOfBirth) {
    return null;
  }

  const birthDate = new Date(dateOfBirth);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

  if (!hasHadBirthdayThisYear) {
    age -= 1;
  }

  return age;
}

function describeLoadError(error) {
  const status = error?.response?.status;

  if (status === 404) {
    return { heading: 'Patient Not Found', message: 'This patient could not be found. It may have been removed.' };
  }

  if (status === 401) {
    return { heading: 'Session Expired', message: 'Your session has expired. Please log in again.' };
  }

  if (status === 403) {
    return { heading: 'Access Denied', message: 'You do not have permission to view this patient.' };
  }

  const { generalMessage } = parseApiError(error);
  return { heading: 'Something Went Wrong', message: generalMessage || 'Unable to load this patient.' };
}

function PatientDetailsPage() {
  const { patientId } = useParams();
  const location = useLocation();
  const { hasRole } = useAuth();
  const { showSuccess, showError, showWarning } = useNotification();

  const [patient, setPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [confirmAction, setConfirmAction] = useState(null); // 'activate' | 'deactivate' | null
  const [isActionProcessing, setIsActionProcessing] = useState(false);

  // First tab mechanism in this codebase (no nav-tabs/Tab/tab-pane precedent existed
  // anywhere before this) - plain local state driving hand-wired Bootstrap nav-tabs
  // markup, not React Router nested routes (this page is a single flat
  // /patients/:patientId route with no child routes) and not bootstrap.bundle.js's JS
  // tab component (this project shows Bootstrap visuals only via plain React state,
  // matching ConfirmDialog's established precedent). Seeded from router location state
  // so AddPatientMedicationPage's Cancel/Save can land back on the Medications tab
  // specifically (navigate(..., { state: { initialTab: 'medications' } })) instead of
  // always resetting to Overview.
  const [activeTab, setActiveTab] = useState(location.state?.initialTab || 'overview');

  const canEdit = hasRole(ROLES.SYSTEM_ADMINISTRATOR, ROLES.DOCTOR, ROLES.RECEPTIONIST);
  const canActivateDeactivate = hasRole(ROLES.SYSTEM_ADMINISTRATOR);

  const loadPatient = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getPatientById(patientId);
      setPatient(result);
    } catch (fetchError) {
      setError(describeLoadError(fetchError));
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadPatient();
  }, [loadPatient]);

  async function handleConfirmAction() {
    if (!confirmAction || !patient) {
      return;
    }

    setIsActionProcessing(true);

    try {
      if (confirmAction === 'activate') {
        await activatePatient(patient.patientId);
        showSuccess(`${patient.firstName} ${patient.lastName} was activated.`);
      } else {
        await deactivatePatient(patient.patientId);
        showSuccess(`${patient.firstName} ${patient.lastName} was deactivated.`);
      }

      setConfirmAction(null);
      await loadPatient();
    } catch (actionError) {
      const { generalMessage } = parseApiError(actionError);
      const message = generalMessage || 'Unable to complete this action. Please try again.';

      // A 409 on Deactivate is a business-rule block (e.g. a future Prescription module
      // reporting active prescriptions), not an unexpected failure - shown as a warning,
      // not an error. No such check exists in the backend yet, but this path is ready
      // for when one does. Matches PatientListPage's identical handling.
      if (confirmAction === 'deactivate' && actionError?.response?.status === 409) {
        showWarning(message);
      } else {
        showError(message);
      }

      setConfirmAction(null);
    } finally {
      setIsActionProcessing(false);
    }
  }

  return (
    <PageContainer title="Patient Details">
      <div className="mb-3">
        <Link to="/patients" className="btn btn-outline-secondary btn-sm">
          <i className="bi bi-arrow-left me-1" aria-hidden="true" />
          Back to Patient List
        </Link>
      </div>

      {isLoading && (
        <div className="row g-3 placeholder-glow">
          <div className="col-12 col-md-4">
            <div className="card border-0 shadow-sm rounded-3">
              <div className="card-body text-center py-4">
                <span
                  className="placeholder rounded-circle d-block mx-auto mb-3"
                  style={{ width: 80, height: 80 }}
                />
                <span className="placeholder col-6 d-block mx-auto mb-2" />
                <span className="placeholder col-4 d-block mx-auto" />
              </div>
            </div>
          </div>
          <div className="col-12 col-md-8">
            <div className="card border-0 shadow-sm rounded-3">
              <div className="card-body">
                <span className="placeholder col-3 d-block mb-3" />
                <span className="placeholder col-8 d-block mb-2" />
                <span className="placeholder col-6 d-block" />
              </div>
            </div>
          </div>
        </div>
      )}

      {!isLoading && error && (
        <div className="card border-0 shadow-sm rounded-3">
          <div className="card-body text-center py-5">
            <i className="bi bi-exclamation-triangle display-4 text-danger" aria-hidden="true" />
            <h2 className="h5 mt-3">{error.heading}</h2>
            <p className="text-muted">{error.message}</p>
            <div className="d-flex justify-content-center gap-2">
              <button type="button" className="btn btn-outline-secondary" onClick={loadPatient}>
                <i className="bi bi-arrow-clockwise me-1" aria-hidden="true" />
                Retry
              </button>
              <Link to="/patients" className="btn btn-primary">
                Back to Patient List
              </Link>
            </div>
          </div>
        </div>
      )}

      {!isLoading && !error && patient && (
        <>
          <ul className="nav nav-tabs mb-3" role="tablist">
            <li className="nav-item" role="presentation">
              <button
                type="button"
                className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
                role="tab"
                id="patient-overview-tab"
                aria-selected={activeTab === 'overview'}
                aria-controls="patient-overview-panel"
              >
                Overview
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                type="button"
                className={`nav-link ${activeTab === 'medications' ? 'active' : ''}`}
                onClick={() => setActiveTab('medications')}
                role="tab"
                id="patient-medications-tab"
                aria-selected={activeTab === 'medications'}
                aria-controls="patient-medications-panel"
              >
                Patient Medications
              </button>
            </li>
          </ul>

          {activeTab === 'medications' && (
            <div id="patient-medications-panel" role="tabpanel" aria-labelledby="patient-medications-tab">
              <PatientMedicationTab patientId={patient.patientId} />
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="row g-3" id="patient-overview-panel" role="tabpanel" aria-labelledby="patient-overview-tab">
              <div className="col-12 col-md-4">
                <PatientProfileCard patient={patient} />

                <div className="d-flex flex-column gap-2 mt-3">
                  {canEdit && (
                    <Link to={`/patients/${patient.patientId}/edit`} className="btn btn-primary">
                      <i className="bi bi-pencil me-1" aria-hidden="true" />
                      Edit Patient
                    </Link>
                  )}

                  {canActivateDeactivate &&
                    (patient.isActive ? (
                      <button
                        type="button"
                        className="btn btn-outline-warning"
                        onClick={() => setConfirmAction('deactivate')}
                      >
                        <i className="bi bi-person-dash me-1" aria-hidden="true" />
                        Deactivate
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-outline-success"
                        onClick={() => setConfirmAction('activate')}
                      >
                        <i className="bi bi-person-check me-1" aria-hidden="true" />
                        Activate
                      </button>
                    ))}
                </div>
              </div>

              <div className="col-12 col-md-8 d-flex flex-column gap-3">
                <PatientInformationSection
                  title="Patient Information"
                  items={[
                    { label: 'Patient Number', value: patient.patientNumber },
                    { label: 'Full Name', value: `${patient.firstName} ${patient.lastName}` },
                    { label: 'Preferred Name', value: patient.preferredName },
                    { label: 'Date of Birth', value: formatDate(patient.dateOfBirth) },
                    { label: 'Age', value: calculateAge(patient.dateOfBirth) },
                    { label: 'Gender', value: patient.gender?.displayText },
                    { label: 'Status', value: patient.isActive ? 'Active' : 'Inactive' },
                  ]}
                />

                <PatientInformationSection
                  title="Contact Information"
                  items={[
                    { label: 'Mobile Number', value: patient.mobileNumber },
                    { label: 'Email', value: patient.email },
                    { label: 'Address Line 1', value: patient.addressLine1 },
                    { label: 'Address Line 2', value: patient.addressLine2 },
                    { label: 'City', value: patient.city },
                    { label: 'State / Region', value: patient.region },
                    { label: 'Postal Code', value: patient.postalCode },
                    { label: 'Country', value: patient.country },
                  ]}
                />

                <PatientInformationSection
                  title="Healthcare Information"
                  items={[
                    { label: 'NHI Number', value: patient.nhiNumber },
                    { label: 'NZMC Number', value: patient.nzmcNumber },
                  ]}
                />

                <PatientInformationSection title="Notes" items={[{ label: 'Notes', value: patient.notes }]} />

                <PatientInformationSection
                  title="Audit Information"
                  items={[
                    { label: 'Created By', value: patient.createdBy },
                    { label: 'Created Date', value: formatDateTime(patient.createdDate) },
                    { label: 'Updated By', value: patient.updatedBy },
                    { label: 'Updated Date', value: formatDateTime(patient.updatedDate) },
                  ]}
                />
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        show={Boolean(confirmAction)}
        title={confirmAction === 'activate' ? 'Activate Patient' : 'Deactivate Patient'}
        message={
          <>
            <p className="mb-2">
              <strong>{patient?.patientNumber}</strong> — {patient?.firstName} {patient?.lastName}
            </p>
            <p className="mb-0">
              {confirmAction === 'activate'
                ? 'Are you sure you want to activate this patient?'
                : 'Are you sure you want to deactivate this patient?'}
            </p>
            {confirmAction === 'deactivate' && (
              <div className="alert alert-warning d-flex align-items-center gap-2 mt-3 mb-0 py-2 px-3 small" role="alert">
                <i className="bi bi-exclamation-triangle" aria-hidden="true" />
                Inactive patients cannot receive new prescriptions.
              </div>
            )}
          </>
        }
        confirmLabel="Confirm"
        confirmVariant={confirmAction === 'activate' ? 'success' : 'warning'}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
        isProcessing={isActionProcessing}
      />
    </PageContainer>
  );
}

export default PatientDetailsPage;
