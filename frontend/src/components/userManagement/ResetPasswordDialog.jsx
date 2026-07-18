import { useState } from 'react';

// No "Temporary Password" / "Confirm Temporary Password" input fields - per the
// approved design (and confirmed decision for this step), the backend always
// generates the temporary password server-side and returns it once. This dialog is a
// confirm-then-display flow: confirm the action, then show the generated password
// read-only so the Administrator can copy and share it securely.
function ResetPasswordDialog({ show, username, isSubmitting, temporaryPassword, onConfirm, onClose }) {
  const [isCopied, setIsCopied] = useState(false);

  if (!show) {
    return null;
  }

  const hasResult = Boolean(temporaryPassword);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setIsCopied(true);
    } catch {
      // Clipboard API can be unavailable (e.g. insecure context) - the value is still
      // visible and selectable in the input, so this is a convenience only.
    }
  }

  return (
    <>
      <div className="modal d-block" tabIndex="-1" role="dialog">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Reset Password</h5>
              {!isSubmitting && (
                <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
              )}
            </div>

            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Username</label>
                <input type="text" className="form-control" value={username} readOnly disabled />
              </div>

              {!hasResult && (
                <p className="text-muted mb-0">
                  This will generate a new temporary password for this user. Their current password will stop
                  working immediately, and they will be required to change it at next login.
                </p>
              )}

              {hasResult && (
                <div>
                  <label className="form-label">Temporary Password</label>
                  <div className="input-group">
                    <input type="text" className="form-control" value={temporaryPassword} readOnly />
                    <button type="button" className="btn btn-outline-secondary" onClick={handleCopy}>
                      {isCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="form-text text-danger">
                    This password is shown only once. Copy it now and share it securely with the user.
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {!hasResult ? (
                <>
                  <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={isSubmitting}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-warning" onClick={onConfirm} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                        Resetting...
                      </>
                    ) : (
                      'Reset Password'
                    )}
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn-primary" onClick={onClose}>
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show" />
    </>
  );
}

export default ResetPasswordDialog;
