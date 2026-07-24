import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer.jsx';
import PrescriptionSummaryCard from '../../components/prescriptionManagement/PrescriptionSummaryCard.jsx';
import PrescriptionPatientCard from '../../components/prescriptionManagement/PrescriptionPatientCard.jsx';
import PrescriptionProviderCard from '../../components/prescriptionManagement/PrescriptionProviderCard.jsx';
import PrescriptionMedicationGrid from '../../components/prescriptionManagement/PrescriptionMedicationGrid.jsx';
import PrescriptionTimeline from '../../components/prescriptionManagement/PrescriptionTimeline.jsx';
import PrescriptionAuditCard from '../../components/prescriptionManagement/PrescriptionAuditCard.jsx';
import PrescriptionActionToolbar from '../../components/prescriptionManagement/PrescriptionActionToolbar.jsx';
import PrescriptionPreviewModal from '../../components/prescriptionManagement/PrescriptionPreviewModal.jsx';
import PrescriptionReprintDialog from '../../components/prescriptionManagement/PrescriptionReprintDialog.jsx';
import PrescriptionRelationshipCard from '../../components/prescriptionManagement/PrescriptionRelationshipCard.jsx';
import PrescriptionRenewalDialog from '../../components/prescriptionManagement/PrescriptionRenewalDialog.jsx';
import PrescriptionRenewalSummary from '../../components/prescriptionManagement/PrescriptionRenewalSummary.jsx';
import PrescriptionCancellationDialog from '../../components/prescriptionManagement/PrescriptionCancellationDialog.jsx';
import PrescriptionVersionHistoryDialog from '../../components/patientManagement/PrescriptionVersionHistoryDialog.jsx';
import PrescriptionFinalizeConfirmDialog from '../../components/patientManagement/PrescriptionFinalizeConfirmDialog.jsx';
import {
  getPrescriptionDetails,
  downloadPrescriptionPdf,
  getOriginatingPatientMedications,
  finalizePrescription,
} from '../../api/prescriptionApi.js';
import { parseApiError } from '../../api/parseApiError.js';
import { useNotification } from '../../components/notifications/NotificationContext.jsx';

