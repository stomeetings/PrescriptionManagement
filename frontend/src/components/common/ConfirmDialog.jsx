// Generic confirmation dialog, reusable for any future "are you sure?" action across
// modules - not specific to User Management. Bootstrap's .modal visuals only, shown via
// plain React state (no bootstrap.bundle.js), same approach already used for the
// profile dropdown and notification toasts.
function ConfirmDialog({ show, title, message, confirmLabel = 'Confirm', confirmVariant = 'primary', onConfirm, onCancel, isProcessing }) {
  if (!show) {
    return null;
  }

  return (
    <>
      <div className="modal d-block" tabIndex="-1" role="dialog">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="btn-close" onClick={onCancel} disabled={isProcessing} aria-label="Close" />
            </div>
            <div className="modal-body">
              <p className="mb-0">{message}</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onCancel} disabled={isProcessing}>
                Cancel
              </button>
              <button type="button" className={`btn btn-${confirmVariant}`} onClick={onConfirm} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                    Please wait...
                  </>
                ) : (
                  confirmLabel
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}

export default ConfirmDialog;
