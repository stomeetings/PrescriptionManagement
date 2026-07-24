function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : '—';
}

// "Prescription Details / Display: Original Item / Status Superseded / Replacement
// Prescription Number / Replacement SCID / Replacement Date" - this feature's own spec.
// Renders nothing for an item that has never been superseded (ItemStatus === 'ACTIVE'),
// since there is no replacement to describe.
function PrescriptionItemHistoryPanel({ medication }) {
  if (medication.itemStatus !== 'SUPERSEDED') {
    return null;
  }

  return (
    <div className="border rounded-3 p-2 mt-1 bg-light small">
      <div className="d-flex flex-wrap gap-3">
        <span>
          <span className="text-muted">Status:</span> <span className="badge rounded-pill text-bg-secondary">Superseded</span>
        </span>
        <span>
          <span className="text-muted">Replacement Prescription:</span> {medication.replacementPrescriptionNumber || '—'}
        </span>
        <span>
          <span className="text-muted">Replacement SCID:</span> {medication.replacementScid || '—'}
        </span>
        <span>
          <span className="text-muted">Replacement Date:</span> {formatDateTime(medication.replacementDate)}
        </span>
      </div>
    </div>
  );
}

export default PrescriptionItemHistoryPanel;
