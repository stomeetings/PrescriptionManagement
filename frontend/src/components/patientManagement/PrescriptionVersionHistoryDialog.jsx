import { useCallback, useEffect, useState } from 'react';
import PrescriptionVersionTimeline from './PrescriptionVersionTimeline.jsx';
import PrescriptionVersionComparison from './PrescriptionVersionComparison.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';
import { ROLES } from '../../auth/roles.js';
import { useNotification } from '../notifications/NotificationContext.jsx';
import { getPrescriptionVersions, comparePrescriptionVersions, restorePrescriptionVersion } from '../../api/prescriptionApi.js';
import { parseApiError } from '../../api/parseApiError.js';

// Modal shell matching PrescriptionPreviewDialog's established plain-React .modal
// pattern (no bootstrap.bundle.js). Lists every saved version once, on open (this step's
// own "load history on demand" requirement); comparison is fetched only once exactly two
// versions are selected ("lazy load comparisons"). Administrator/Doctor can restore;
// Pharmacist sees everything except the Restore control - this dialog is only ever
// opened from the Prescription Preview Dialog, which is itself Admin/Doctor-gated
// upstream, but the Restore button is still hidden by role here too, since the backend
// is the real authority and a surprise 403 would be confusing UX either way.
function PrescriptionVersionHistoryDialog({ show, prescriptionId, currentVersionNumber, onRestored, onClose }) {
  const [versions, setVersions] = useState([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [versionsError, setVersionsError] = useState(null);
  const [selectedVersions, setSelectedVersions] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonError, setComparisonError] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const { hasRole } = useAuth();
  const { showSuccess, showError } = useNotification();

  const canRestore = hasRole(ROLES.SYSTEM_ADMINISTRATOR, ROLES.DOCTOR);

  const loadVersions = useCallback(async () => {
    if (!prescriptionId) {
      return;
    }

    setIsLoadingVersions(true);
    setVersionsError(null);

    try {
      const result = await getPrescriptionVersions(prescriptionId);
      setVersions(result);
    } catch (loadError) {
      const { generalMessage } = parseApiError(loadError);
      setVersionsError(generalMessage || 'Unable to load version history. Please try again.');
    } finally {
      setIsLoadingVersions(false);
    }
  }, [prescriptionId]);

  useEffect(() => {
    if (show) {
      setSelectedVersions([]);
      setComparison(null);
      setComparisonError(null);
      loadVersions();
    }
  }, [show, loadVersions]);

  useEffect(() => {
    if (selectedVersions.length !== 2) {
      setComparison(null);
      setComparisonError(null);
      return;
    }

    const [fromVersion, toVersion] = [...selectedVersions].sort((a, b) => a - b);

    setIsComparing(true);
    setComparisonError(null);

    comparePrescriptionVersions(prescriptionId, fromVersion, toVersion)
      .then(setComparison)
      .catch((compareError) => {
        const { generalMessage } = parseApiError(compareError);
        setComparisonError(generalMessage || 'Unable to compare these versions. Please try again.');
      })
      .finally(() => setIsComparing(false));
  }, [selectedVersions, prescriptionId]);

  function handleToggleSelect(versionNumber) {
    setSelectedVersions((current) => {
      if (current.includes(versionNumber)) {
        return current.filter((value) => value !== versionNumber);
      }

      // At most two selections - picking a third drops the oldest pick, so Compare
      // always reflects the two most recently clicked versions.
      const next = [...current, versionNumber];
      return next.length > 2 ? next.slice(next.length - 2) : next;
    });
  }

  async function handleRestore(versionNumber) {
    if (isRestoring || !canRestore) {
      return;
    }

    setIsRestoring(true);

    try {
      const result = await restorePrescriptionVersion(prescriptionId, versionNumber);
      showSuccess(`Version ${versionNumber} restored as new Version ${result.versionNumber}.`);
      setSelectedVersions([]);
      await loadVersions();
      onRestored?.(result);
    } catch (restoreError) {
      const { generalMessage } = parseApiError(restoreError);
      showError(generalMessage || 'Unable to restore this version. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  }

  if (!show) {
    return null;
  }

  const canRestoreSelection =
    canRestore && selectedVersions.length === 1 && selectedVersions[0] !== currentVersionNumber;

  return (
    <>
      <div
        className="modal d-block"
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prescriptionVersionHistoryTitle"
      >
        <div className="modal-dialog modal-dialog-centered modal-xl" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="prescriptionVersionHistoryTitle">
                Version History
              </h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
            </div>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-5 border-end">
                  <p className="small text-muted">Select up to two versions to compare.</p>
                  <PrescriptionVersionTimeline
                    versions={versions}
                    isLoading={isLoadingVersions}
                    error={versionsError}
                    onRetry={loadVersions}
                    selectedVersions={selectedVersions}
                    onToggleSelect={handleToggleSelect}
                    currentVersionNumber={currentVersionNumber}
                  />
                  {canRestoreSelection && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-warning mt-3"
                      onClick={() => handleRestore(selectedVersions[0])}
                      disabled={isRestoring}
                    >
                      {isRestoring ? <span className="spinner-border spinner-border-sm me-1" aria-hidden="true" /> : null}
                      Restore Version {selectedVersions[0]}
                    </button>
                  )}
                </div>
                <div className="col-md-7">
                  <PrescriptionVersionComparison comparison={comparison} isLoading={isComparing} error={comparisonError} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}

export default PrescriptionVersionHistoryDialog;
