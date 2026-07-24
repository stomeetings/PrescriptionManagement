// Color-coding by the real seeded PrescriptionStatus codes (DRAFT/PENDING/PROCESSING/
// SENT/DISPENSED/CANCELLED/FAILED/EXPIRED) - the label itself always renders the
// backend's own status.displayText, never a hardcoded/relabeled string (matches how
// every other status badge in this project already works, e.g. PrescriptionToolbar's
// info-bar badge in the Preview Dialog).
const STATUS_VARIANTS = {
  DRAFT: 'secondary',
  PENDING: 'info',
  PROCESSING: 'warning',
  SENT: 'primary',
  DISPENSED: 'success',
  CANCELLED: 'dark',
  FAILED: 'danger',
  EXPIRED: 'secondary',
};

function PrescriptionStatusBadge({ status }) {
  if (!status) {
    return <span className="badge rounded-pill text-bg-secondary">—</span>;
  }

  const variant = STATUS_VARIANTS[status.code] || 'secondary';

  return <span className={`badge rounded-pill text-bg-${variant}`}>{status.displayText}</span>;
}

export default PrescriptionStatusBadge;
