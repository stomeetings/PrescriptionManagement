import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer.jsx';
import UserProfileCard from '../../components/userManagement/UserProfileCard.jsx';
import UserInformationSection from '../../components/userManagement/UserInformationSection.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import ResetPasswordDialog from '../../components/userManagement/ResetPasswordDialog.jsx';
import { activateUser, deactivateUser, getUserById, resetPassword } from '../../api/usersApi.js';
import { parseApiError } from '../../api/parseApiError.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useNotification } from '../../components/notifications/NotificationContext.jsx';

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : '—';
}

function UserDetailsPage() {
  const { userAccountId } = useParams();
  const { user: currentUser } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [confirmAction, setConfirmAction] = useState(null); // 'activate' | 'deactivate' | null
  const [isActionProcessing, setIsActionProcessing] = useState(false);

  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [resetPasswordResult, setResetPasswordResult] = useState('');
  const [isResetPasswordSubmitting, setIsResetPasswordSubmitting] = useState(false);

  const loadUser = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const result = await getUserById(userAccountId);
      setUser(result);
    } catch (fetchError) {
      const { generalMessage } = parseApiError(fetchError);
      const message = generalMessage || 'This user could not be found.';
      setError(message);
      showError(message);
    } finally {
      setIsLoading(false);
    }
    // showError is stable (useCallback in NotificationContext) - safe to omit here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userAccountId]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const isOwnAccount = currentUser?.userAccountId === user?.userAccountId;

  async function handleConfirmAction() {
    if (!confirmAction || !user) {
      return;
    }

    setIsActionProcessing(true);

    try {
      if (confirmAction === 'activate') {
        await activateUser(user.userAccountId);
        showSuccess(`${user.fullName} was activated.`);
      } else {
        await deactivateUser(user.userAccountId);
        showSuccess(`${user.fullName} was deactivated.`);
      }

      setConfirmAction(null);
      await loadUser();
    } catch (actionError) {
      const { generalMessage } = parseApiError(actionError);
      showError(generalMessage || 'Unable to complete this action. Please try again.');
      setConfirmAction(null);
    } finally {
      setIsActionProcessing(false);
    }
  }

  function openResetPasswordDialog() {
    setResetPasswordResult('');
    setIsResetPasswordOpen(true);
  }

  async function handleConfirmResetPassword() {
    if (!user) {
      return;
    }

    setIsResetPasswordSubmitting(true);

    try {
      const result = await resetPassword(user.userAccountId);
      setResetPasswordResult(result.temporaryPassword);
      showSuccess(`Password reset for ${user.username}.`);
    } catch (resetError) {
      const { generalMessage } = parseApiError(resetError);
      showError(generalMessage || 'Unable to reset the password. Please try again.');
      setIsResetPasswordOpen(false);
    } finally {
      setIsResetPasswordSubmitting(false);
    }
  }

  function closeResetPasswordDialog() {
    setIsResetPasswordOpen(false);
    setResetPasswordResult('');
  }

  return (
    <PageContainer title="User Details">
      <div className="mb-3">
        <Link to="/user-management" className="btn btn-outline-secondary btn-sm">
          <i className="bi bi-arrow-left me-1" aria-hidden="true" />
          Back to User List
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
            <h2 className="h5 mt-3">User Not Found</h2>
            <p className="text-muted">{error}</p>
            <Link to="/user-management" className="btn btn-primary">
              Back to User List
            </Link>
          </div>
        </div>
      )}

      {!isLoading && !error && user && (
        <div className="row g-3">
          <div className="col-12 col-md-4">
            <UserProfileCard user={user} />

            <div className="d-flex flex-column gap-2 mt-3">
              <Link to={`/user-management/${user.userAccountId}/edit`} className="btn btn-primary">
                <i className="bi bi-pencil me-1" aria-hidden="true" />
                Edit User
              </Link>

              {user.isActive ? (
                <button
                  type="button"
                  className="btn btn-outline-warning"
                  onClick={() => setConfirmAction('deactivate')}
                  disabled={isOwnAccount}
                  title={isOwnAccount ? 'You cannot deactivate your own account' : undefined}
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
              )}

              <button type="button" className="btn btn-outline-secondary" onClick={openResetPasswordDialog}>
                <i className="bi bi-key me-1" aria-hidden="true" />
                Reset Password
              </button>
            </div>
          </div>

          <div className="col-12 col-md-8 d-flex flex-column gap-3">
            <UserInformationSection
              title="General Information"
              items={[
                { label: 'Email', value: user.email },
                { label: 'Phone Number', value: user.phoneNumber },
              ]}
            />

            <UserInformationSection
              title="Account Information"
              items={[
                { label: 'Created Date', value: formatDateTime(user.createdDate) },
                { label: 'Created By', value: user.createdBy },
                { label: 'Updated Date', value: formatDateTime(user.updatedDate) },
                { label: 'Updated By', value: user.updatedBy },
                { label: 'Last Login', value: formatDateTime(user.lastLoginDate) },
              ]}
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        show={Boolean(confirmAction)}
        title={confirmAction === 'activate' ? 'Activate User' : 'Deactivate User'}
        message={
          confirmAction === 'activate'
            ? `Activate ${user?.fullName}? They will be able to log in immediately.`
            : `Deactivate ${user?.fullName}? They will no longer be able to log in.`
        }
        confirmLabel={confirmAction === 'activate' ? 'Activate' : 'Deactivate'}
        confirmVariant={confirmAction === 'activate' ? 'success' : 'warning'}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
        isProcessing={isActionProcessing}
      />

      <ResetPasswordDialog
        show={isResetPasswordOpen}
        username={user?.username}
        isSubmitting={isResetPasswordSubmitting}
        temporaryPassword={resetPasswordResult}
        onConfirm={handleConfirmResetPassword}
        onClose={closeResetPasswordDialog}
      />
    </PageContainer>
  );
}

export default UserDetailsPage;
