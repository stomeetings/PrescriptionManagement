function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

function formatAddress(patient) {
  const parts = [patient.addressLine1, patient.addressLine2, patient.city, patient.region, patient.postalCode, patient.country].filter(
    Boolean,
  );
  return parts.length > 0 ? parts.join(', ') : '—';
}

function Field({ label, value }) {
  return (
    <div className="col-6 col-md-4">
      <div className="text-muted small">{label}</div>
      <div className="fw-semibold">{value}</div>
    </div>
  );
}

function PrescriptionPatientCard({ patient }) {
  return (
    <div className="card border-0 shadow-sm rounded-3 mb-3">
      <div className="card-header bg-white border-0 pt-3">
        <h2 className="h6 mb-0">Patient</h2>
      </div>
      <div className="card-body">
        <div className="row g-3">
          <Field label="Patient Name" value={patient.fullName} />
          <Field label="NHI" value={patient.nhiNumber || '—'} />
          <Field label="Date of Birth" value={formatDate(patient.dateOfBirth)} />
          <Field label="Gender" value={patient.gender?.displayText || '—'} />
          <Field label="Phone" value={patient.mobileNumber || '—'} />
          <Field label="Address" value={formatAddress(patient)} />
        </div>
      </div>
    </div>
  );
}

export default PrescriptionPatientCard;
