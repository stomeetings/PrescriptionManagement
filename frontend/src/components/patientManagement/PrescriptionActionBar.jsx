import { forwardRef } from 'react';

// Button row for the Prescription Preview dialog. Print (Step 18.3), Save Draft (Step
// 18.4), Download PDF (Step 18.6), Edit Prescription (Step 18.7's real minimal Clinical
// Notes edit), Version History (Step 18.7), and Finalize (Step 18.8) are all real. Print
// is disabled while the XHTML is still loading or a preview generation/refresh is in
// progress; Save Draft is additionally disabled once this exact draft has already been
// saved (isSaveDraftDisabled), preventing a duplicate submission beyond the
// isSavingDraft in-flight guard alone; Download PDF/Edit Prescription/Version History/
// Finalize are all disabled until a save has actually succeeded (isDownloadDisabled/
// isEditDisabled/isVersionHistoryDisabled/isFinalizeDisabled) - each backend endpoint
// addresses a persisted Prescription id that doesn't exist before then. Once finalized
// (isFinalized), Edit/Save Draft lock out and the Finalize button is replaced by a
// disabled "Send to NZePS" placeholder (Step 18.8's own "future" stub, matching this
// project's established stub-button precedent). canFinalize hides the Finalize button
// entirely for a Pharmacist/Receptionist - defensive, since the backend is the real
// authority (Admin+Doctor only), matching PrescriptionVersionHistoryDialog's identical
// role-gating approach for Restore. Forwards a ref to the Print <button> so the parent
// dialog can restore focus to it after the browser's print dialog closes.
const PrescriptionActionBar = forwardRef(function PrescriptionActionBar(
  {
    onPrint,
    onSaveDraft,
    onDownloadPdf,
    onEditPrescription,
    onViewHistory,
    onFinalize,
    onRefreshPreview,
    onClose,
    isRefreshing,
    isPrinting,
    isPrintDisabled,
    isSavingDraft,
    isSaveDraftDisabled,
    isDownloadingPdf,
    isDownloadDisabled,
    isEditDisabled,
    isVersionHistoryDisabled,
    isFinalizing,
    isFinalizeDisabled,
    isFinalized,
    canFinalize,
    isBusy,
  },
  printButtonRef,
) {
  return (
    <div className="d-flex flex-wrap gap-2 justify-content-end px-3 py-2 border-top bg-light">
      <button type="button" className="btn btn-outline-secondary" onClick={onRefreshPreview} disabled={isBusy}>
        {isRefreshing ? (
          <span className="spinner-border spinner-border-sm me-1" aria-hidden="true" />
        ) : (
          <i className="bi bi-arrow-clockwise me-1" aria-hidden="true" />
        )}
        Refresh Preview
      </button>
      <button
        type="button"
        className="btn btn-outline-secondary"
        onClick={onEditPrescription}
        disabled={isBusy || isEditDisabled || isFinalized}
        title={isFinalized ? 'A finalized prescription cannot be edited' : isEditDisabled ? 'Save the draft before editing it' : 'Edit Clinical Notes'}
      >
        <i className="bi bi-pencil me-1" aria-hidden="true" />
        Edit Prescription
      </button>
      <button
        type="button"
        className="btn btn-outline-secondary"
        onClick={onViewHistory}
        disabled={isBusy || isVersionHistoryDisabled}
        title={isVersionHistoryDisabled ? 'Save the draft to see its version history' : 'View version history'}
      >
        <i className="bi bi-clock-history me-1" aria-hidden="true" />
        Version History
      </button>
      <button
        ref={printButtonRef}
        type="button"
        className="btn btn-outline-primary"
        onClick={onPrint}
        disabled={isBusy || isPrintDisabled}
        aria-label="Print prescription (Ctrl+P)"
        title="Print (Ctrl+P)"
      >
        {isPrinting ? (
          <span className="spinner-border spinner-border-sm me-1" aria-hidden="true" />
        ) : (
          <i className="bi bi-printer me-1" aria-hidden="true" />
        )}
        Print
      </button>
      <button
        type="button"
        className="btn btn-outline-primary"
        onClick={onDownloadPdf}
        disabled={isBusy || isDownloadingPdf || isDownloadDisabled}
        aria-label="Download prescription PDF"
        title={isDownloadDisabled ? 'Save the draft before downloading a PDF' : 'Download PDF'}
      >
        {isDownloadingPdf ? (
          <span className="spinner-border spinner-border-sm me-1" aria-hidden="true" />
        ) : (
          <i className="bi bi-file-earmark-pdf me-1" aria-hidden="true" />
        )}
        Download PDF
      </button>
      <button
        type="button"
        className="btn btn-success"
        onClick={onSaveDraft}
        disabled={isBusy || isSavingDraft || isSaveDraftDisabled || isFinalized}
        aria-label="Save prescription draft"
      >
        {isSavingDraft ? (
          <span className="spinner-border spinner-border-sm me-1" aria-hidden="true" />
        ) : (
          <i className="bi bi-save me-1" aria-hidden="true" />
        )}
        Save Draft
      </button>
      {isFinalized ? (
        <button
          type="button"
          className="btn btn-outline-secondary"
          disabled
          title="Send to NZePS will be available in a future release"
        >
          <i className="bi bi-send me-1" aria-hidden="true" />
          Send to NZePS
        </button>
      ) : (
        canFinalize && (
          <button
            type="button"
            className="btn btn-warning"
            onClick={onFinalize}
            disabled={isBusy || isFinalizing || isFinalizeDisabled}
            title={isFinalizeDisabled ? 'Save the draft before finalizing it' : 'Finalize this prescription'}
          >
            {isFinalizing ? (
              <span className="spinner-border spinner-border-sm me-1" aria-hidden="true" />
            ) : (
              <i className="bi bi-check2-circle me-1" aria-hidden="true" />
            )}
            Finalize Prescription
          </button>
        )
      )}
      <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={isBusy}>
        Close
      </button>
    </div>
  );
});

export default PrescriptionActionBar;
