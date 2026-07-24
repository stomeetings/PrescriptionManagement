import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer.jsx';
import PatientMedicationForm from '../../components/patientManagement/PatientMedicationForm.jsx';
import PrescriptionItemAmendmentDialog from '../../components/prescriptionManagement/PrescriptionItemAmendmentDialog.jsx';
import ReplacementPrescriptionSummary from '../../components/prescriptionManagement/ReplacementPrescriptionSummary.jsx';
import { getPatientMedicationById, updatePatientMedication } from '../../api/patientMedicationApi.js';
import { getMedicineById } from '../../api/medicinesApi.js';
import { getActivePrescriptionItemForMedication, amendPrescriptionItem } from '../../api/prescriptionApi.js';
import { parseApiError } from '../../api/parseApiError.js';
import { useNotification } from '../../components/notifications/NotificationContext.jsx';

// The Reason POST /api/prescriptions/items/amend requires - fixed and honest, not typed
// by the user: neither this feature's warning dialog nor its "After Success" mockup asks
// for free-text input, and the real clinical reasoning is already captured as a
// structured before/after diff in PrescriptionItemAmendment (Dose/Frequency/Quantity/
// etc.), not duplicated here as prose.
const AMENDMENT_REASON = 'Patient medication updated via Edit Patient Medication';

function describeLoadError(error) {
  const status = error?.response?.status;

  if (status === 404) {
    return 'This patient medication could not be found. It may have been removed.';
  }

  if (status === 401) {
    return 'Your session has expired. Please log in again.';
  }

  if (status === 403) {
    return 'You do not have permission to edit this patient medication.';
  }

  const { generalMessage } = parseApiError(error);
  return generalMessage || 'Unable to load this patient medication.';
}

