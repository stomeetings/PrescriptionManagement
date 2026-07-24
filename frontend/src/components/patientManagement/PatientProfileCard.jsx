function getInitials(fullName) {
  if (!fullName) {
    return '?';
  }

  const initials = fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return initials || '?';
}

function PatientProfileCard({ patient }) {
  return (
    <div className="card border-0 shadow-sm rounded-3">
      <div className="card-body text-center py-4">
        <div
          className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto mb-3"
          style={{ width: 80, height: 80, fontSize: '1.75rem', fontWeight: 600 }}
        >
          {getInitials(`${patient.firstName} ${patient.lastName}`)}
        </div>

        <h2 className="h5 mb-1">
          {patient.firstName} {patient.lastName}
        </h2>
        <p className="text-muted mb-3">{patient.patientNumber}</p>

        <div className="d-flex justify-content-center gap-2">
          <span className="badge rounded-pill text-bg-primary">{patient.gender?.displayText}</span>
          <span className={`badge rounded-pill text-bg-${patient.isActive ? 'success' : 'secondary'}`}>
            {patient.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default PatientProfileCard;
