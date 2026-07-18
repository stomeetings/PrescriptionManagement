import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer.jsx';
import UserForm from '../../components/userManagement/UserForm.jsx';
import { getUserById, updateUser } from '../../api/usersApi.js';
import { parseApiError } from '../../api/parseApiError.js';
import { useNotification } from '../../components/notifications/NotificationContext.jsx';

function EditUserPage() {
  const { userAccountId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  const loadUser = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const result = await getUserById(userAccountId);
      setUser(result);
    } catch (error) {
      const { generalMessage } = parseApiError(error);
      setLoadError(generalMessage || 'Unable to load this user.');
    } finally {
      setIsLoading(false);
    }
  }, [userAccountId]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Browser-level protection only (tab close/refresh). This app uses a plain
  // BrowserRouter, not React Router's data-router API, so in-app navigation (e.g. a
  // sidebar link click) cannot be intercepted the same way - only the Cancel button
  // below explicitly confirms before leaving.
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
      await updateUser(userAccountId, {
        firstName: formValues.firstName,
        lastName: formValues.lastName,
        email: formValues.email,
        phoneNumber: formValues.phoneNumber || null,
        roleCode: formValues.roleCode,
        isActive: formValues.isActive,
        rowVersion: user.rowVersion,
      });

      showSuccess(`User "${user.username}" was updated successfully.`);
      navigate('/user-management');
    } catch (error) {
      const { generalMessage, fieldErrors: apiFieldErrors } = parseApiError(error);
      showError(generalMessage || 'Unable to update the user. Please try again.');
      setFieldErrors(apiFieldErrors);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancel() {
    if (isDirty && !window.confirm('You have unsaved changes. Leave without saving?')) {
      return;
    }
    navigate('/user-management');
  }

  return (
    <PageContainer title="Edit User">
      <div className="card border-0 shadow-sm rounded-3">
        <div className="card-body">
          {isLoading && (
            <div className="text-center py-5">
              <span className="spinner-border me-2" aria-hidden="true" />
              Loading user...
            </div>
          )}

          {!isLoading && loadError && (
            <div className="alert alert-danger" role="alert">
              {loadError}
            </div>
          )}

          {!isLoading && !loadError && user && (
            <UserForm
              mode="edit"
              initialValues={{
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username,
                email: user.email,
                phoneNumber: user.phoneNumber || '',
                roleCode: user.role?.code || '',
                isActive: user.isActive,
                createdDate: user.createdDate,
                lastLoginDate: user.lastLoginDate,
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

export default EditUserPage;
