import PrescriptionStatusBadge from './PrescriptionStatusBadge.jsx';

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString() : '—';
}

function Field({ label, value }) {
  return (
    <div className="col-6 col-md-3">
      <div className="text-muted small">{label}</div>
      <div className="fw-semibold">{value}</div>
    </div>
  );
}

function PrescriptionSummaryCard({ prescription }) {
  return (
    <div className="card border-0 shadow-sm rounded-3 mb-3">
      <div className="card-header bg-white border-0 pt-3">
        <h2 className="h6 mb-0">Prescription Summary</h2>
      </div>
      <div className="card-body">
        <div className="row g-3">
          <Field label="Prescription Number" value={prescription.prescriptionNumber} />
          <div className="col-6 col-md-3">
            <div className="text-muted small">Status</div>
            <PrescriptionStatusBadge status={prescription.status} />
          </div>
          <Field label="Version" value={prescription.versionNumber ?? '—'} />
          <Field label="Medication Count" value={prescription.medicationCount} />
          <Field label="Issue Date" value={formatDate(prescription.issueDate)} />
          <Field label="Expiry Date" value={formatDate(prescription.expiryDate)} />
          <Field label="Created By" value={prescription.createdBy} />
          <Field label="Created Date" value={formatDateTime(prescription.createdDate)} />
          <Field label="Last Modified By" value={prescription.updatedBy || '—'} />
          <Field label="Last Modified Date" value={formatDateTime(prescription.updatedDate)} />
        </div>
      </div>
    </div>
  );
}

export default PrescriptionSummaryCard;