function EditPatientMedicationPage() {
  const { patientId, patientMedicationId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  const [patientMedication, setPatientMedication] = useState(null);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  // Prescription Item Amendment & Replacement: whether this medication belongs to an
  // active, finalized prescription - checked once on load, alongside the medication
  // itself, so Save already knows without an extra round trip at submit time.
  const [hasActivePrescriptionItem, setHasActivePrescriptionItem] = useState(false);
  const [pendingFormValues, setPendingFormValues] = useState(null);
  const [showAmendmentDialog, setShowAmendmentDialog] = useState(false);
  const [isAmending, setIsAmending] = useState(false);
  const [amendmentResult, setAmendmentResult] = useState(null);

  const loadPatientMedication = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const detail = await getPatientMedicationById(patientMedicationId);
      setPatientMedication(detail);

      getActivePrescriptionItemForMedication(patientMedicationId)
        .then((result) => setHasActivePrescriptionItem(result.hasActivePrescriptionItem))
        .catch(() => {
          // Non-fatal: worst case, Save proceeds as a plain PatientMedication update and
          // the backend's own POST .../amend validation (never called in that path) is
          // simply skipped - it must not block loading the edit form itself.
          setHasActivePrescriptionItem(false);
        });

      // PatientMedicationDetailResponse doesn't carry BrandName/Manufacturer (api-spec.md
      // section 6 never asked for them here) - both are needed for this page's read-only
      // Medicine display, so they're backfilled with one extra call to the existing,
      // already-approved GET /api/medicines/{id} rather than changing the backend
      // contract for a frontend-only step.
      const medicine = await getMedicineById(detail.medicineId);
      setSelectedMedicine({
        medicineId: detail.medicineId,
        medicineCode: detail.medicineCode,
        medicineName: detail.medicineName,
        genericName: detail.genericName,
        brandName: medicine.brandName,
        strength: detail.strength,
        medicineForm: detail.dosageForm,
        medicineRoute: detail.route,
        manufacturer: medicine.manufacturer,
      });
    } catch (error) {
      setLoadError(describeLoadError(error));
    } finally {
      setIsLoading(false);
    }
  }, [patientMedicationId]);

  useEffect(() => {
    loadPatientMedication();
  }, [loadPatientMedication]);

  // Browser-level protection only (tab close/refresh) - matches EditPatientPage's
  // identical pattern.
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

  function buildUpdatePayload(formValues) {
    return {
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
      prescribedByUserAccountId: patientMedication.prescribedBy?.userAccountId ?? null,
      rowVersion: patientMedication.rowVersion,
    };
  }

  async function handleSubmit(formValues) {
    // Prescription Item Amendment & Replacement: "When editing a Patient Medication
    // that belongs to an ACTIVE finalized prescription, Display warning... Continue?"
    // - Save pauses here instead of calling the API directly; handleConfirmAmendment
    // does both calls once the user confirms.
    if (hasActivePrescriptionItem) {
      setPendingFormValues(formValues);
      setShowAmendmentDialog(true);
      return false;
    }

    setIsSubmitting(true);
    setFieldErrors({});

    try {
      await updatePatientMedication(patientMedicationId, buildUpdatePayload(formValues));

      setIsDirty(false);
      showSuccess(`${selectedMedicine.medicineName} was updated successfully.`);
      goToMedicationsList();
      return true;
    } catch (error) {
      const { generalMessage, fieldErrors: apiFieldErrors } = parseApiError(error);

      // A 409 here means either a stale RowVersion (someone else edited this record
      // first) or the medication having been stopped since the page was loaded (Update
      // rejects stopped/non-current records - api-spec.md section 4.7) - both are
      // business-rule conflicts, not unexpected failures, so shown the same as any other
      // server validation message rather than a generic error.
      showError(generalMessage || 'Unable to update this patient medication. Please try again.');
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

  // Workflow: "Patient Medication Updated -> Find ACTIVE finalized Prescription Item ->
  // ... Yes -> Create Amendment -> Mark old Prescription Item Superseded -> Generate NEW
  // SCID -> Create NEW Prescription -> Link old item to new item." The first call
  // persists the new medication values (same PUT this page always used); the second
  // (POST .../amend) re-reads those just-saved values server-side and performs the
  // whole supersede+replace workflow atomically. If the first call succeeds but the
  // second fails, the medication is still correctly saved - the user sees the amend
  // error and can retry Save, which will find the same active item still ACTIVE (no
  // silent double-supersede risk, since usp_PrescriptionItem_Amend's own status-guarded
  // UPDATE would reject a genuine race, not a retry of the same amend after a first
  // attempt failed before writing anything).
  async function handleConfirmAmendment() {
    if (isAmending || !pendingFormValues) {
      return;
    }

    setIsAmending(true);

    try {
      await updatePatientMedication(patientMedicationId, buildUpdatePayload(pendingFormValues));
      const result = await amendPrescriptionItem({ patientMedicationId, reason: AMENDMENT_REASON });

      setIsDirty(false);
      setShowAmendmentDialog(false);
      setPendingFormValues(null);
      setAmendmentResult(result);
    } catch (error) {
      const { generalMessage, fieldErrors: apiFieldErrors } = parseApiError(error);
      showError(generalMessage || 'Unable to update this patient medication. Please try again.');
      setFieldErrors(apiFieldErrors);
      setShowAmendmentDialog(false);
      setPendingFormValues(null);
    } finally {
      setIsAmending(false);
    }
  }

  function handleCancelAmendment() {
    setShowAmendmentDialog(false);
    setPendingFormValues(null);
  }

  function handleAmendmentDone() {
    setAmendmentResult(null);
    goToMedicationsList();
  }

  return (
    <PageContainer title="Edit Patient Medication">
      <div className="mb-3">
        <Link to={`/patients/${patientId}`} className="btn btn-outline-secondary btn-sm">
          <i className="bi bi-arrow-left me-1" aria-hidden="true" />
          Back to Patient Details
        </Link>
      </div>

      <div className="card border-0 shadow-sm rounded-3">
        <div className="card-body">
          {isLoading && (
            <div className="text-center py-5">
              <span className="spinner-border me-2" aria-hidden="true" />
              Loading patient medication...
            </div>
          )}

          {!isLoading && loadError && (
            <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
              <span>{loadError}</span>
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={loadPatientMedication}>
                <i className="bi bi-arrow-clockwise me-1" aria-hidden="true" />
                Retry
              </button>
            </div>
          )}

          {!isLoading && !loadError && patientMedication && selectedMedicine && (
            <PatientMedicationForm
              mode="edit"
              initialValues={{
                doseUnitCode: patientMedication.doseUnit?.code || '',
                frequencyCode: patientMedication.frequency?.code || '',
                durationUnitCode: patientMedication.durationUnit?.code || '',
                dose: patientMedication.dose,
                duration: patientMedication.duration,
                quantity: patientMedication.quantity,
                instructions: patientMedication.instructions || '',
                prn: patientMedication.prn,
                // The date inputs need plain YYYY-MM-DD values; the API returns a full
                // ISO date-time string (DATE in SQL Server, still serialized with a time
                // component) - matches EditPatientPage's identical DateOfBirth handling.
                startDate: patientMedication.startDate ? patientMedication.startDate.slice(0, 10) : '',
                endDate: patientMedication.endDate ? patientMedication.endDate.slice(0, 10) : '',
                clinicalNotes: patientMedication.clinicalNotes || '',
                patientNumber: patientMedication.patientNumber,
                patientFullName: patientMedication.patientFullName,
                createdBy: patientMedication.createdBy,
                createdDate: patientMedication.createdDate,
              }}
              selectedMedicine={selectedMedicine}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={isSubmitting || isAmending || showAmendmentDialog}
              fieldErrors={fieldErrors}
              onDirtyChange={setIsDirty}
            />
          )}
        </div>
      </div>

      <PrescriptionItemAmendmentDialog
        show={showAmendmentDialog}
        isProcessing={isAmending}
        onContinue={handleConfirmAmendment}
        onCancel={handleCancelAmendment}
      />

      {amendmentResult && <ReplacementPrescriptionSummary result={amendmentResult} onDone={handleAmendmentDone} />}
    </PageContainer>
  );
}

export default EditPatientMedicationPage;
