import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer.jsx';
import MedicineForm from '../../components/medicineManagement/MedicineForm.jsx';
import { getMedicineById, updateMedicine } from '../../api/medicinesApi.js';
import { parseApiError } from '../../api/parseApiError.js';
import { useNotification } from '../../components/notifications/NotificationContext.jsx';

function describeLoadError(error) {
  const status = error?.response?.status;

  if (status === 404) {
    return 'This medicine could not be found. It may have been removed.';
  }

  if (status === 401) {
    return 'Your session has expired. Please log in again.';
  }

  if (status === 403) {
    return 'You do not have permission to view this medicine.';
  }

  const { generalMessage } = parseApiError(error);
  return generalMessage || 'Unable to load this medicine.';
}

function EditMedicinePage() {
  const { medicineId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  const [medicine, setMedicine] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  const loadMedicine = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const result = await getMedicineById(medicineId);
      setMedicine(result);
    } catch (error) {
      setLoadError(describeLoadError(error));
    } finally {
      setIsLoading(false);
    }
  }, [medicineId]);

  useEffect(() => {
    loadMedicine();
  }, [loadMedicine]);

  // Browser-level protection only (tab close/refresh) - matches EditPatientPage's
  // identical pattern. This app uses a plain BrowserRouter, not React Router's
  // data-router API, so in-app navigation cannot be intercepted the same way; only the
  // Cancel button below explicitly confirms before leaving.
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

  async function handleSubmit(formValues) {
    setIsSubmitting(true);
    setFieldErrors({});

    try {
      await updateMedicine(medicineId, {
        medicineName: formValues.medicineName,
        genericName: formValues.genericName,
        brandName: formValues.brandName || null,
        strength: formValues.strength,
        medicineFormCode: formValues.medicineFormCode,
        medicineRouteCode: formValues.medicineRouteCode,
        manufacturer: formValues.manufacturer || null,
        atcCode: formValues.atcCode || null,
        isControlledDrug: formValues.isControlledDrug,
        notes: formValues.notes || null,
        rowVersion: medicine.rowVersion,
      });

      setIsDirty(false);
      showSuccess(`Medicine ${medicine.medicineCode} was updated successfully.`);
      navigate('/medicines');
    } catch (error) {
      const { generalMessage, fieldErrors: apiFieldErrors } = parseApiError(error);
      showError(generalMessage || 'Unable to update the medicine. Please try again.');
      setFieldErrors(apiFieldErrors);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancel() {
    if (isDirty && !window.confirm('You have unsaved changes. Leave without saving?')) {
      return;
    }
    navigate('/medicines');
  }

  return (
    <PageContainer title="Edit Medicine">
      <div className="card border-0 shadow-sm rounded-3">
        <div className="card-body">
          {isLoading && (
            <div className="text-center py-5">
              <span className="spinner-border me-2" aria-hidden="true" />
              Loading medicine...
            </div>
          )}

          {!isLoading && loadError && (
            <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
              <span>{loadError}</span>
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={loadMedicine}>
                <i className="bi bi-arrow-clockwise me-1" aria-hidden="true" />
                Retry
              </button>
            </div>
          )}

          {!isLoading && !loadError && medicine && (
            <MedicineForm
              mode="edit"
              initialValues={{
                medicineCode: medicine.medicineCode,
                medicineName: medicine.medicineName,
                genericName: medicine.genericName,
                brandName: medicine.brandName || '',
                strength: medicine.strength,
                medicineFormCode: medicine.medicineForm?.code || '',
                medicineRouteCode: medicine.medicineRoute?.code || '',
                manufacturer: medicine.manufacturer || '',
                atcCode: medicine.atcCode || '',
                isControlledDrug: medicine.isControlledDrug,
                notes: medicine.notes || '',
                isActive: medicine.isActive,
                createdDate: medicine.createdDate,
                createdBy: medicine.createdBy,
                updatedDate: medicine.updatedDate,
                updatedBy: medicine.updatedBy,
              }}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={isSubmitting}
              fieldErrors={fieldErrors}
              onDirtyChange={setIsDirty}
            />
          )}
        </div>
      </div>
    </PageContainer>
  );
}

export default EditMedicinePage;
