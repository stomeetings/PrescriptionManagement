import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer.jsx';
import MedicineProfileCard from '../../components/medicineManagement/MedicineProfileCard.jsx';
import MedicineInformationSection from '../../components/medicineManagement/MedicineInformationSection.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import { activateMedicine, deactivateMedicine, getMedicineById } from '../../api/medicinesApi.js';
import { parseApiError } from '../../api/parseApiError.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useNotification } from '../../components/notifications/NotificationContext.jsx';
import { ROLES } from '../../auth/roles.js';

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : '—';
}

function describeLoadError(error) {
  const status = error?.response?.status;

  if (status === 404) {
    return { heading: 'Medicine Not Found', message: 'This medicine could not be found. It may have been removed.' };
  }

  if (status === 401) {
    return { heading: 'Session Expired', message: 'Your session has expired. Please log in again.' };
  }

  if (status === 403) {
    return { heading: 'Access Denied', message: 'You do not have permission to view this medicine.' };
  }

  const { generalMessage } = parseApiError(error);
  return { heading: 'Something Went Wrong', message: generalMessage || 'Unable to load this medicine.' };
}

function MedicineDetailsPage() {
  const { medicineId } = useParams();
  const { hasRole } = useAuth();
  const { showSuccess, showError, showWarning } = useNotification();

  const [medicine, setMedicine] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [confirmAction, setConfirmAction] = useState(null); // 'activate' | 'deactivate' | null
  const [isActionProcessing, setIsActionProcessing] = useState(false);

  // Medicine Management has a single write tier - Administrators only for Edit and for
  // Activate/Deactivate alike, unlike Patient Management's split.
  const canEdit = hasRole(ROLES.SYSTEM_ADMINISTRATOR);
  const canActivateDeactivate = hasRole(ROLES.SYSTEM_ADMINISTRATOR);

  const loadMedicine = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getMedicineById(medicineId);
      setMedicine(result);
    } catch (fetchError) {
      setError(describeLoadError(fetchError));
    } finally {
      setIsLoading(false);
    }
  }, [medicineId]);

  useEffect(() => {
    loadMedicine();
  }, [loadMedicine]);

  async function handleConfirmAction() {
    if (!confirmAction || !medicine) {
      return;
    }

    setIsActionProcessing(true);

    try {
      if (confirmAction === 'activate') {
        await activateMedicine(medicine.medicineId);
        showSuccess(`${medicine.medicineName} was activated.`);
      } else {
        await deactivateMedicine(medicine.medicineId);
        showSuccess(`${medicine.medicineName} was deactivated.`);
      }

      setConfirmAction(null);
      await loadMedicine();
    } catch (actionError) {
      const { generalMessage } = parseApiError(actionError);
      const message = generalMessage || 'Unable to complete this action. Please try again.';

      if (confirmAction === 'deactivate' && actionError?.response?.status === 409) {
        showWarning(message);
      } else {
        showError(message);
      }

      setConfirmAction(null);
    } finally {
      setIsActionProcessing(false);
    }
  }

  return (
    <PageContainer title="Medicine Details">
      <div className="mb-3">
        <Link to="/medicines" className="btn btn-outline-secondary btn-sm">
          <i className="bi bi-arrow-left me-1" aria-hidden="true" />
          Back to Medicine List
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
            <h2 className="h5 mt-3">{error.heading}</h2>
            <p className="text-muted">{error.message}</p>
            <div className="d-flex justify-content-center gap-2">
              <button type="button" className="btn btn-outline-secondary" onClick={loadMedicine}>
                <i className="bi bi-arrow-clockwise me-1" aria-hidden="true" />
                Retry
              </button>
              <Link to="/medicines" className="btn btn-primary">
                Back to Medicine List
              </Link>
            </div>
          </div>
        </div>
      )}

      {!isLoading && !error && medicine && (
        <div className="row g-3">
          <div className="col-12 col-md-4">
            <MedicineProfileCard medicine={medicine} />

            <div className="d-flex flex-column gap-2 mt-3">
              {canEdit && (
                <Link to={`/medicines/${medicine.medicineId}/edit`} className="btn btn-primary">
                  <i className="bi bi-pencil me-1" aria-hidden="true" />
                  Edit Medicine
                </Link>
              )}

              {canActivateDeactivate &&
                (medicine.isActive ? (
                  <button
                    type="button"
                    className="btn btn-outline-warning"
                    onClick={() => setConfirmAction('deactivate')}
                  >
                    <i className="bi bi-x-circle me-1" aria-hidden="true" />
                    Deactivate
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-outline-success"
                    onClick={() => setConfirmAction('activate')}
                  >
                    <i className="bi bi-check-circle me-1" aria-hidden="true" />
                    Activate
                  </button>
                ))}
            </div>
          </div>

          <div className="col-12 col-md-8 d-flex flex-column gap-3">
            <MedicineInformationSection
              title="Medicine Information"
              items={[
                { label: 'Medicine Code', value: medicine.medicineCode },
                { label: 'Medicine Name', value: medicine.medicineName },
                { label: 'Generic Name', value: medicine.genericName },
                { label: 'Brand Name', value: medicine.brandName },
                { label: 'Strength', value: medicine.strength },
                { label: 'Dosage Form', value: medicine.medicineForm?.displayText },
                { label: 'Route', value: medicine.medicineRoute?.displayText },
                { label: 'Manufacturer', value: medicine.manufacturer },
                { label: 'ATC Code', value: medicine.atcCode },
                { label: 'Controlled Drug', value: medicine.isControlledDrug ? 'Yes' : 'No' },
                { label: 'Status', value: medicine.isActive ? 'Active' : 'Inactive' },
              ]}
            />

            <MedicineInformationSection title="Notes" items={[{ label: 'Notes', value: medicine.notes }]} />

            <MedicineInformationSection
              title="Audit Information"
              items={[
                { label: 'Created By', value: medicine.createdBy },
                { label: 'Created Date', value: formatDateTime(medicine.createdDate) },
                { label: 'Updated By', value: medicine.updatedBy },
                { label: 'Updated Date', value: formatDateTime(medicine.updatedDate) },
              ]}
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        show={Boolean(confirmAction)}
        title={confirmAction === 'activate' ? 'Activate Medicine' : 'Deactivate Medicine'}
        message={
          <>
            <p className="mb-2">
              <strong>{medicine?.medicineCode}</strong> — {medicine?.medicineName}
              {medicine?.strength ? ` (${medicine.strength})` : ''}
            </p>
            <p className="mb-0">
              {confirmAction === 'activate'
                ? 'Are you sure you want to activate this medicine?'
                : 'Are you sure you want to deactivate this medicine?'}
            </p>
            {confirmAction === 'deactivate' && (
              <div className="alert alert-warning d-flex align-items-center gap-2 mt-3 mb-0 py-2 px-3 small" role="alert">
                <i className="bi bi-exclamation-triangle" aria-hidden="true" />
                Inactive medicines cannot be selected for new prescriptions.
              </div>
            )}
          </>
        }
        confirmLabel="Confirm"
        confirmVariant={confirmAction === 'activate' ? 'success' : 'warning'}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
        isProcessing={isActionProcessing}
      />
    </PageContainer>
  );
}

export default MedicineDetailsPage;
