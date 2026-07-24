import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer.jsx';
import MedicineForm from '../../components/medicineManagement/MedicineForm.jsx';
import { createMedicine } from '../../api/medicinesApi.js';
import { parseApiError } from '../../api/parseApiError.js';
import { useNotification } from '../../components/notifications/NotificationContext.jsx';

function CreateMedicinePage() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  // Browser-level protection only (tab close/refresh) - matches
  // CreatePatientPage's identical pattern. This app uses a plain BrowserRouter, not
  // React Router's data-router API, so in-app navigation cannot be intercepted the same
  // way; only the Cancel button below explicitly confirms before leaving.
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
      const created = await createMedicine({
        medicineCode: formValues.medicineCode,
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
      });

      setIsDirty(false);
      showSuccess(`Medicine ${created.medicineCode} (${created.medicineName}) was created successfully.`);
      navigate('/medicines');
    } catch (error) {
      const { generalMessage, fieldErrors: apiFieldErrors } = parseApiError(error);

      showError(generalMessage || 'Unable to create the medicine. Please try again.');
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
    <PageContainer title="Create Medicine">
      <div className="card border-0 shadow-sm rounded-3">
        <div className="card-body">
          <MedicineForm
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

export default CreateMedicinePage;
