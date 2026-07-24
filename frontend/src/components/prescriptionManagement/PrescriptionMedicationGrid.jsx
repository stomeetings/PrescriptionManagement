import PrescriptionItemHistoryPanel from './PrescriptionItemHistoryPanel.jsx';

// Status column added by Prescription Item Amendment & Replacement - dbo.PrescriptionItem
// gained a real ItemStatus lifecycle (Active/Superseded/Cancelled/Dispensed/Expired) for
// this feature; before it, this table deliberately had none (see PrescriptionDetailItem's
// own backend comment for that now-superseded reasoning).
const STATUS_VARIANTS = {
  ACTIVE: 'success',
  SUPERSEDED: 'secondary',
  CANCELLED: 'dark',
  DISPENSED: 'primary',
  EXPIRED: 'secondary',
};

function ItemStatusBadge({ status }) {
  const variant = STATUS_VARIANTS[status] || 'secondary';
  const label = status ? status.charAt(0) + status.slice(1).toLowerCase() : '—';
  return <span className={`badge rounded-pill text-bg-${variant}`}>{label}</span>;
}

function PrescriptionMedicationGrid({ medications }) {
  return (
    <div className="card border-0 shadow-sm rounded-3 mb-3">
      <div className="card-header bg-white border-0 pt-3">
        <h2 className="h6 mb-0">Medications</h2>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <caption className="visually-hidden">Medications on this prescription</caption>
            <thead className="table-light">
              <tr>
                <th scope="col">Medicine</th>
                <th scope="col">Generic Name</th>
                <th scope="col">Strength</th>
                <th scope="col">Dose</th>
                <th scope="col">Frequency</th>
                <th scope="col">Route</th>
                <th scope="col">Quantity</th>
                <th scope="col">Directions</th>
                <th scope="col">PRN</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {medications.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center text-muted py-4">
                    No medications on this prescription.
                  </td>
                </tr>
              )}
              {medications.map((medication) => (
                <tr key={medication.prescriptionItemId}>
                  <td>{medication.medicineName}</td>
                  <td>{medication.genericName}</td>
                  <td>{medication.strength}</td>
                  <td>
                    {medication.dose} {medication.doseUnit}
                  </td>
                  <td>{medication.frequency}</td>
                  <td>{medication.route}</td>
                  <td>{medication.quantity}</td>
                  <td>{medication.instructions || '—'}</td>
                  <td>
                    {medication.prn ? (
                      <span className="badge rounded-pill text-bg-info">PRN</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    <ItemStatusBadge status={medication.itemStatus} />
                    <PrescriptionItemHistoryPanel medication={medication} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default PrescriptionMedicationGrid;
