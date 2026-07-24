function Field({ label, value }) {
  return (
    <div className="col-6 col-md-4">
      <div className="text-muted small">{label}</div>
      <div className="fw-semibold">{value}</div>
    </div>
  );
}

// No NZMC Number or Practice Name fields - UserAccount (the Provider) has no such
// columns anywhere in this schema (only Patient has an unrelated NZMCNumber column, and
// no "Provider"/clinic-practice entity has ever been built - docs/providers/ doesn't
// exist). PrescriptionProviderResponse already omits these for the same reason (Step
// 18.2's own comment). Showing them as "—" would imply the data exists but is merely
// blank; omitting the fields entirely is the more honest representation.
function PrescriptionProviderCard({ provider }) {
  return (
    <div className="card border-0 shadow-sm rounded-3 mb-3">
      <div className="card-header bg-white border-0 pt-3">
        <h2 className="h6 mb-0">Provider</h2>
      </div>
      <div className="card-body">
        <div className="row g-3">
          <Field label="Provider Name" value={provider.fullName} />
          <Field label="Phone" value={provider.phoneNumber || '—'} />
          <Field label="Email" value={provider.email || '—'} />
        </div>
      </div>
    </div>
  );
}

export default PrescriptionProviderCard;
