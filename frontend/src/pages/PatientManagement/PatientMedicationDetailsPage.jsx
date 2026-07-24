import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer.jsx';
import PatientMedicationInformationSection from '../../components/patientManagement/PatientMedicationInformationSection.jsx';
import PatientMedicationStopDialog from '../../components/patientManagement/PatientMedicationStopDialog.jsx';
import PatientMedicationResumeDialog from '../../components/patientManagement/PatientMedicationResumeDialog.jsx';
import PatientMedicationPrescriptionHistory from '../../components/prescriptionManagement/PatientMedicationPrescriptionHistory.jsx';
import {
  getPatientMedicationById,
  stopPatientMedication,
  resumePatientMedication,
  getPatientMedicationPrescriptionHistory,
} from '../../api/patientMedicationApi.js';
import { getPatientById } from '../../api/patientsApi.js';
import { getMedicineById } from '../../api/medicinesApi.js';
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

function describeLoadError(error) {
  const status = error?.response?.status;

  if (status === 404) {
    return { heading: 'Patient Medication Not Found', message: 'This patient medication could not be found. It may have been removed.' };
  }

  if (status === 401) {
    return { heading: 'Session Expired', message: 'Your session has expired. Please log in again.' };
  }

  if (status === 403) {
    return { heading: 'Access Denied', message: 'You do not have permission to view this patient medication.' };
  }

  const { generalMessage } = parseApiError(error);
  return { heading: 'Something Went Wrong', message: generalMessage || 'Unable to load this patient medication.' };
}

