import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer.jsx';
import UserForm from '../../components/userManagement/UserForm.jsx';
import { createUser } from '../../api/usersApi.js';
import { parseApiError } from '../../api/parseApiError.js';
import { useNotification } from '../../components/notifications/NotificationContext.jsx';

function CreateUserPage() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  async function handleSubmit(formValues) {
    setIsSubmitting(true);
    setFieldErrors({});

    try {
      await createUser({
        firstName: formValues.firstName,
        lastName: formValues.lastName,
        username: formValues.username,
        email: formValues.email,
        phoneNumber: formValues.phoneNumber || null,
        roleCode: formValues.roleCode,
        temporaryPassword: formValues.temporaryPassword,
        isActive: formValues.isActive,
      });

      showSuccess(`User "${formValues.username}" was created successfully.`);
      navigate('/user-management');
    } catch (error) {
      const { generalMessage, fieldErrors: apiFieldErrors } = parseApiError(error);

      showError(generalMessage || 'Unable to create the user. Please try again.');
      setFieldErrors(apiFieldErrors);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancel() {
    navigate('/user-management');
  }

  return (
    <PageContainer title="Create User">
      <div className="card border-0 shadow-sm rounded-3">
        <div className="card-body">
          <UserForm
            mode="create"
            initialValues={{}}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
            fieldErrors={fieldErrors}
          />
        </div>
      </div>
    </PageContainer>
  );
}

export default CreateUserPage;
