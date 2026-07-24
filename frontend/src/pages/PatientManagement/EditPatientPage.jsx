import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer.jsx';
import PatientForm from '../../components/patientManagement/PatientForm.jsx';
import { getPatientById, updatePatient } from '../../api/patientsApi.js';
import { parseApiError } from '../../api/parseApiError.js';
import { useNotification } from '../../components/notifications/NotificationContext.jsx';

function describeLoadError(error) {
  const status = error?.response?.status;

  if (status === 404) {
    return 'This patient could not be found. It may have been removed.';
  }

  if (status === 401) {
    return 'Your session has expired. Please log in again.';
  }

  if (status === 403) {
    return 'You do not have permission to view this patient.';
  }

  const { generalMessage } = parseApiError(error);
  return generalMessage || 'Unable to load this patient.';
}

function EditPatientPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  const [patient, setPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  const loadPatient = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const result = await getPatientById(patientId);
      setPatient(result);
    } catch (error) {
      setLoadError(describeLoadError(error));
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadPatient();
  }, [loadPatient]);

  // Browser-level protection only (tab close/refresh) - matches EditUserPage's identical
  // pattern. This app uses a plain BrowserRouter, not React Router's data-router API, so
  // in-app navigation cannot be intercepted the same way; only the Cancel button below
  // explicitly confirms before leaving.
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
      await updatePatient(patientId, {
        firstName: formValues.firstName,
        lastName: formValues.lastName,
        preferredName: formValues.preferredName || null,
        dateOfBirth: formValues.dateOfBirth,
        genderCode: formValues.genderCode,
        mobileNumber: formValues.mobileNumber || null,
        email: formValues.email || null,
        addressLine1: formValues.addressLine1 || null,
        addressLine2: formValues.addressLine2 || null,
        city: formValues.city || null,
        region: formValues.region || null,
        postalCode: formValues.postalCode || null,
        country: formValues.country || null,
        nhiNumber: formValues.nhiNumber || null,
        nzmcNumber: formValues.nzmcNumber || null,
        notes: formValues.notes || null,
        rowVersion: patient.rowVersion,
      });

      setIsDirty(false);
      showSuccess(`Patient ${patient.patientNumber} was updated successfully.`);
      navigate('/patients');
    } catch (error) {
      const { generalMessage, fieldErrors: apiFieldErrors } = parseApiError(error);
      showError(generalMessage || 'Unable to update the patient. Please try again.');
      setFieldErrors(apiFieldErrors);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancel() {
    if (isDirty && !window.confirm('You have unsaved changes. Leave without saving?')) {
      return;
    }
    navigate('/patients');
  }

  return (
    <PageContainer title="Edit Patient">
      <div className="card border-0 shadow-sm rounded-3">
        <div className="card-body">
          {isLoading && (
            <div className="text-center py-5">
              <span className="spinner-border me-2" aria-hidden="true" />
              Loading patient...
            </div>
          )}

          {!isLoading && loadError && (
            <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
              <span>{loadError}</span>
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={loadPatient}>
                <i className="bi bi-arrow-clockwise me-1" aria-hidden="true" />
                Retry
              </button>
            </div>
          )}

          {!isLoading && !loadError && patient && (
            <PatientForm
              mode="edit"
              initialValues={{
                firstName: patient.firstName,
                lastName: patient.lastName,
                preferredName: patient.preferredName || '',
                // The date input needs a plain YYYY-MM-DD value; the API returns a full
                // ISO date-time string for DateOfBirth (DATE in SQL Server, but still
                // serialized with a time component by System.Text.Json).
                dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.slice(0, 10) : '',
                genderCode: patient.gender?.code || '',
                mobileNumber: patient.mobileNumber || '',
                email: patient.email || '',
                addressLine1: patient.addressLine1 || '',
                addressLine2: patient.addressLine2 || '',
                city: patient.city || '',
                region: patient.region || '',
                postalCode: patient.postalCode || '',
                country: patient.country || '',
                nhiNumber: patient.nhiNumber || '',
                nzmcNumber: patient.nzmcNumber || '',
                notes: patient.notes || '',
                patientNumber: patient.patientNumber,
                isActive: patient.isActive,
                createdDate: patient.createdDate,
                createdBy: patient.createdBy,
                updatedDate: patient.updatedDate,
                updatedBy: patient.updatedBy,
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

export default EditPatientPage;