function PatientMedicationDetailsPage() {
  const { patientId, patientMedicationId } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { showSuccess, showError, showWarning } = useNotification();

  const [patientMedication, setPatientMedication] = useState(null);
  const [patientDetails, setPatientDetails] = useState(null);
  const [medicineDetails, setMedicineDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showStopDialog, setShowStopDialog] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [stopError, setStopError] = useState('');

  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [resumeError, setResumeError] = useState('');

  // Patient Medication and Prescription Synchronization: loaded independently of the
  // main patientMedication fetch above (its own endpoint, its own loading/error state) -
  // a slower or failing Prescription History call must not block the rest of this page.
  const [prescriptionHistory, setPrescriptionHistory] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState('');

  const canManage = hasRole(ROLES.SYSTEM_ADMINISTRATOR, ROLES.DOCTOR);

  const loadPrescriptionHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    setHistoryError('');

    try {
      const result = await getPatientMedicationPrescriptionHistory(patientMedicationId);
      setPrescriptionHistory(result);
    } catch (historyFetchError) {
      const { generalMessage } = parseApiError(historyFetchError);
      setHistoryError(generalMessage || 'Unable to load prescription history. Please try again.');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [patientMedicationId]);

  useEffect(() => {
    loadPrescriptionHistory();
  }, [loadPrescriptionHistory]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const detail = await getPatientMedicationById(patientMedicationId);
      setPatientMedication(detail);

      // PatientMedicationDetailResponse doesn't carry the patient's DateOfBirth/Gender/
      // NHINumber, or the medicine's BrandName/Manufacturer (api-spec.md section 6 never
      // asked for them here) - all five are required by this page, so they're backfilled
      // with two extra calls to the already-existing GET /api/patients/{id} and
      // GET /api/medicines/{id} rather than changing the backend contract for a
      // frontend-only step. Matches EditPatientMedicationPage's identical reasoning.
      const [patientResult, medicineResult] = await Promise.all([
        getPatientById(detail.patientId),
        getMedicineById(detail.medicineId),
      ]);

      setPatientDetails(patientResult);
      setMedicineDetails(medicineResult);
    } catch (fetchError) {
      setError(describeLoadError(fetchError));
    } finally {
      setIsLoading(false);
    }
  }, [patientMedicationId]);

  useEffect(() => {
    load();
  }, [load]);

  function goToMedicationsList() {
    navigate(`/patients/${patientId}`, { state: { initialTab: 'medications' } });
  }

  // Generate Prescription logic is explicitly out of scope for this step - this is a
  // stub so the button is wired to something rather than being a dead click, matching
  // PatientMedicationToolbar's identical handleGeneratePrescription stub from Step 11.
  function handleNotImplemented(actionLabel) {
    showWarning(`${actionLabel} will be available in a future release.`);
  }

  function handleStopRequest() {
    setStopError('');
    setShowStopDialog(true);
  }

  async function handleConfirmStop() {
    setIsStopping(true);
    setStopError('');

    try {
      await stopPatientMedication(patientMedicationId);

      setShowStopDialog(false);
      showSuccess(`${patientMedication.medicineName} was stopped.`);

      // Refresh Patient Medication Details in place - the status/isCurrent flags this
      // page derives from patientMedication update automatically (isActive/isStopped
      // below), which also flips Edit off and Resume on without any extra state.
      await load();
    } catch (stopErrorResponse) {
      const { generalMessage } = parseApiError(stopErrorResponse);
      const message = generalMessage || 'Unable to stop this medication. Please try again.';

      setStopError(message);
      showError(message);
    } finally {
      setIsStopping(false);
    }
  }

  function handleResumeRequest() {
    setResumeError('');
    setShowResumeDialog(true);
  }

  async function handleConfirmResume(formValues) {
    setIsResuming(true);
    setResumeError('');

    try {
      const newPatientMedication = await resumePatientMedication(patientMedicationId, {
        startDate: formValues.resumeDate,
        dose: Number(formValues.dose),
        doseUnitCode: formValues.doseUnitCode,
        frequencyCode: formValues.frequencyCode,
        duration: Number(formValues.duration),
        durationUnitCode: formValues.durationUnitCode,
        quantity: Number(formValues.quantity),
        instructions: formValues.instructions,
        prn: formValues.prn,
        clinicalNotes: formValues.clinicalNotes || null,
      });

      setShowResumeDialog(false);
      showSuccess(`${patientMedication.medicineName} was resumed as a new active medication.`);

      // The current URL's patientMedicationId now refers to the source record, which
      // stays permanently Stopped - navigate to the newly-created record's own Details
      // page instead of re-loading this now-historical one in place.
      navigate(`/patients/${patientId}/medications/${newPatientMedication.patientMedicationId}`);
    } catch (resumeErrorResponse) {
      const { generalMessage } = parseApiError(resumeErrorResponse);
      const message = generalMessage || 'Unable to resume this medication. Please try again.';

      setResumeError(message);
      showError(message);
    } finally {
      setIsResuming(false);
    }
  }

  const isActive = patientMedication?.status?.code === 'ACTIVE';
  const isStopped = patientMedication?.status?.code === 'STOPPED';

  return (
    <PageContainer title="Patient Medication Details">
      <div className="mb-3">
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={goToMedicationsList}>
          <i className="bi bi-arrow-left me-1" aria-hidden="true" />
          Back to Patient Medications
        </button>
      </div>

      {isLoading && (
        <div className="row g-3 placeholder-glow">
          <div className="col-12 col-md-4">
            <div className="card border-0 shadow-sm rounded-3">
              <div className="card-body text-center py-4">
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
              <button type="button" className="btn btn-outline-secondary" onClick={load}>
                <i className="bi bi-arrow-clockwise me-1" aria-hidden="true" />
                Retry
              </button>
              <button type="button" className="btn btn-primary" onClick={goToMedicationsList}>
                Back to Patient Medications
              </button>
            </div>
          </div>
        </div>
      )}

      {!isLoading && !error && patientMedication && (
        <div className="row g-3">
          <div className="col-12 col-md-4">
            <div className="card border-0 shadow-sm rounded-3">
              <div className="card-body text-center">
                <h2 className="h5 mb-1">{patientMedication.medicineName}</h2>
                <p className="text-muted mb-3">{patientMedication.strength}</p>

                <div className="d-flex justify-content-center gap-2 mb-2">
                  <span className={`badge rounded-pill text-bg-${isActive ? 'success' : 'secondary'}`}>
                    {patientMedication.status?.displayText}
                  </span>
                  {patientMedication.prn && <span className="badge rounded-pill text-bg-info">PRN</span>}
                </div>
              </div>
            </div>

            <div className="d-flex flex-column gap-2 mt-3">
              {canManage && isActive && (
                <Link
                  to={`/patients/${patientId}/medications/${patientMedicationId}/edit`}
                  className="btn btn-primary"
                >
                  <i className="bi bi-pencil me-1" aria-hidden="true" />
                  Edit Medication
                </Link>
              )}

              {canManage && isActive && (
                <button type="button" className="btn btn-outline-warning" onClick={handleStopRequest}>
                  <i className="bi bi-stop-circle me-1" aria-hidden="true" />
                  Stop Medication
                </button>
              )}

              {canManage && isStopped && (
                <button type="button" className="btn btn-outline-success" onClick={handleResumeRequest}>
                  <i className="bi bi-play-circle me-1" aria-hidden="true" />
                  Resume Medication
                </button>
              )}

              {canManage && (
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={() => handleNotImplemented('Generate Prescription')}
                >
                  <i className="bi bi-file-earmark-medical me-1" aria-hidden="true" />
                  Generate Prescription
                </button>
              )}

              <button type="button" className="btn btn-link" onClick={goToMedicationsList}>
                Back to Patient Medications
              </button>
            </div>
          </div>

          <div className="col-12 col-md-8 d-flex flex-column gap-3">
            <PatientMedicationInformationSection
              title="Patient Information"
              items={[
                { label: 'Patient Name', value: patientMedication.patientFullName },
                { label: 'MRN / NHI', value: patientDetails?.nhiNumber },
                { label: 'Date of Birth', value: formatDate(patientDetails?.dateOfBirth) },
                { label: 'Gender', value: patientDetails?.gender?.displayText },
              ]}
            />

            <PatientMedicationInformationSection
              title="Medicine Information"
              items={[
                { label: 'Medicine Code', value: patientMedication.medicineCode },
                { label: 'Medicine Name', value: patientMedication.medicineName },
                { label: 'Generic Name', value: patientMedication.genericName },
                { label: 'Brand Name', value: medicineDetails?.brandName },
                { label: 'Strength', value: patientMedication.strength },
                { label: 'Dosage Form', value: patientMedication.dosageForm?.displayText },
                { label: 'Route', value: patientMedication.route?.displayText },
                { label: 'Manufacturer', value: medicineDetails?.manufacturer },
              ]}
            />

            <PatientMedicationInformationSection
              title="Medication Details"
              items={[
                { label: 'Dose', value: patientMedication.dose },
                { label: 'Dose Unit', value: patientMedication.doseUnit?.displayText },
                { label: 'Frequency', value: patientMedication.frequency?.displayText },
                { label: 'Duration', value: patientMedication.duration },
                { label: 'Duration Unit', value: patientMedication.durationUnit?.displayText },
                { label: 'Quantity', value: patientMedication.quantity },
                { label: 'PRN', value: patientMedication.prn ? 'Yes' : 'No' },
                { label: 'Start Date', value: formatDate(patientMedication.startDate) },
                { label: 'End Date', value: formatDate(patientMedication.endDate) },
                { label: 'Status', value: patientMedication.status?.displayText },
                { label: 'Source', value: patientMedication.source?.displayText },
                { label: 'Prescribed By', value: patientMedication.prescribedBy?.fullName },
                // Patient Medication and Prescription Synchronization's own "Medication
                // Details" fields - derived from the same Prescription History call
                // that backs the section below, not a separate request.
                { label: 'Current Active Prescription', value: prescriptionHistory?.currentActivePrescriptionNumber || 'None' },
                { label: 'Last Prescription', value: prescriptionHistory?.lastPrescriptionNumber || 'None' },
                { label: 'Replacement Count', value: prescriptionHistory?.replacementCount ?? 0 },
                { label: 'Print Count', value: prescriptionHistory?.printCount ?? 0 },
              ]}
            />

            <PatientMedicationInformationSection
              title="Clinical Information"
              items={[
                { label: 'Instructions', value: patientMedication.instructions },
                { label: 'Clinical Notes', value: patientMedication.clinicalNotes },
              ]}
            />

            <PatientMedicationInformationSection
              title="Audit Information"
              items={[
                { label: 'Created By', value: patientMedication.createdBy },
                { label: 'Created Date', value: formatDateTime(patientMedication.createdDate) },
                { label: 'Updated By', value: patientMedication.updatedBy },
                { label: 'Updated Date', value: formatDateTime(patientMedication.updatedDate) },
              ]}
            />

            <PatientMedicationPrescriptionHistory
              history={prescriptionHistory}
              isLoading={isLoadingHistory}
              error={historyError}
              onRetry={loadPrescriptionHistory}
            />
          </div>
        </div>
      )}

      <PatientMedicationStopDialog
        show={showStopDialog}
        medication={patientMedication}
        onConfirm={handleConfirmStop}
        onCancel={() => setShowStopDialog(false)}
        isProcessing={isStopping}
        error={stopError}
      />

      <PatientMedicationResumeDialog
        show={showResumeDialog}
        medication={patientMedication}
        onConfirm={handleConfirmResume}
        onCancel={() => setShowResumeDialog(false)}
        isProcessing={isResuming}
        error={resumeError}
      />
    </PageContainer>
  );
}

export default PatientMedicationDetailsPage;
