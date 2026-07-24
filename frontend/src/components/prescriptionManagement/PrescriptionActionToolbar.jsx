import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { ROLES } from '../../auth/roles.js';

// Matches PrescriptionReprintService's exact enforced rule (DRAFT -> use the normal
// Print action; CANCELLED -> never) - not a broader "looks reasonable" guess, so the
// button's enabled state never disagrees with what the backend will actually accept.
const NON_REPRINTABLE_STATUSES = ['DRAFT', 'CANCELLED'];
// Matches PrescriptionRenewalService's default-configuration enforced rule (DRAFT/
// CANCELLED never renewable; EXPIRED excluded here too since AllowExpiredRenewal
// defaults to false - the backend is still the real authority if that configuration
// ever changes).
const NON_RENEWABLE_STATUSES = ['DRAFT', 'CANCELLED', 'EXPIRED'];
// Matches usp_Prescription_Cancel's own enforced eligibility exactly: cancellable
// whenever status is neither DRAFT (not yet finalized - a Draft is simply discarded, not
// "cancelled"), CANCELLED (already cancelled), nor DISPENSED (fully dispensed) - every
// other status (PENDING/PROCESSING/SENT/FAILED/EXPIRED) is cancellable. Replaces the
// earlier placeholder TERMINAL_STATUSES list (used only while Cancel was a stub).
const NON_CANCELLABLE_STATUSES = ['DRAFT', 'CANCELLED', 'DISPENSED'];

// Preview/Print/Download PDF/Version History/Back to List/Reprint/Renew/Finalize are all
// real (Preview/Print/Reprint reuse PrescriptionPreviewModal; Download PDF calls the
// existing endpoint directly; Version History reuses PrescriptionVersionHistoryDialog;
// Finalize reuses the already-built finalizePrescription API + PrescriptionFinalizeConfirmDialog
// from Step 18.8 verbatim - no new backend work, only a UI entry point this page never
// had before, added because Prescription Renewal's own workflow explicitly ends in
// "...Finalize"). Clone/Cancel are still stubs - neither has any backend at all.
// canReprint/canRenew/canFinalize are all gated by hasRole (Doctor/Administrator only;
// Pharmacist/Receptionist never see these buttons, matching PrescriptionActionBar's
// identical canFinalize precedent) and by status.
function PrescriptionActionToolbar({
  prescription,
  onPreview,
  onPrint,
  onDownloadPdf,
  isDownloadingPdf,
  onViewHistory,
  onReprint,
  onRenew,
  onFinalize,
  onClone,
  onCancel,
}) {
  const { hasRole } = useAuth();
  const canReprintRole = hasRole(ROLES.SYSTEM_ADMINISTRATOR, ROLES.DOCTOR);
  const canRenewRole = hasRole(ROLES.SYSTEM_ADMINISTRATOR, ROLES.DOCTOR);
  const canFinalizeRole = hasRole(ROLES.SYSTEM_ADMINISTRATOR, ROLES.DOCTOR);
  const canCancelRole = hasRole(ROLES.SYSTEM_ADMINISTRATOR, ROLES.DOCTOR);

  const statusCode = prescription.status?.code;
  const canReprintStatus = !NON_REPRINTABLE_STATUSES.includes(statusCode);
  const canRenewStatus = !NON_RENEWABLE_STATUSES.includes(statusCode);
  const canFinalizeStatus = statusCode === 'DRAFT';
  const canCancel = !NON_CANCELLABLE_STATUSES.includes(statusCode);

  return (
    <div className="card border-0 shadow-sm rounded-3 mb-3">
      <div className="card-body d-flex flex-wrap gap-2">
        <Link to="/prescriptions" className="btn btn-outline-secondary">
          <i className="bi bi-arrow-left me-1" aria-hidden="true" />
          Back to List
        </Link>

        <button type="button" className="btn btn-outline-primary" onClick={onPreview}>
          <i className="bi bi-eye me-1" aria-hidden="true" />
          Preview
        </button>

        <button type="button" className="btn btn-outline-primary" onClick={onPrint}>
          <i className="bi bi-printer me-1" aria-hidden="true" />
          Print
        </button>

        <button type="button" className="btn btn-outline-primary" onClick={onDownloadPdf} disabled={isDownloadingPdf}>
          {isDownloadingPdf ? (
            <span className="spinner-border spinner-border-sm me-1" aria-hidden="true" />
          ) : (
            <i className="bi bi-file-earmark-pdf me-1" aria-hidden="true" />
          )}
          Download PDF
        </button>

        {canReprintRole && (
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={onReprint}
            disabled={!canReprintStatus}
            title={canReprintStatus ? 'Reprint this prescription' : 'Only a finalized prescription can be reprinted'}
          >
            <i className="bi bi-printer-fill me-1" aria-hidden="true" />
            Reprint
          </button>
        )}

        <button type="button" className="btn btn-outline-secondary" onClick={onViewHistory}>
          <i className="bi bi-clock-history me-1" aria-hidden="true" />
          Version History
        </button>

        {canRenewRole && (
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={onRenew}
            disabled={!canRenewStatus}
            title={canRenewStatus ? 'Renew this prescription' : 'Only a finalized, non-cancelled, non-expired prescription can be renewed'}
          >
            <i className="bi bi-arrow-clockwise me-1" aria-hidden="true" />
            Renew
          </button>
        )}

        {canFinalizeRole && canFinalizeStatus && (
          <button type="button" className="btn btn-warning" onClick={onFinalize}>
            <i className="bi bi-check2-circle me-1" aria-hidden="true" />
            Finalize
          </button>
        )}

        <button type="button" className="btn btn-outline-secondary" onClick={onClone} title="Will be available in a future release">
          <i className="bi bi-copy me-1" aria-hidden="true" />
          Clone
        </button>

        {canCancelRole && (
          <button
            type="button"
            className="btn btn-outline-danger"
            onClick={onCancel}
            disabled={!canCancel}
            title={canCancel ? 'Cancel this prescription' : 'This prescription can no longer be cancelled'}
          >
            <i className="bi bi-x-circle me-1" aria-hidden="true" />
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export default PrescriptionActionToolbar;