function SummarySkeleton() {
  return (
    <div className="card border-0 shadow-sm rounded-3 mb-3" aria-hidden="true">
      <div className="card-body">
        <div className="row g-3">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="col-6 col-md-3">
              <span className="placeholder col-8 mb-1 d-block" />
              <span className="placeholder col-6 d-block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Read-only clinical view - "all users should navigate here before performing any
// action" (this feature's own framing). Fetches once via GET /api/prescriptions/{id};
// there is no polling/live-refresh, matching every other detail page in this project
// (PatientDetailsPage, MedicineDetailsPage).
function PrescriptionDetailsPage() {
  const { prescriptionId } = useParams();
  const { showSuccess, showWarning, showError } = useNotification();

  const [prescription, setPrescription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isNotFound, setIsNotFound] = useState(false);

  const [showPreview, setShowPreview] = useState(false);
  const [autoPrint, setAutoPrint] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [showReprintDialog, setShowReprintDialog] = useState(false);

  // Prescription Renewal
  const [showRenewalDialog, setShowRenewalDialog] = useState(false);
  const [renewalResult, setRenewalResult] = useState(null);

  // Finalize - reuses the Step 18.8 confirm dialog + API verbatim; this page never had
  // an entry point for either before Renewal's own workflow required completing
  // "...Finalize" for a renewed draft.
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Entire Prescription Cancellation
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Patient Medication and Prescription Synchronization: loaded independently of the
  // main prescription fetch (its own endpoint, own loading/error state) - a slower or
  // failing call here must not block the rest of the page.
  const [originatingMedications, setOriginatingMedications] = useState(null);
  const [isLoadingOriginating, setIsLoadingOriginating] = useState(true);
  const [originatingError, setOriginatingError] = useState('');

  // background=true (used after Restore/Reprint) skips the isLoading toggle - the page's
  // own top-level `if (isLoading)` early-return would otherwise unmount everything below
  // it, including whatever dialog/modal is open at that moment (PrescriptionVersionHistoryDialog
  // after a Restore, PrescriptionPreviewModal after a Reprint) - a real bug this step's
  // Reprint flow surfaced, fixed here rather than worked around.
  const fetchDetails = useCallback(
    async ({ background = false } = {}) => {
      if (!background) {
        setIsLoading(true);
      }
      setError('');
      setIsNotFound(false);

      try {
        const result = await getPrescriptionDetails(prescriptionId);
        setPrescription(result);
      } catch (fetchError) {
        if (fetchError?.response?.status === 404) {
          setIsNotFound(true);
        } else {
          const { generalMessage } = parseApiError(fetchError);
          setError(generalMessage || 'Unable to load this prescription. Please try again.');
        }
      } finally {
        if (!background) {
          setIsLoading(false);
        }
      }
    },
    [prescriptionId],
  );

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const loadOriginatingMedications = useCallback(async () => {
    setIsLoadingOriginating(true);
    setOriginatingError('');

    try {
      const result = await getOriginatingPatientMedications(prescriptionId);
      setOriginatingMedications(result);
    } catch (originatingFetchError) {
      const { generalMessage } = parseApiError(originatingFetchError);
      setOriginatingError(generalMessage || 'Unable to load the originating patient medication. Please try again.');
    } finally {
      setIsLoadingOriginating(false);
    }
  }, [prescriptionId]);

  useEffect(() => {
    loadOriginatingMedications();
  }, [loadOriginatingMedications]);

  function handlePreview() {
    setAutoPrint(false);
    setShowPreview(true);
  }

  function handlePrint() {
    setAutoPrint(true);
    setShowPreview(true);
  }

  async function handleDownloadPdf() {
    if (isDownloadingPdf || !prescription) {
      return;
    }

    setIsDownloadingPdf(true);

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
      setIsDownloadingPdf(false);
    }
  }

  function handleStub(label) {
    showWarning(`${label} will be available in a future release.`);
  }

  function handleRestored() {
    // Restoring a version changes the live prescription's content/version - reload the
    // full detail so every card (Summary/Medications/Timeline/Audit) reflects it, rather
    // than patching individual fields client-side.
    fetchDetails({ background: true });
  }

  // The dialog already fetched its own (fresh) copy of the prescription, including
  // Xhtml, to build its display - reused directly here to drive the print, so "the
  // original XHTML must be reused, not regenerated" holds even at this final step (no
  // separate Xhtml fetch, no HTML built in React). autoPrint mirrors handlePrint's own
  // strategy: only skip straight to printing when the user didn't ask to preview first.
  // A background refresh runs alongside so PrintCount/Timeline reflect the reprint
  // without disturbing the preview/print that's already underway.
  function handleReprinted({ xhtml, autoPrint: shouldAutoPrint }) {
    setShowReprintDialog(false);
    setAutoPrint(shouldAutoPrint);
    setPrescription((current) => ({ ...current, xhtml }));
    setShowPreview(true);
    fetchDetails({ background: true });
  }

  // The renewed prescription is a brand-new Prescription (different id) - the original
  // this page is showing is genuinely untouched, so a background refresh here only
  // exists to pick up the new "Prescription Renewed" Timeline entry, not because
  // anything about the current prescription's own data changed.
  function handleRenewed(result) {
    setShowRenewalDialog(false);
    setRenewalResult(result);
    fetchDetails({ background: true });
  }

  async function handleConfirmFinalize() {
    if (isFinalizing || !prescription) {
      return;
    }

    setIsFinalizing(true);

    try {
      await finalizePrescription(prescription.prescriptionId);
      setShowFinalizeConfirm(false);
      showSuccess('Prescription finalized successfully.');
      await fetchDetails({ background: true });
    } catch (finalizeError) {
      const { generalMessage } = parseApiError(finalizeError);
      showError(generalMessage || 'Unable to finalize this prescription. Please try again.');
    } finally {
      setIsFinalizing(false);
    }
  }

  // The dialog already performed the cancellation server-side (status -> CANCELLED, every
  // active item -> CANCELLED) - a background refresh here picks up the new status badge,
  // the updated Medication Grid, and the new "Prescription Cancelled" Timeline entry.
  function handleCancelled() {
    setShowCancelDialog(false);
    showSuccess('Prescription cancelled successfully.');
    fetchDetails({ background: true });
  }

  if (isLoading) {
    return (
      <PageContainer title="Prescription Details">
        <SummarySkeleton />
      </PageContainer>
    );
  }

  if (isNotFound) {
    return (
      <PageContainer title="Prescription Details">
        <div className="text-center py-5">
          <i className="bi bi-file-earmark-excel display-4 text-muted" aria-hidden="true" />
          <p className="text-muted mt-3 mb-3">Prescription not found.</p>
          <Link to="/prescriptions" className="btn btn-outline-secondary">
            Back to List
          </Link>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Prescription Details">
        <div className="text-center py-5">
          <i className="bi bi-exclamation-triangle display-4 text-danger" aria-hidden="true" />
          <p className="text-danger mt-3 mb-3">{error}</p>
          <button type="button" className="btn btn-outline-secondary" onClick={fetchDetails}>
            <i className="bi bi-arrow-clockwise me-1" aria-hidden="true" />
            Retry
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title={`Prescription ${prescription.prescriptionNumber}`}>
      <PrescriptionActionToolbar
        prescription={prescription}
        onPreview={handlePreview}
        onPrint={handlePrint}
        onDownloadPdf={handleDownloadPdf}
        isDownloadingPdf={isDownloadingPdf}
        onViewHistory={() => setShowVersionHistory(true)}
        onReprint={() => setShowReprintDialog(true)}
        onRenew={() => setShowRenewalDialog(true)}
        onFinalize={() => setShowFinalizeConfirm(true)}
        onClone={() => handleStub('Clone')}
        onCancel={() => setShowCancelDialog(true)}
      />

      <PrescriptionSummaryCard prescription={prescription} />
      <PrescriptionPatientCard patient={prescription.patient} />
      <PrescriptionProviderCard provider={prescription.provider} />
      <PrescriptionMedicationGrid medications={prescription.medications} />

      <PrescriptionRelationshipCard
        medications={originatingMedications}
        patientId={prescription.patient?.patientId}
        isLoading={isLoadingOriginating}
        error={originatingError}
        onRetry={loadOriginatingMedications}
      />

      {prescription.clinicalNotes && (
        <div className="card border-0 shadow-sm rounded-3 mb-3">
          <div className="card-header bg-white border-0 pt-3">
            <h2 className="h6 mb-0">Clinical Information</h2>
          </div>
          <div className="card-body">
            <div className="text-muted small">Clinical Notes</div>
            <p className="mb-0">{prescription.clinicalNotes}</p>
          </div>
        </div>
      )}

      <PrescriptionTimeline events={prescription.timeline} />
      <PrescriptionAuditCard prescription={prescription} />

      <PrescriptionPreviewModal
        show={showPreview}
        xhtml={prescription.xhtml}
        autoPrint={autoPrint}
        onClose={() => setShowPreview(false)}
      />

      <PrescriptionVersionHistoryDialog
        show={showVersionHistory}
        prescriptionId={prescription.prescriptionId}
        currentVersionNumber={prescription.versionNumber}
        onRestored={handleRestored}
        onClose={() => setShowVersionHistory(false)}
      />

      <PrescriptionReprintDialog
        show={showReprintDialog}
        prescriptionId={prescription.prescriptionId}
        onReprinted={handleReprinted}
        onClose={() => setShowReprintDialog(false)}
      />

      <PrescriptionRenewalDialog
        show={showRenewalDialog}
        prescriptionId={prescription.prescriptionId}
        onRenewed={handleRenewed}
        onClose={() => setShowRenewalDialog(false)}
      />

      {renewalResult && <PrescriptionRenewalSummary result={renewalResult} onClose={() => setRenewalResult(null)} />}

      <PrescriptionFinalizeConfirmDialog
        show={showFinalizeConfirm}
        patientName={prescription.patient?.fullName}
        prescriptionNumber={prescription.prescriptionNumber}
        medicationCount={prescription.medicationCount}
        issueDate={prescription.issueDate}
        expiryDate={prescription.expiryDate}
        isFinalizing={isFinalizing}
        onConfirm={handleConfirmFinalize}
        onCancel={() => setShowFinalizeConfirm(false)}
      />

      <PrescriptionCancellationDialog
        show={showCancelDialog}
        prescriptionId={prescription.prescriptionId}
        onCancelled={handleCancelled}
        onClose={() => setShowCancelDialog(false)}
      />
    </PageContainer>
  );
}

export default PrescriptionDetailsPage;
