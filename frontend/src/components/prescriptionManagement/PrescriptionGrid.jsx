import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PrescriptionStatusBadge from './PrescriptionStatusBadge.jsx';
import PrescriptionReprintDialog from './PrescriptionReprintDialog.jsx';
import PrescriptionRenewalDialog from './PrescriptionRenewalDialog.jsx';
import PrescriptionRenewalSummary from './PrescriptionRenewalSummary.jsx';
import PrescriptionCancellationDialog from './PrescriptionCancellationDialog.jsx';
import PrescriptionPreviewModal from './PrescriptionPreviewModal.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';
import { ROLES } from '../../auth/roles.js';
import { useNotification } from '../notifications/NotificationContext.jsx';
import { downloadPrescriptionPdf } from '../../api/prescriptionApi.js';
import { parseApiError } from '../../api/parseApiError.js';

const NON_REPRINTABLE_STATUSES = ['DRAFT', 'CANCELLED'];
const NON_RENEWABLE_STATUSES = ['DRAFT', 'CANCELLED', 'EXPIRED'];
// Matches usp_Prescription_Cancel's own enforced eligibility exactly (see
// PrescriptionActionToolbar.jsx's identical constant/comment).
const NON_CANCELLABLE_STATUSES = ['DRAFT', 'CANCELLED', 'DISPENSED'];

// Only prescriptionNumber/patient/issueDate/expiryDate/status/createdDate have an ORDER
// BY branch in usp_Prescription_GetAll/Search - NHI/Provider/MedicationCount/Version/
// CreatedBy are display-only columns, same "don't offer a sort the server can't honor"
// rule as PatientTable's COLUMNS list.
const COLUMNS = [
  { key: 'prescriptionNumber', label: 'Prescription Number', sortable: true },
  { key: 'patient', label: 'Patient Name', sortable: true },
  { key: 'nhi', label: 'NHI', sortable: false },
  { key: 'provider', label: 'Provider', sortable: false },
  { key: 'issueDate', label: 'Issue Date', sortable: true },
  { key: 'expiryDate', label: 'Expiry Date', sortable: true },
  { key: 'medicationCount', label: 'Medication Count', sortable: false },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'version', label: 'Version', sortable: false },
  { key: 'createdBy', label: 'Created By', sortable: false },
  { key: 'createdDate', label: 'Created Date', sortable: true },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

