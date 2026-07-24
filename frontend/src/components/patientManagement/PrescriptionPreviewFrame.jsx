import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

// Renders the backend's XHTML string (GeneratePrescriptionResponse.xhtml) via
// iframe srcDoc - this component never builds or touches HTML markup itself, per this
// step's hard requirement ("Do NOT generate HTML in React"). srcDoc is preferred over a
// Blob/object URL src: it needs no cleanup (no revokeObjectURL bookkeeping) and updates
// synchronously whenever the xhtml prop changes.
//
// Exposes an imperative print() (via forwardRef/useImperativeHandle) so the parent
// dialog's Print button/Ctrl+P handler can trigger printing without the iframe's DOM
// node ever leaving this component - the print button itself lives in
// PrescriptionActionBar, one level up, which has no reason to know about iframe
// internals otherwise.
const PrescriptionPreviewFrame = forwardRef(function PrescriptionPreviewFrame(
  { xhtml, isLoading, error, onRetry, onReadyChange },
  ref,
) {
  const [isFrameLoading, setIsFrameLoading] = useState(true);
  const iframeRef = useRef(null);

  // Every new document (initial generate, or an explicit Refresh Preview) re-arms the
  // spinner until the iframe's own onLoad fires for that specific srcDoc.
  useEffect(() => {
    if (xhtml) {
      setIsFrameLoading(true);
    }
  }, [xhtml]);

  useEffect(() => {
    onReadyChange?.(Boolean(xhtml) && !isFrameLoading);
  }, [xhtml, isFrameLoading, onReadyChange]);

  useImperativeHandle(ref, () => ({
    // Step 18.3's own printing strategy, verbatim: wait until loaded (guarded by the
    // isFrameReady check below, which the Print button's own disabled state already
    // mirrors - this is a defensive second check, not the primary guard), focus the
    // iframe's window, then call print() on it - never on the host window, and never
    // after touching srcDoc again, so the exact already-rendered XHTML is what prints.
    print() {
      const contentWindow = iframeRef.current?.contentWindow;

      if (!contentWindow || isFrameLoading || !xhtml) {
        throw new Error('IFRAME_NOT_READY');
      }

      contentWindow.focus();
      contentWindow.print();
    },
  }));

  if (error) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center text-center py-5 h-100">
        <i className="bi bi-exclamation-triangle display-4 text-danger" aria-hidden="true" />
        <p className="text-muted mt-3 mb-3">{error}</p>
        <button type="button" className="btn btn-outline-secondary" onClick={onRetry}>
          <i className="bi bi-arrow-clockwise me-1" aria-hidden="true" />
          Retry
        </button>
      </div>
    );
  }

  const showSpinner = isLoading || (Boolean(xhtml) && isFrameLoading);

  return (
    <div className="position-relative h-100 w-100">
      {showSpinner && (
        <div
          className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white"
          style={{ zIndex: 2 }}
        >
          <span className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading prescription preview…</span>
          </span>
        </div>
      )}

      {xhtml && (
        <iframe
          ref={iframeRef}
          title="Prescription preview"
          srcDoc={xhtml}
          // allow-modals is required in Chromium-based browsers for
          // contentWindow.print() to work from a sandboxed iframe - without it, print()
          // is silently blocked (Step 18.3's own "Browser blocks printing" error case).
          sandbox="allow-same-origin allow-modals"
          className="border-0 w-100 h-100"
          onLoad={() => setIsFrameLoading(false)}
        />
      )}
    </div>
  );
});

export default PrescriptionPreviewFrame;
