import { useCallback, useEffect, useRef, useState } from 'react';
import PrescriptionToolbar from './PrescriptionToolbar.jsx';
import PrescriptionPreviewFrame from './PrescriptionPreviewFrame.jsx';
import PrescriptionActionBar from './PrescriptionActionBar.jsx';
import PrescriptionVersionHistoryDialog from './PrescriptionVersionHistoryDialog.jsx';
import PrescriptionFinalizeConfirmDialog from './PrescriptionFinalizeConfirmDialog.jsx';
import { useNotification } from '../notifications/NotificationContext.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';
import { ROLES } from '../../auth/roles.js';
import {
  saveDraftPrescription,
  downloadPrescriptionPdf,
  updateDraftPrescription,
  finalizePrescription,
} from '../../api/prescriptionApi.js';
import { parseApiError } from '../../api/parseApiError.js';

// axios' responseType: 'blob' applies to error responses too - a 404/422 ProblemDetails
// body arrives as a Blob, not parsed JSON, so parseApiError (which expects
// error.response.data to already be an object) can't read it directly. Re-reads the
// blob as text/JSON first when that's what happened; falls back to parseApiError's own
// generic-message behavior for anything else (e.g. a genuine network failure, which has
// no response body at all).
async function parseBlobApiError(error) {
  const data = error?.response?.data;

  if (data instanceof Blob && data.type === 'application/problem+json') {
    try {
      const text = await data.text();
      return parseApiError({ response: { ...error.response, data: JSON.parse(text) } });
    } catch {
      // Fall through to the generic handling below if the blob wasn't valid JSON.
    }
  }

  return parseApiError(error);
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

// Large modal shell for previewing a generated prescription draft. Bootstrap's .modal
// visuals via plain React state (no bootstrap.bundle.js), matching ConfirmDialog/
// PatientMedicationStopDialog's established precedent - only the sizing (95% x 95%,
// toggleable to 100% x 100% "maximized") and focus-trapping/ESC handling below are new,
// since no prior dialog in this project needed them.
function PrescriptionPreviewDialog({
  show,
  draft,
  isLoading,
  isRefreshing,
  error,
  onRefreshPreview,
  onClose,
}) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFrameReady, setIsFrameReady] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [savedPrescriptionId, setSavedPrescriptionId] = useState(null);
  const [savedPrescriptionNumber, setSavedPrescriptionNumber] = useState(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Step 18.7's real minimal Edit: rowVersion/versionNumber are only meaningful once a
  // draft has actually been saved (Save Draft always seeds Version 1) - both are
  // refreshed after every successful Save Draft/Edit/Restore, since each one changes the
  // live row's RowVersion. isEditingNotes drives an inline Clinical Notes editor rather
  // than a separate dialog - this step deliberately stays short of the full Prescription
  // Editor (medication grid, add/remove/replace dialogs, warnings panel).
  const [rowVersion, setRowVersion] = useState(null);
  const [versionNumber, setVersionNumber] = useState(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedClinicalNotes, setEditedClinicalNotes] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Step 18.8: statusDisplay tracks the badge shown in PrescriptionToolbar - it starts as
  // the pre-save placeholder string GeneratePrescriptionResponse returns, then switches
  // to the real persisted PrescriptionStatusResponse.displayText after Save Draft/
  // Finalize (two different shapes upstream; this local state normalizes both to the one
  // string the toolbar renders). isFinalized gates the locked-state UI (Edit/Save Draft
  // disabled, Finalize replaced by a disabled "Send to NZePS" stub) - set only after a
  // real 200 from POST .../finalize, never inferred from status text alone.
  const [statusDisplay, setStatusDisplay] = useState(draft?.status);
  const [isFinalized, setIsFinalized] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const dialogRef = useRef(null);
  const previewFrameRef = useRef(null);
  const printButtonRef = useRef(null);
  const { showSuccess, showWarning, showError } = useNotification();
  const { hasRole } = useAuth();
  const canFinalize = hasRole(ROLES.SYSTEM_ADMINISTRATOR, ROLES.DOCTOR);

  // A fresh draft (new generation, or an explicit Refresh Preview) always carries a new
  // draftPrescriptionId - any "already saved" state from a previous draft no longer
  // applies to it. Download PDF is only meaningful once a draft has actually been
  // persisted (the endpoint addresses a real, saved Prescription id, not the transient
  // draftPrescriptionId), so it resets alongside the save state.
  useEffect(() => {
    setSavedPrescriptionId(null);
    setSavedPrescriptionNumber(null);
    setRowVersion(null);
    setVersionNumber(null);
    setIsEditingNotes(false);
    setShowVersionHistory(false);
    setStatusDisplay(draft?.status);
    setIsFinalized(false);
    setShowFinalizeConfirm(false);
  }, [draft?.draftPrescriptionId]);

  // Prevents duplicate submissions two ways: the button disables itself for the whole
  // isSavingDraft window (guards a fast double-click before React even re-renders), and
  // once a save succeeds, Save Draft stays disabled for this same draft afterward (see
  // isPrintDisabled-style prop below) - only a Refresh Preview (a new draftPrescriptionId)
  // re-enables it, since the backend's own UQ_Prescription_DraftPrescriptionId
  // constraint would reject a genuine second submission anyway.
  async function handleSaveDraft() {
    if (isSavingDraft || savedPrescriptionNumber || !draft) {
      return;
    }

    setIsSavingDraft(true);

    try {
      const result = await saveDraftPrescription({
        draftPrescriptionId: draft.draftPrescriptionId,
        patientId: draft.patient?.patientId,
        xhtml: draft.xhtml,
        selectedPatientMedicationIds: (draft.selectedMedicines || []).map((medicine) => medicine.patientMedicationId),
        clinicalNotes: draft.clinicalNotes,
      });

      setSavedPrescriptionId(result.prescriptionId);
      setSavedPrescriptionNumber(result.prescriptionNumber);
      setRowVersion(result.rowVersion);
      setVersionNumber(1); // usp_Prescription_CreateDraft always seeds Version 1 in the same transaction.
      setStatusDisplay(result.status?.displayText);
      showSuccess(`Draft saved successfully. Draft Number: ${result.prescriptionNumber}`);
    } catch (saveError) {
      const { generalMessage } = parseApiError(saveError);
      showError(generalMessage || 'Unable to save this prescription draft. Please try again.');
    } finally {
      setIsSavingDraft(false);
    }
  }

  // Save Draft must have already persisted a real Prescription id (the PUT endpoint
  // addresses that, not the transient draftPrescriptionId) - guarded the same way
  // Download PDF already is.
  function handleEditPrescription() {
    if (!savedPrescriptionId) {
      showWarning('Save the draft before editing it.');
      return;
    }

    setEditedClinicalNotes(draft?.clinicalNotes || '');
    setIsEditingNotes(true);
  }

  // This edit only changes Clinical Notes/the medication set - the XHTML document itself
  // is resent unchanged (regenerating it from an edited Clinical Notes string is the full
  // Prescription Editor's job, explicitly out of scope here). Each successful edit
  // creates a brand-new PrescriptionVersion server-side; rowVersion/versionNumber are
  // refreshed from the response so the *next* edit (or a Restore) doesn't hit a stale
  // 409.
  async function handleSaveEdit() {
    if (isSavingEdit || !savedPrescriptionId || !rowVersion) {
      return;
    }

    setIsSavingEdit(true);

    try {
      const result = await updateDraftPrescription(savedPrescriptionId, {
        xhtml: draft.xhtml,
        selectedPatientMedicationIds: (draft.selectedMedicines || []).map((medicine) => medicine.patientMedicationId),
        clinicalNotes: editedClinicalNotes,
        rowVersion,
      });

      setRowVersion(result.rowVersion);
      setVersionNumber(result.versionNumber);
      setIsEditingNotes(false);
      showSuccess(`Changes saved as Version ${result.versionNumber}.`);
    } catch (editError) {
      const { generalMessage } = parseApiError(editError);
      showError(generalMessage || 'Unable to save these changes. Please try again.');
    } finally {
      setIsSavingEdit(false);
    }
  }

  function handleViewHistory() {
    if (!savedPrescriptionId) {
      showWarning('Save the draft to see its version history.');
      return;
    }

    setShowVersionHistory(true);
  }

  // Restore creates a brand-new version (never overwrites history) and changes the live
  // row's RowVersion even though it doesn't check the caller's own cached value - so the
  // *next* edit needs this refreshed copy, not the pre-restore one.
  function handleRestored(result) {
    setRowVersion(result.rowVersion);
    setVersionNumber(result.versionNumber);
  }

  function handleFinalizeClick() {
    if (!savedPrescriptionId) {
      showWarning('Save the draft before finalizing it.');
      return;
    }

    setShowFinalizeConfirm(true);
  }

  // The backend is the sole authority on every finalize validation (patient/provider
  // active, medications active/no duplicates/directions complete, dates valid, not
  // already finalized) - this only calls the API and reflects whatever it decides. On
  // success there is no separate "reload" round trip: the finalize response already
  // carries everything the locked-state UI needs (Status, FinalizedDate/By).
  async function handleConfirmFinalize() {
    if (isFinalizing || !savedPrescriptionId) {
      return;
    }

    setIsFinalizing(true);

    try {
      const result = await finalizePrescription(savedPrescriptionId);
      setStatusDisplay(result.status?.displayText);
      setIsFinalized(true);
      setShowFinalizeConfirm(false);
      setIsEditingNotes(false);
      showSuccess('Prescription finalized successfully.');
    } catch (finalizeError) {
      const { generalMessage } = parseApiError(finalizeError);
      showError(generalMessage || 'Unable to finalize this prescription. Please try again.');
    } finally {
      setIsFinalizing(false);
    }
  }

  // Download PDF is only enabled once this draft has actually been saved
  // (isSaveDraftDisabled-style gating in the ActionBar below) - the backend endpoint
  // addresses a persisted Prescription id, which only exists after Save Draft succeeds.
  async function handleDownloadPdf() {
    if (isDownloadingPdf || !savedPrescriptionId) {
      return;
    }

    setIsDownloadingPdf(true);

    try {
      const pdfBlob = await downloadPrescriptionPdf(savedPrescriptionId);

      // Browser download via a temporary, invisible <a download>, rather than
      // navigating the page - the standard, script-only (no server round trip beyond
      // the one API call) way to save a Blob response to disk.
      const objectUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${savedPrescriptionNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (downloadError) {
      const { generalMessage } = await parseBlobApiError(downloadError);
      showError(generalMessage || 'Unable to generate the prescription PDF. Please try again.');
    } finally {
      setIsDownloadingPdf(false);
    }
  }

  // Step 18.3's printing strategy, driven entirely by PrescriptionPreviewFrame's
  // imperative print() (see that file's own comments): this function only decides
  // *when* it's safe to call it and turns whatever goes wrong into a friendly
  // notification. It never touches srcDoc, never re-requests the draft, and never
  // builds/modifies HTML - the iframe already holds the exact XHTML the backend
  // returned, untouched.
  const handlePrint = useCallback(() => {
    if (!isFrameReady || isLoading || isRefreshing) {
      showWarning('The prescription preview is still loading - please wait before printing.');
      return;
    }

    setIsPrinting(true);

    try {
      previewFrameRef.current?.print();
    } catch (printError) {
      if (printError?.message === 'IFRAME_NOT_READY') {
        showWarning('The prescription preview is still loading - please wait before printing.');
      } else {
        // Covers "browser blocks printing" (a popup/print blocker denying the call) and
        // any other unexpected failure - window.print()/contentWindow.print() give no
        // structured error info, so this is necessarily a generic message.
        showError('Unable to open the print dialog. Check your browser settings and try again.');
      }
    } finally {
      setIsPrinting(false);
      // Focus management after printing (Step 18.3's own requirement) - most browsers
      // return control to the host page as soon as the print dialog is dismissed
      // (accepted or cancelled); there is no standard, cross-browser event that
      // distinguishes "user printed" from "user cancelled" for window.print(), so this
      // same refocus runs either way.
      printButtonRef.current?.focus();
    }
  }, [isFrameReady, isLoading, isRefreshing, showWarning, showError]);

  useEffect(() => {
    if (!show) {
      return undefined;
    }

    // Focus the dialog itself on open (rather than assuming a specific child control
    // exists), then trap Tab/Shift+Tab within it, close on Escape, and intercept
    // Ctrl+P/Cmd+P so it prints the prescription (via the same handlePrint used by the
    // toolbar button) instead of the browser's native "print this page" (which would
    // print the whole React app, not the XHTML document).
    dialogRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        handlePrint();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // handlePrint is included deliberately, not omitted: it closes over isFrameReady/
    // isLoading/isRefreshing, so the listener must be re-bound whenever those change or
    // Ctrl+P would silently act on stale readiness state (e.g. still refusing to print
    // after the iframe has actually finished loading). Re-adding a keydown listener on
    // state change is cheap - this isn't a case where exhaustive-deps churn is worth
    // suppressing.
  }, [show, onClose, handlePrint]);

  if (!show) {
    return null;
  }

  const sizeClass = isMaximized ? 'w-100 h-100' : '';
  const sizeStyle = isMaximized ? {} : { width: '95vw', height: '95vh', maxWidth: '95vw' };

  return (
    <>
      <div
        className="modal d-block"
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prescriptionPreviewDialogTitle"
      >
        <div className={`modal-dialog modal-dialog-centered ${sizeClass}`} style={sizeStyle} role="document">
          <div className="modal-content h-100 d-flex flex-column" ref={dialogRef} tabIndex="-1">
            <div className="modal-header py-2">
              <h5 className="modal-title" id="prescriptionPreviewDialogTitle">
                Prescription Preview
              </h5>
              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setIsMaximized((current) => !current)}
                  aria-label={isMaximized ? 'Restore dialog size' : 'Maximize dialog'}
                  title={isMaximized ? 'Restore' : 'Maximize'}
                >
                  <i className={`bi ${isMaximized ? 'bi-fullscreen-exit' : 'bi-arrows-fullscreen'}`} aria-hidden="true" />
                </button>
                <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
              </div>
            </div>

            {draft && (
              <PrescriptionToolbar
                prescriptionNumber={savedPrescriptionNumber || draft.prescriptionNumber}
                patientName={draft.patient?.fullName}
                providerName={draft.provider?.fullName}
                issueDate={draft.issueDate}
                status={statusDisplay}
              />
            )}

            {savedPrescriptionNumber && (
              <div className="alert alert-success d-flex align-items-center gap-2 mb-0 rounded-0" role="status">
                <i className="bi bi-check-circle-fill" aria-hidden="true" />
                Draft saved successfully. Draft Number: <strong>{savedPrescriptionNumber}</strong>
                {versionNumber && <span className="ms-2 text-muted">(Version {versionNumber})</span>}
              </div>
            )}

            {isEditingNotes && (
              <div className="px-3 py-2 border-bottom bg-white">
                <label htmlFor="prescriptionEditClinicalNotes" className="form-label small text-muted mb-1">
                  Clinical Notes
                </label>
                <textarea
                  id="prescriptionEditClinicalNotes"
                  className="form-control"
                  rows={3}
                  value={editedClinicalNotes}
                  onChange={(event) => setEditedClinicalNotes(event.target.value)}
                  disabled={isSavingEdit}
                />
                <div className="d-flex gap-2 mt-2">
                  <button type="button" className="btn btn-sm btn-primary" onClick={handleSaveEdit} disabled={isSavingEdit}>
                    {isSavingEdit ? <span className="spinner-border spinner-border-sm me-1" aria-hidden="true" /> : null}
                    Save Changes
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setIsEditingNotes(false)}
                    disabled={isSavingEdit}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="modal-body p-0 flex-grow-1" style={{ minHeight: 0 }}>
              <PrescriptionPreviewFrame
                ref={previewFrameRef}
                xhtml={draft?.xhtml}
                isLoading={isLoading}
                error={error}
                onRetry={onRefreshPreview}
                onReadyChange={setIsFrameReady}
              />
            </div>

            <PrescriptionActionBar
              ref={printButtonRef}
              onPrint={handlePrint}
              onSaveDraft={handleSaveDraft}
              onDownloadPdf={handleDownloadPdf}
              onEditPrescription={handleEditPrescription}
              onViewHistory={handleViewHistory}
              onFinalize={handleFinalizeClick}
              onRefreshPreview={onRefreshPreview}
              onClose={onClose}
              isRefreshing={isRefreshing}
              isPrinting={isPrinting}
              isPrintDisabled={!isFrameReady}
              isSavingDraft={isSavingDraft}
              isSaveDraftDisabled={!isFrameReady || Boolean(savedPrescriptionNumber)}
              isDownloadingPdf={isDownloadingPdf}
              isDownloadDisabled={!savedPrescriptionId}
              isEditDisabled={!savedPrescriptionId}
              isVersionHistoryDisabled={!savedPrescriptionId}
              isFinalizing={isFinalizing}
              isFinalizeDisabled={!savedPrescriptionId}
              isFinalized={isFinalized}
              canFinalize={canFinalize}
              isBusy={isLoading || isRefreshing}
            />
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />

      <PrescriptionVersionHistoryDialog
        show={showVersionHistory}
        prescriptionId={savedPrescriptionId}
        currentVersionNumber={versionNumber}
        onRestored={handleRestored}
        onClose={() => setShowVersionHistory(false)}
      />

      <PrescriptionFinalizeConfirmDialog
        show={showFinalizeConfirm}
        patientName={draft?.patient?.fullName}
        prescriptionNumber={savedPrescriptionNumber}
        medicationCount={(draft?.selectedMedicines || []).length}
        issueDate={draft?.issueDate}
        expiryDate={null}
        isFinalizing={isFinalizing}
        onConfirm={handleConfirmFinalize}
        onCancel={() => setShowFinalizeConfirm(false)}
      />
    </>
  );
}

export default PrescriptionPreviewDialog;
