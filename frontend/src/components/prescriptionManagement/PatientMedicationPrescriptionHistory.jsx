import { Link } from 'react-router-dom';
import PrescriptionStatusBadge from './PrescriptionStatusBadge.jsx';

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

const RELATIONSHIP_LABELS = {
  ORIGINAL: 'Original',
  REPLACEMENT: 'Replacement',
  AMENDMENT: 'Amendment',
  RENEWAL: 'Renewal',
};

const ITEM_STATUS_VARIANTS = {
  ACTIVE: 'success',
  SUPERSEDED: 'secondary',
  CANCELLED: 'dark',
  DISPENSED: 'primary',
  EXPIRED: 'secondary',
};

function ItemStatusBadge({ status }) {
  const variant = ITEM_STATUS_VARIANTS[status] || 'secondary';
  const label = status ? status.charAt(0) + status.slice(1).toLowerCase() : '—';
  return <span className={`badge rounded-pill text-bg-${variant}`}>{label}</span>;
}

function SummaryField({ label, value }) {
  return (
    <div className="col-6 col-md-3">
      <div className="text-muted small">{label}</div>
      <div className="fw-semibold">{value ?? '—'}</div>
    </div>
  );
}

// Patient Medication Details' new "Prescription History" section - every prescription
// this medication has ever been linked to (GET /api/patient-medications/{id}/
// prescriptions), plus Medication Details' own derived summary (Current Active
// Prescription/Last Prescription/Replacement Count/Print Count). Navigation: each row
// links to that Prescription's own Details page (which links back here via its own
// "Originating Patient Medication" section - PrescriptionRelationshipCard).
function PatientMedicationPrescriptionHistory({ history, isLoading, error, onRetry }) {
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

  const entries = history?.history || [];

  return (
    <div className="card border-0 shadow-sm rounded-3 mb-3">
      <div className="card-header bg-white border-0 pt-3">
        <h2 className="h6 mb-0">Prescription History</h2>
      </div>
      <div className="card-body">
        <div className="row g-3 mb-3">
          <SummaryField label="Current Active Prescription" value={history?.currentActivePrescriptionNumber || 'None'} />
          <SummaryField label="Last Prescription" value={history?.lastPrescriptionNumber || 'None'} />
          <SummaryField label="Replacement Count" value={history?.replacementCount ?? 0} />
          <SummaryField label="Print Count" value={history?.printCount ?? 0} />
        </div>

        {entries.length === 0 ? (
          <p className="text-muted mb-0">This medication has never been part of a finalized prescription.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <caption className="visually-hidden">Prescriptions this medication has been part of</caption>
              <thead className="table-light">
                <tr>
                  <th scope="col">Prescription Number</th>
                  <th scope="col">SCID</th>
                  <th scope="col">Issue Date</th>
                  <th scope="col">Status</th>
                  <th scope="col">Relationship</th>
                  <th scope="col">Item Status</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.prescriptionId}>
                    <td>
                      <Link to={`/prescriptions/${entry.prescriptionId}`}>{entry.prescriptionNumber}</Link>
                    </td>
                    <td>{entry.scid}</td>
                    <td>{formatDate(entry.issueDate)}</td>
                    <td>
                      <PrescriptionStatusBadge status={entry.status} />
                    </td>
                    <td>{RELATIONSHIP_LABELS[entry.relationshipType] || entry.relationshipType}</td>
                    <td>
                      <ItemStatusBadge status={entry.itemStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default PatientMedicationPrescriptionHistory;
