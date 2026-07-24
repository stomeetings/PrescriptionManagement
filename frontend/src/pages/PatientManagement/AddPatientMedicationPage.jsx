import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer.jsx';
import PatientMedicationForm from '../../components/patientManagement/PatientMedicationForm.jsx';
import { getPatientById } from '../../api/patientsApi.js';
import { createPatientMedication } from '../../api/patientMedicationApi.js';
import { parseApiError } from '../../api/parseApiError.js';
import { useNotification } from '../../components/notifications/NotificationContext.jsx';

function AddPatientMedicationPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  const [patient, setPatient] = useState(null);
  const [isLoadingPatient, setIsLoadingPatient] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  const loadPatient = useCallback(async () => {
    setIsLoadingPatient(true);
    setLoadError('');

    try {
      const result = await getPatientById(patientId);
      setPatient(result);
    } catch (fetchError) {
      const { generalMessage } = parseApiError(fetchError);
      setLoadError(generalMessage || 'Unable to load this patient.');
    } finally {
      setIsLoadingPatient(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadPatient();
  }, [loadPatient]);

  // Browser-level protection only (tab close/refresh) - matches CreatePatientPage/
  // EditUserPage's identical pattern; in-app navigation is only guarded by the Cancel
  // button's own confirm() below.
  useEffect(() => {
    function handleBeforeUnload(event) {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  function goToMedicationsList() {
    navigate(`/patients/${patientId}`, { state: { initialTab: 'medications' } });
  }

  // Returns true/false rather than throwing - PatientMedicationForm awaits this to
  // decide whether to reset itself (Save & Add Another) or leave the current values on
  // screen (a failed save should never silently wipe out what the clinician typed).
  async function handleSubmit(formValues, selectedMedicine, intent) {
    setIsSubmitting(true);
    setFieldErrors({});

    try {
      await createPatientMedication({
        patientId: Number(patientId),
        medicineId: selectedMedicine.medicineId,
        dose: Number(formValues.dose),
        doseUnitCode: formValues.doseUnitCode,
        frequencyCode: formValues.frequencyCode,
        duration: Number(formValues.duration),
        durationUnitCode: formValues.durationUnitCode,
        quantity: Number(formValues.quantity),
        instructions: formValues.instructions,
        prn: formValues.prn,
        startDate: formValues.startDate,
        endDate: formValues.endDate || null,
        clinicalNotes: formValues.clinicalNotes || null,
        prescribedByUserAccountId: null,
      });

      setIsDirty(false);

      if (intent === 'saveAndAddAnother') {
        showSuccess(`${selectedMedicine.medicineName} was added. Ready to add another medication.`);
      } else {
        showSuccess(`${selectedMedicine.medicineName} was added to this patient's medication list.`);
        goToMedicationsList();
      }

      return true;
    } catch (submitError) {
      const { generalMessage, fieldErrors: apiFieldErrors } = parseApiError(submitError);

      showError(generalMessage || 'Unable to add this medication. Please try again.');
      setFieldErrors(apiFieldErrors);

      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancel() {
    if (isDirty && !window.confirm('You have unsaved changes. Leave without saving?')) {
      return;
    }
    goToMedicationsList();
  }

  return (
    <PageContainer title="Add Patient Medication">
      <div className="mb-3">
        <Link to={`/patients/${patientId}`} className="btn btn-outline-secondary btn-sm">
          <i className="bi bi-arrow-left me-1" aria-hidden="true" />
          Back to Patient Details
        </Link>
      </div>

      {isLoadingPatient && (
        <div className="card border-0 shadow-sm rounded-3 placeholder-glow">
          <div className="card-body">
            <span className="placeholder col-4 d-block mb-2" />
            <span className="placeholder col-6 d-block" />
          </div>
        </div>
      )}

      {!isLoadingPatient && loadError && (
        <div className="card border-0 shadow-sm rounded-3">
          <div className="card-body text-center py-5">
            <i className="bi bi-exclamation-triangle display-4 text-danger" aria-hidden="true" />
            <p className="text-muted mt-3">{loadError}</p>
            <button type="button" className="btn btn-outline-secondary" onClick={loadPatient}>
              <i className="bi bi-arrow-clockwise me-1" aria-hidden="true" />
              Retry
            </button>
          </div>
        </div>
      )}

      {!isLoadingPatient && !loadError && patient && (
        <div className="card border-0 shadow-sm rounded-3">
          <div className="card-body">
            <p className="text-muted mb-4">
              Adding a medication for <strong>{patient.patientNumber}</strong> — {patient.firstName} {patient.lastName}
            </p>

            <PatientMedicationForm
              mode="create"
              initialValues={{}}
              selectedMedicine={null}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={isSubmitting}
              fieldErrors={fieldErrors}
              onDirtyChange={setIsDirty}
            />
          </div>
        </div>
      )}
    </PageContainer>
  );
}

export default AddPatientMedicationPage;
