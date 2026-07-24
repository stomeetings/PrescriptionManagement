function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : '—';
}

function Field({ label, value }) {
  return (
    <div className="col-6 col-md-4">
      <div className="text-muted small">{label}</div>
      <div className="fw-semibold">{value}</div>
    </div>
  );
}

// A distinct section from PrescriptionSummaryCard even though the two share the same
// underlying fields (Created/Modified By+Date, Current Version) - this feature's own
// spec asks for both a Summary section and a separate Audit section, so this stays its
// own component rather than being folded into the Summary card.
function PrescriptionAuditCard({ prescription }) {
  return (
    <div className="card border-0 shadow-sm rounded-3 mb-3">
      <div className="card-header bg-white border-0 pt-3">
        <h2 className="h6 mb-0">Audit</h2>
      </div>
      <div className="card-body">
        <div className="row g-3">
          <Field label="Created By" value={prescription.createdBy} />
          <Field label="Created Date" value={formatDateTime(prescription.createdDate)} />
          <Field label="Modified By" value={prescription.updatedBy || '—'} />
          <Field label="Modified Date" value={formatDateTime(prescription.updatedDate)} />
          <Field label="Current Version" value={prescription.versionNumber ?? '—'} />
        </div>
      </div>
    </div>
  );
}

export default PrescriptionAuditCard;
