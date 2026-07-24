import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer.jsx';
import PatientForm from '../../components/patientManagement/PatientForm.jsx';
import { createPatient } from '../../api/patientsApi.js';
import { parseApiError } from '../../api/parseApiError.js';
import { useNotification } from '../../components/notifications/NotificationContext.jsx';

function CreatePatientPage() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  // Browser-level protection only (tab close/refresh). This app uses a plain
  // BrowserRouter, not React Router's data-router API, so in-app navigation (e.g. a
  // sidebar link click) cannot be intercepted the same way - only the Cancel button
  // below explicitly confirms before leaving. Mirrors EditUserPage's identical pattern.
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
      const created = await createPatient({
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
      });

      setIsDirty(false);
      showSuccess(
        `Patient ${created.patientNumber} (${created.firstName} ${created.lastName}) was created successfully.`,
      );
      navigate('/patients');
    } catch (error) {
      const { generalMessage, fieldErrors: apiFieldErrors } = parseApiError(error);

      showError(generalMessage || 'Unable to create the patient. Please try again.');
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
    <PageContainer title="Create Patient">
      <div className="card border-0 shadow-sm rounded-3">
        <div className="card-body">
          <PatientForm
            mode="create"
            initialValues={{}}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
            fieldErrors={fieldErrors}
            onDirtyChange={setIsDirty}
          />
        </div>
      </div>
    </PageContainer>
  );
}

export default CreatePatientPage;
