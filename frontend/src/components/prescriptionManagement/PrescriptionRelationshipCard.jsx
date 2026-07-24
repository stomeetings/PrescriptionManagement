import { Link } from 'react-router-dom';

const RELATIONSHIP_LABELS = {
  ORIGINAL: 'Original',
  REPLACEMENT: 'Replacement',
  AMENDMENT: 'Amendment',
  RENEWAL: 'Renewal',
};

// Prescription Details' new "Originating Patient Medication" section - the medication(s)
// this Prescription's item(s) were created from (GET /api/prescriptions/{id}/
// patient-medications). patientId comes from the Prescription Details page's own
// already-loaded header (a Prescription belongs to exactly one patient, so every
// originating medication shares it) - the backend response itself has no reason to
// repeat it on every row. Completes the bidirectional navigation this feature asks for:
// Patient Medication -> Prescription (PatientMedicationPrescriptionHistory's own links)
// -> Patient Medication (this card's own links back).
function PrescriptionRelationshipCard({ medications, patientId, isLoading, error, onRetry }) {
  if (isLoading) {
    return (
      <div className="card border-0 shadow-sm rounded-3 mb-3">
        <div className="card-body text-center py-4">
          <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card border-0 shadow-sm rounded-3 mb-3">
        <div className="card-body d-flex justify-content-between align-items-center">
          <span className="text-danger">{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={onRetry}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!medications || medications.length === 0) {
    return null;
  }

  return (
    <div className="card border-0 shadow-sm rounded-3 mb-3">
      <div className="card-header bg-white border-0 pt-3">
        <h2 className="h6 mb-0">Originating Patient Medication</h2>
      </div>
      <div className="card-body">
        <ul className="list-unstyled mb-0">
          {medications.map((medication) => (
            <li key={medication.patientMedicationId} className="d-flex justify-content-between align-items-center py-2 border-bottom">
              <div>
                <Link to={`/patients/${patientId}/medications/${medication.patientMedicationId}`} className="fw-semibold">
                  {medication.medicineName}
                </Link>
                <div className="small text-muted">
                  {RELATIONSHIP_LABELS[medication.relationshipType] || medication.relationshipType} · SCID {medication.scid}
                </div>
              </div>
              {!medication.isActive && <span className="badge rounded-pill text-bg-secondary">Inactive Medication</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default PrescriptionRelationshipCard;
