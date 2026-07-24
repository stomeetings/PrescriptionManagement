function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

// The info bar at the top of the Prescription Preview dialog - display only, no
// buttons (those live in PrescriptionActionBar). Renders whatever the backend already
// returned (GeneratePrescriptionResponse) - no separate API call of its own.
function PrescriptionToolbar({ prescriptionNumber, patientName, providerName, issueDate, status }) {
  return (
    <div className="d-flex flex-wrap gap-3 align-items-center px-3 py-2 border-bottom bg-light">
      <div>
        <span className="text-muted small d-block">Prescription Number</span>
        <span className="fw-semibold">{prescriptionNumber || '—'}</span>
      </div>
      <div>
        <span className="text-muted small d-block">Patient</span>
        <span className="fw-semibold">{patientName || '—'}</span>
      </div>
      <div>
        <span className="text-muted small d-block">Provider</span>
        <span className="fw-semibold">{providerName || '—'}</span>
      </div>
      <div>
        <span className="text-muted small d-block">Issue Date</span>
        <span className="fw-semibold">{formatDate(issueDate)}</span>
      </div>
      <div>
        <span className="text-muted small d-block">Status</span>
        <span className="badge rounded-pill text-bg-secondary">{status || '—'}</span>
      </div>
    </div>
  );
}

export default PrescriptionToolbar;