function SkeletonRows({ columnCount, rowCount = 5 }) {
  return (
    <>
      {Array.from({ length: rowCount }, (_, rowIndex) => (
        <tr key={rowIndex} aria-hidden="true">
          {Array.from({ length: columnCount }, (_, cellIndex) => (
            <td key={cellIndex}>
              <span className="placeholder col-8" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// Ten actions (View/Edit/Preview/Print/Download PDF/Finalize/Reprint/Renew/Clone/Cancel)
// is too many for inline icon buttons (PatientTable/MedicineTable's approach with 2-4
// actions) - a dropdown menu instead, toggled via plain React state since this project
// deliberately never loads bootstrap.bundle.js (no Popper-driven Bootstrap JS components
// anywhere - every modal in this codebase is hand-rolled the same way). View, Download
// PDF, Reprint, and Renew are wired for real: View navigates to the Prescription Details
// page (GET /api/prescriptions/{id}), which itself has real Preview/Print/Download PDF/
// Version History/Finalize actions; Download PDF here needs nothing but the id; Reprint/
// Renew each open their own dialog directly from the row (both self-fetch the full
// prescription detail they need, matching PrescriptionReprintDialog's own established
// pattern) and, on success, reuse the same PrescriptionPreviewModal/Details navigation
// the Details page itself uses - never a second, duplicated implementation. Preview/
// Print/Finalize navigate to Details instead of duplicating their own confirm-dialog
// flow inline in a row that only has the list's summary shape, not the full detail those
// actions need. Edit is not part of the Details page's own Action Toolbar (that
// feature's own scope), so it stays a disabled entry here. Clone/Cancel still have no
// backend at all.
function RowActionsMenu({ prescription, onReprint, onRenew, onCancelPrescription }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { showWarning, showError } = useNotification();

  const canFinalize = hasRole(ROLES.SYSTEM_ADMINISTRATOR, ROLES.DOCTOR);
  const canReprint = hasRole(ROLES.SYSTEM_ADMINISTRATOR, ROLES.DOCTOR);
  const canRenew = hasRole(ROLES.SYSTEM_ADMINISTRATOR, ROLES.DOCTOR);
  const canCancelPrescription = hasRole(ROLES.SYSTEM_ADMINISTRATOR, ROLES.DOCTOR);
  const isDraft = prescription.status?.code === 'DRAFT';
  const isReprintable = !NON_REPRINTABLE_STATUSES.includes(prescription.status?.code);
  const isRenewable = !NON_RENEWABLE_STATUSES.includes(prescription.status?.code);
  const isCancellable = !NON_CANCELLABLE_STATUSES.includes(prescription.status?.code);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handleOutsideClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  function handleView() {
    setIsOpen(false);
    navigate(`/prescriptions/${prescription.prescriptionId}`);
  }

  async function handleDownloadPdf() {
    setIsOpen(false);

    if (isDownloading) {
      return;
    }

    setIsDownloading(true);

    try {
      const pdfBlob = await downloadPrescriptionPdf(prescription.prescriptionId);
      const objectUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${prescription.prescriptionNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (downloadError) {
      const { generalMessage } = parseApiError(downloadError);
      showError(generalMessage || 'Unable to generate the prescription PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  }

  function handleStub(label) {
    setIsOpen(false);
    showWarning(`${label} from this list will be available in a future release.`);
  }

  return (
    <div className="dropdown position-relative" ref={menuRef}>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        onClick={() => setIsOpen((current) => !current)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`Actions for ${prescription.prescriptionNumber}`}
      >
        Actions <i className="bi bi-chevron-down ms-1" aria-hidden="true" />
      </button>

      {isOpen && (
        <ul className="dropdown-menu dropdown-menu-end show" style={{ position: 'absolute', right: 0, zIndex: 10 }}>
          <li>
            <button type="button" className="dropdown-item" onClick={handleView}>
              <i className="bi bi-eye me-2" aria-hidden="true" />
              View
            </button>
          </li>
          <li>
            <button
              type="button"
              className="dropdown-item"
              disabled={!isDraft}
              title={isDraft ? undefined : 'Only Draft prescriptions can be edited'}
              onClick={() => handleStub('Edit')}
            >
              <i className="bi bi-pencil me-2" aria-hidden="true" />
              Edit
            </button>
          </li>
          <li>
            <button type="button" className="dropdown-item" onClick={handleView}>
              <i className="bi bi-file-earmark-text me-2" aria-hidden="true" />
              Preview
            </button>
          </li>
          <li>
            <button type="button" className="dropdown-item" onClick={handleView}>
              <i className="bi bi-printer me-2" aria-hidden="true" />
              Print
            </button>
          </li>
          <li>
            <button type="button" className="dropdown-item" onClick={handleDownloadPdf} disabled={isDownloading}>
              {isDownloading ? (
                <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
              ) : (
                <i className="bi bi-file-earmark-pdf me-2" aria-hidden="true" />
              )}
              Download PDF
            </button>
          </li>
          {isDraft && canFinalize && (
            <li>
              <button type="button" className="dropdown-item" onClick={handleView}>
                <i className="bi bi-check2-circle me-2" aria-hidden="true" />
                Finalize
              </button>
            </li>
          )}
          {canReprint && (
            <li>
              <button
                type="button"
                className="dropdown-item"
                disabled={!isReprintable}
                title={isReprintable ? undefined : 'Only a finalized prescription can be reprinted'}
                onClick={() => {
                  setIsOpen(false);
                  onReprint(prescription.prescriptionId);
                }}
              >
                <i className="bi bi-printer-fill me-2" aria-hidden="true" />
                Reprint
              </button>
            </li>
          )}
          {canRenew && (
            <li>
              <button
                type="button"
                className="dropdown-item"
                disabled={!isRenewable}
                title={isRenewable ? undefined : 'Only a finalized, non-cancelled, non-expired prescription can be renewed'}
                onClick={() => {
                  setIsOpen(false);
                  onRenew(prescription.prescriptionId);
                }}
              >
                <i className="bi bi-arrow-clockwise me-2" aria-hidden="true" />
                Renew
              </button>
            </li>
          )}
          <li>
            <button type="button" className="dropdown-item" onClick={() => handleStub('Clone')}>
              <i className="bi bi-copy me-2" aria-hidden="true" />
              Clone
            </button>
          </li>
          {canCancelPrescription && (
            <li>
              <button
                type="button"
                className="dropdown-item text-danger"
                disabled={!isCancellable}
                title={isCancellable ? undefined : 'This prescription can no longer be cancelled'}
                onClick={() => {
                  setIsOpen(false);
                  onCancelPrescription(prescription.prescriptionId);
                }}
              >
                <i className="bi bi-x-circle me-2" aria-hidden="true" />
                Cancel
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function PrescriptionGrid({
  prescriptions,
  isLoading,
  hasLoadedOnce,
  error,
  onRetry,
  sortBy,
  sortDirection,
  onSort,
  hasActiveFilters,
  onClearFilters,
  page,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) {
  const { showSuccess } = useNotification();

  const [reprintTargetId, setReprintTargetId] = useState(null);
  const [previewXhtml, setPreviewXhtml] = useState(null);
  const [autoPrint, setAutoPrint] = useState(false);
  const [renewTargetId, setRenewTargetId] = useState(null);
  const [renewalResult, setRenewalResult] = useState(null);
  const [cancelTargetId, setCancelTargetId] = useState(null);

  const columnCount = COLUMNS.length + 1;

  // Same reuse-not-regenerate flow as PrescriptionDetailsPage's own Reprint handling -
  // the dialog already fetched the prescription (including Xhtml) to build its own
  // display, so this only ever hands that same data to PrescriptionPreviewModal.
  function handleReprinted({ xhtml, autoPrint: shouldAutoPrint }) {
    setReprintTargetId(null);
    setPreviewXhtml(xhtml);
    setAutoPrint(shouldAutoPrint);
  }

  // Renewal creates a brand-new Draft prescription elsewhere in the table - it doesn't
  // change the row that was clicked, so unlike Reprint there's no in-place row data to
  // refresh here; the summary dialog's own "Go to Draft" link is how the user reaches it.
  function handleRenewed(result) {
    setRenewTargetId(null);
    setRenewalResult(result);
  }

  // Unlike Renew (which creates a brand-new, separately-numbered draft elsewhere in the
  // table), Cancel changes the clicked row's own status - onRetry (already wired to
  // fetchPrescriptions({ bypassCache: true }) by the List page) is reused here to refresh
  // the grid so the row's status badge reflects CANCELLED immediately.
  function handleCancelled() {
    setCancelTargetId(null);
    showSuccess('Prescription cancelled successfully.');
    onRetry();
  }

  const showSkeleton = isLoading && !hasLoadedOnce;
  const showRefreshOverlay = isLoading && hasLoadedOnce;

  function handleHeaderKeyDown(event, column) {
    if (!column.sortable) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSort(column.key);
    }
  }

  function ariaSortFor(column) {
    if (!column.sortable || sortBy !== column.key) {
      return 'none';
    }
    return sortDirection === 'asc' ? 'ascending' : 'descending';
  }

  return (
    <div className="card border-0 shadow-sm rounded-3">
      <div className="visually-hidden" aria-live="polite" role="status">
        {showSkeleton && 'Loading prescriptions…'}
        {showRefreshOverlay && 'Refreshing prescription list…'}
        {!isLoading && error && `Error loading prescriptions: ${error}`}
        {!isLoading && !error && `Showing ${prescriptions.length} of ${totalCount} prescriptions.`}
      </div>

      <div className="position-relative">
        {showRefreshOverlay && (
          <div
            className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)', zIndex: 2 }}
          >
            <span className="spinner-border text-primary" aria-hidden="true" />
          </div>
        )}

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <caption className="visually-hidden">List of prescriptions, sortable and paginated</caption>
            <thead className="table-light">
              <tr>
                {COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    role={column.sortable ? 'button' : undefined}
                    tabIndex={column.sortable ? 0 : undefined}
                    onClick={column.sortable ? () => onSort(column.key) : undefined}
                    onKeyDown={(event) => handleHeaderKeyDown(event, column)}
                    aria-sort={ariaSortFor(column)}
                    className={column.sortable ? 'user-select-none' : undefined}
                    style={column.sortable ? { cursor: 'pointer' } : undefined}
                  >
                    {column.label}
                    {column.sortable && sortBy === column.key && (
                      <i
                        className={`bi ${sortDirection === 'asc' ? 'bi-caret-up-fill' : 'bi-caret-down-fill'} ms-1 small`}
                        aria-hidden="true"
                      />
                    )}
                  </th>
                ))}
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {showSkeleton && <SkeletonRows columnCount={columnCount} />}

              {!isLoading && error && (
                <tr>
                  <td colSpan={columnCount} className="text-center py-5">
                    <i className="bi bi-exclamation-triangle text-danger me-2" aria-hidden="true" />
                    <span className="text-danger">{error}</span>
                    <div className="mt-3">
                      <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onRetry}>
                        <i className="bi bi-arrow-clockwise me-1" aria-hidden="true" />
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {!showSkeleton && !error && prescriptions.length === 0 && (
                <tr>
                  <td colSpan={columnCount} className="text-center text-muted py-5">
                    <div className="mb-2">No prescriptions found.</div>
                    <div className="d-flex justify-content-center gap-2">
                      <a href="/patients" className="btn btn-primary btn-sm">
                        Create Prescription
                      </a>
                      {hasActiveFilters && (
                        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClearFilters}>
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {!showSkeleton &&
                !error &&
                prescriptions.map((prescription) => (
                  <tr key={prescription.prescriptionId}>
                    <td>{prescription.prescriptionNumber}</td>
                    <td>{prescription.patientName}</td>
                    <td>{prescription.nhiNumber || '—'}</td>
                    <td>{prescription.providerName}</td>
                    <td>{formatDate(prescription.issueDate)}</td>
                    <td>{formatDate(prescription.expiryDate)}</td>
                    <td>{prescription.medicationCount}</td>
                    <td>
                      <PrescriptionStatusBadge status={prescription.status} />
                    </td>
                    <td>{prescription.versionNumber ?? '—'}</td>
                    <td>{prescription.createdBy}</td>
                    <td>{formatDate(prescription.createdDate)}</td>
                    <td>
                      <RowActionsMenu
                        prescription={prescription}
                        onReprint={setReprintTargetId}
                        onRenew={setRenewTargetId}
                        onCancelPrescription={setCancelTargetId}
                      />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {!showSkeleton && !error && prescriptions.length > 0 && (
        <div className="card-footer bg-white border-0 d-flex flex-wrap justify-content-between align-items-center gap-2 py-3">
          <div className="d-flex align-items-center gap-3">
            <span className="text-muted small">
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount} · Page{' '}
              {page} of {totalPages}
            </span>

            <div className="d-flex align-items-center gap-1">
              <label htmlFor="prescriptionPageSizeSelect" className="form-label small text-muted mb-0">
                Rows per page
              </label>
              <select
                id="prescriptionPageSizeSelect"
                className="form-select form-select-sm w-auto"
                value={pageSize}
                onChange={(event) => onPageSizeChange(Number(event.target.value))}
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <nav aria-label="Prescription list pagination">
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                <button type="button" className="page-link" onClick={() => onPageChange(1)} aria-label="First page" disabled={page === 1}>
                  First
                </button>
              </li>
              <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                <button
                  type="button"
                  className="page-link"
                  onClick={() => onPageChange(page - 1)}
                  aria-label="Previous page"
                  disabled={page === 1}
                >
                  Previous
                </button>
              </li>
              <li className="page-item active">
                <span className="page-link" aria-current="page">
                  {page}
                </span>
              </li>
              <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                <button
                  type="button"
                  className="page-link"
                  onClick={() => onPageChange(page + 1)}
                  aria-label="Next page"
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </li>
              <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                <button
                  type="button"
                  className="page-link"
                  onClick={() => onPageChange(totalPages)}
                  aria-label="Last page"
                  disabled={page === totalPages}
                >
                  Last
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}

      <PrescriptionReprintDialog
        show={Boolean(reprintTargetId)}
        prescriptionId={reprintTargetId}
        onReprinted={handleReprinted}
        onClose={() => setReprintTargetId(null)}
      />

      <PrescriptionPreviewModal
        show={Boolean(previewXhtml)}
        xhtml={previewXhtml}
        autoPrint={autoPrint}
        onClose={() => setPreviewXhtml(null)}
      />

      <PrescriptionRenewalDialog
        show={Boolean(renewTargetId)}
        prescriptionId={renewTargetId}
        onRenewed={handleRenewed}
        onClose={() => setRenewTargetId(null)}
      />

      {renewalResult && <PrescriptionRenewalSummary result={renewalResult} onClose={() => setRenewalResult(null)} />}

      <PrescriptionCancellationDialog
        show={Boolean(cancelTargetId)}
        prescriptionId={cancelTargetId}
        onCancelled={handleCancelled}
        onClose={() => setCancelTargetId(null)}
      />
    </div>
  );
}

export default PrescriptionGrid;
