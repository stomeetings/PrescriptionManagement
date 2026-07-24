import { useEffect, useRef, useState } from 'react';
import PrescriptionPreviewFrame from '../patientManagement/PrescriptionPreviewFrame.jsx';
import { useNotification } from '../notifications/NotificationContext.jsx';

// Read-only preview for the Details page's own Preview/Print actions - reuses
// PrescriptionPreviewFrame directly (Step 18.2/18.3's already-built iframe+print
// machinery) rather than the heavier PrescriptionPreviewDialog, which also carries Save
// Draft/Edit affordances that don't apply to a prescription being viewed here (this page
// is explicitly read-only). autoPrint drives the Toolbar's separate "Print" button:
// opening this modal already primed to print the instant the iframe finishes loading,
// mirroring PrescriptionPreviewDialog's own wait-for-ready-then-print strategy (Step
// 18.3) rather than racing a print() call against an iframe that hasn't loaded yet.
function PrescriptionPreviewModal({ show, xhtml, autoPrint, onClose }) {
  const [isFrameReady, setIsFrameReady] = useState(false);
  const frameRef = useRef(null);
  const hasAutoPrintedRef = useRef(false);
  const { showWarning, showError } = useNotification();

  useEffect(() => {
    if (!show) {
      hasAutoPrintedRef.current = false;
    }
  }, [show]);

  useEffect(() => {
    if (show && autoPrint && isFrameReady && !hasAutoPrintedRef.current) {
      hasAutoPrintedRef.current = true;
      handlePrint();
    }
    // handlePrint is stable enough for this purpose (defined below, closes over
    // showWarning/showError only) - omitted to avoid re-running this effect on every
    // notification-context re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, autoPrint, isFrameReady]);

  function handlePrint() {
    try {
      frameRef.current?.print();
    } catch (printError) {
      if (printError?.message === 'IFRAME_NOT_READY') {
        showWarning('The prescription preview is still loading - please wait before printing.');
      } else {
        showError('Unable to open the print dialog. Check your browser settings and try again.');
      }
    }
  }

  if (!show) {
    return null;
  }

  return (
    <>
      <div className="modal d-block" tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="prescriptionPreviewModalTitle">
        <div className="modal-dialog modal-dialog-centered modal-xl" style={{ height: '90vh' }} role="document">
          <div className="modal-content h-100 d-flex flex-column">
            <div className="modal-header py-2">
              <h5 className="modal-title" id="prescriptionPreviewModalTitle">
                Prescription Preview
              </h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
            </div>
            <div className="modal-body p-0 flex-grow-1" style={{ minHeight: 0 }}>
              <PrescriptionPreviewFrame ref={frameRef} xhtml={xhtml} isLoading={false} error={null} onReadyChange={setIsFrameReady} />
            </div>
            <div className="d-flex justify-content-end gap-2 px-3 py-2 border-top bg-light">
              <button type="button" className="btn btn-outline-primary" onClick={handlePrint} disabled={!isFrameReady}>
                <i className="bi bi-printer me-1" aria-hidden="true" />
                Print
              </button>
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

export default PrescriptionPreviewModal;
